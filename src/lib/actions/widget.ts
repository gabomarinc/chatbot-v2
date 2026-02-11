'use server'

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { Message } from '@prisma/client';
import { generateEmbedding, cosineSimilarity } from '@/lib/ai';
import { listAvailableSlots, createCalendarEvent } from '@/lib/google';
import { searchAgentMedia } from '@/lib/actions/agent-media';

export async function sendWidgetMessage(data: {
    channelId: string;
    content: string;
    visitorId: string; // Used as externalId
    metadata?: any; // Optional metadata for file attachments
    imageUrl?: string; // URL of uploaded image
    imageBase64?: string; // Base64 encoded image for AI processing
    fileUrl?: string; // URL of uploaded file (PDF or image)
    fileType?: 'pdf' | 'image'; // Type of uploaded file
    extractedText?: string; // Extracted text from PDF
}) {
    try {
        // 0. Resolve API Keys (Env vs DB)
        let openaiKey = process.env.OPENAI_API_KEY;
        let googleKey = process.env.GOOGLE_API_KEY;

        // Only fetch from DB if env vars are missing
        if (!openaiKey || !googleKey) {
            const configs = await (prisma as any).globalConfig.findMany({
                where: {
                    key: { in: ['OPENAI_API_KEY', 'GOOGLE_API_KEY'] }
                }
            });

            if (!openaiKey) openaiKey = configs.find((c: any) => c.key === 'OPENAI_API_KEY')?.value;
            if (!googleKey) googleKey = configs.find((c: any) => c.key === 'GOOGLE_API_KEY')?.value;
        }

        // 1. Validate Channel
        const channel = await prisma.channel.findUnique({
            where: { id: data.channelId },
            include: {
                agent: {
                    include: {
                        workspace: { include: { creditBalance: true } },
                        integrations: { where: { provider: { in: ['GOOGLE_CALENDAR', 'ZOHO'] }, enabled: true } },
                        intents: { where: { enabled: true } },
                        customFieldDefinitions: true
                    }
                }
            }
        })

        if (!channel) {
            throw new Error("Channel not found")
        }

        if (!channel.isActive) {
            throw new Error("Channel is not active. Please activate the channel in the channel settings.")
        }

        const workspace = channel.agent.workspace;
        const creditBalance = workspace.creditBalance;
        const model = channel.agent.model;

        // 2. Credit Check
        if (!creditBalance || creditBalance.balance <= 0) {
            console.log(`Workspace ${workspace.id} has insufficient credits.`);
            throw new Error("Insufficient credits");
        }

        // 3. Find or Create Conversation (include assignedTo to check if human is handling)
        let conversation = await prisma.conversation.findFirst({
            where: {
                channelId: channel.id,
                externalId: data.visitorId,
                status: { not: 'CLOSED' }
            }
        })

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    agentId: channel.agentId,
                    channelId: channel.id,
                    externalId: data.visitorId,
                    contactName: `Visitante ${data.visitorId.slice(0, 4)}`,
                    status: 'OPEN',
                    lastMessageAt: new Date()
                }
            })
        } else {
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: { lastMessageAt: new Date() }
            })
        }

        // 3.4. Ensure contact exists and is linked
        if (!conversation.contactId) {
            console.log(`[WIDGET] No contact linked for conversation ${conversation.id}. Creating new contact...`);
            try {
                // Create a new contact if one doesn't exist
                const newContact = await prisma.contact.create({
                    data: {
                        workspaceId: workspace.id,
                        name: conversation.contactName || 'Visitante',
                        email: conversation.contactEmail,
                        externalId: conversation.externalId,
                        customData: {},
                        // Add phone if extracted from somewhere, but currently not in conversation model apparently
                    }
                });
                console.log(`[WIDGET] Created contact ${newContact.id}`);

                // Link to conversation
                const updatedConversation = await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: { contactId: newContact.id },
                    include: { contact: true } // Include contact for downstream use if needed
                });

                // Update local variable
                conversation = updatedConversation;
                console.log(`[WIDGET] Linked contact to conversation.`);
            } catch (error) {
                console.error(`[WIDGET] Error creating/linking contact:`, error);
                // Continue execution
            }
        }

        // 3.5. Handle file uploads (images or PDFs)
        // Use fileUrl if provided (newer), otherwise fall back to imageUrl (backward compatibility)
        const fileUrl = data.fileUrl || data.imageUrl;
        const fileType = data.fileType || (data.imageUrl ? 'image' : undefined);

        // Use provided base64 or convert URL to base64 for AI processing (images only)
        let imageBase64: string | undefined = data.imageBase64;
        if (fileUrl && fileType === 'image' && !imageBase64) {
            try {
                console.log('[IMAGE] Converting image URL to base64:', fileUrl);
                // Download image and convert to base64
                const response = await fetch(fileUrl);
                console.log('[IMAGE] Fetch response status:', response.status, response.ok);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const contentType = response.headers.get('content-type') || 'image/jpeg';
                    imageBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
                    console.log('[IMAGE] Successfully converted to base64, length:', imageBase64.length);
                } else {
                    console.error('[IMAGE] Failed to fetch image, status:', response.status);
                }
            } catch (error) {
                console.error('[IMAGE] Error converting image URL to base64:', error);
                // Continue without image if conversion fails
            }
        }

        // For PDFs, include extracted text in the message content
        let messageContent = data.content;
        if (fileType === 'pdf' && data.extractedText) {
            // Prepend extracted text to the message
            messageContent = data.content
                ? `${data.content}\n\n--- Contenido del PDF ---\n${data.extractedText}`
                : `--- Contenido del PDF ---\n${data.extractedText}`;
        }

        // 4. Save User Message (with file metadata if present)
        const messageMetadata = fileUrl ? {
            type: fileType || 'image',
            url: fileUrl,
            ...(data.metadata || {})
        } : data.metadata;

        console.log('[WIDGET] Saving user message with metadata:', JSON.stringify(messageMetadata));

        const userMsg = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: 'USER',
                content: messageContent, // Use messageContent which includes PDF text if applicable
                metadata: messageMetadata ? messageMetadata : undefined
            }
        })

        console.log('[WIDGET] User message saved, ID:', userMsg.id, 'metadata:', JSON.stringify(userMsg.metadata));

        // 4.5. Check for Intent Detection
        const { detectIntent, executeIntent } = await import('./intent-actions');
        const detectedIntent = await detectIntent(data.content, channel.agent.intents);
        let intentResult: any = null;

        if (detectedIntent) {
            console.log(`[INTENT DETECTED] ${detectedIntent.name} for message: ${data.content}`);
            intentResult = await executeIntent(detectedIntent, {
                conversation,
                message: userMsg,
                userMessage: data.content
            });
            console.log(`[INTENT RESULT]`, intentResult);
        }

        // 4.6. Check if conversation is handled by human OR pending handoff
        // If assignedTo is not null OR status is PENDING, a human is handling it (or will), so bot should NOT auto-respond
        if (conversation.assignedTo !== null || conversation.status === 'PENDING') {
            console.log(`[HUMAN HANDLING] Conversation ${conversation.id} is handled by human (${conversation.assignedTo}) or pending (${conversation.status}), skipping bot response`);

            // Return without generating bot response
            return {
                userMsg: userMsg,
                agentMsg: null as any, // No bot response when human is handling
            };
        }

        // 5. Generate AI Response
        try {
            // Fetch recent history for context
            // Re-fetch conversation with contact and messages for full context
            conversation = await prisma.conversation.findUniqueOrThrow({
                where: { id: conversation.id },
                include: {
                    contact: true,
                    messages: {
                        orderBy: { createdAt: 'asc' },
                        take: 20 // Context window
                    }
                }
            });

            // Define history from the conversation messages we just fetched
            const history = (conversation as any).messages || [];

            let replyContent = '...';
            let tokensUsed = 0;
            let selectedImage: { url: string; altText?: string | null } | null = null; // Image selected by AI tool
            // Determine model to use: gpt-4o for images (has vision), otherwise use agent's configured model
            // IMPORTANT: gpt-4o-mini does NOT support vision, so we MUST use gpt-4o if there's an image
            let modelUsedForLogging = model; // Default to agent's model
            console.log('[MODEL SELECTION] Agent model:', model, 'fileType:', fileType, 'has imageBase64:', !!imageBase64, 'has fileUrl:', !!fileUrl);

            // If there's an image (even if base64 conversion failed), we need gpt-4o (gpt-4o-mini doesn't support vision)
            // Also if we have URL but no base64, we force OpenAI (gpt-4o) because Gemini SDK needs base64 (inlineData) whereas OpenAI takes URL.
            const needsOpenAIForURL = fileType === 'image' && fileUrl && !imageBase64;

            if (!model.includes('gemini') && fileType === 'image') {
                if (model === 'gpt-4o-mini') {
                    console.log('[MODEL SELECTION] gpt-4o-mini does not support vision, forcing gpt-4o');
                    modelUsedForLogging = 'gpt-4o'; // Force gpt-4o for images (gpt-4o-mini doesn't support vision)
                } else if (imageBase64 || fileUrl) {
                    modelUsedForLogging = 'gpt-4o'; // Override for images when using OpenAI
                    console.log('[MODEL SELECTION] Overriding to gpt-4o for image processing (has image)');
                }
            } else if (model.includes('gemini') && needsOpenAIForURL) {
                console.log('[MODEL SELECTION] Gemini selected but image Base64 missing. Force OpenAI (gpt-4o) to use URL.');
                modelUsedForLogging = 'gpt-4o';
            } else {
                console.log('[MODEL SELECTION] Using agent model:', modelUsedForLogging);
            }

            // 5.1 Retrieve Context (RAG) - Optional, don't fail if it errors
            let context = "";
            try {
                if (openaiKey) {
                    const queryVector = await generateEmbedding(data.content);
                    const chunks = await prisma.documentChunk.findMany({
                        where: {
                            knowledgeSource: {
                                knowledgeBase: { agentId: channel.agentId },
                                status: 'READY'
                            }
                        }
                    });

                    // Calculate similarity and sort
                    const sortedChunks = chunks
                        .map(chunk => ({
                            content: chunk.content,
                            similarity: cosineSimilarity(queryVector, chunk.embedding as number[])
                        }))
                        .filter(c => c.similarity > 0.4) // Threshold
                        .sort((a, b) => b.similarity - a.similarity)
                        .slice(0, 5); // Top 5 chunks

                    context = sortedChunks.map(c => c.content).join("\n\n");
                }
            } catch (ragError) {
                console.error("RAG Retrieval Error (non-critical, continuing):", ragError);
                // Continue without context if RAG fails
            }

            const agent = channel.agent;
            const styleDescription = agent.communicationStyle === 'FORMAL' ? 'serio y profesional (FORMAL)' :
                agent.communicationStyle === 'CASUAL' ? 'amigable y cercano (DESENFADADO)' : 'equilibrado (NORMAL)';

            const currentTime = new Intl.DateTimeFormat('es-ES', {
                timeZone: agent.timezone || 'UTC',
                dateStyle: 'full',
                timeStyle: 'long'
            }).format(new Date());

            const calendarIntegration = agent.integrations.find((i: any) => i.provider === 'GOOGLE_CALENDAR');
            const hasCalendar = !!calendarIntegration;

            const zohoIntegration = agent.integrations.find((i: any) => i.provider === 'ZOHO');
            const hasZoho = !!zohoIntegration;

            const odooIntegration = agent.integrations.find((i: any) => i.provider === 'ODOO');
            const hasOdoo = !!odooIntegration;

            // Get agent media for image search tool
            const agentMedia = await prisma.agentMedia.findMany({
                where: { agentId: channel.agentId }
            });

            // Get image prompts/instructions
            const imagePrompts = agentMedia
                .filter(m => m.prompt)
                .map(m => `- ${m.prompt}`)
                .join('\n');

            let systemPrompt = `IDENTIDAD Y CONTEXTO LABORAL (FUNDAMENTAL):
Eres ${agent.name}, el asistente oficial de ${agent.jobCompany || 'la empresa'}.
Sitio Web Oficial: ${agent.jobWebsiteUrl || 'No especificado'}
Tu Objetivo: ${agent.jobType === 'SALES' ? 'COMERCIAL (Enfocado en ventas y conversión)' : agent.jobType === 'SUPPORT' ? 'SOPORTE (Ayuda técnica y resolución)' : 'ASISTENTE GENERAL'}
Sobre el Negocio: ${agent.jobDescription || 'Empresa profesional dedicada a sus clientes.'}
Estilo de Comunicación: Debes ser ${styleDescription}.
Zona Horaria del Agente: ${agent.timezone || 'UTC'}
Fecha y hora actual en tu zona: ${currentTime}

REGLAS DE COMPORTAMIENTO (PRIORIDAD ALTA):
${agent.personalityPrompt}

CONFIGURACIÓN DINÁMICA DEL CHAT:
- Emojis: ${agent.allowEmojis ? 'ESTÁN PERMITIDOS. Úsalos para ser más expresivo.' : 'NO ESTÁN PERMITIDOS. Mantén un tono puramente textual.'}
- Firma: ${agent.signMessages ? `DEBES FIRMAR cada mensaje al final como "- ${agent.name}".` : 'No es necesario firmar los mensajes.'}
- Restricción de Temas: ${agent.restrictTopics ? 'ESTRICTA. Solo responde sobre temas del negocio. Si preguntan algo ajeno, declina amablemente.' : 'Flexible. Puedes charlar de forma general pero siempre volviendo al negocio.'}
- Transferencia Humana: ${agent.transferToHuman ? 'Disponible. Si el usuario pide hablar con una persona, indícale que puedes transferirlo.' : 'No disponible por ahora.'}
${hasCalendar ? '- Calendario: TIENES ACCESO a Google Calendar para revisar disponibilidad y agendar citas.' : '- Calendario: No disponible.'}
${hasZoho ? '- CRM: TIENES ACCESO a Zoho CRM. Es OBLIGATORIO usar "create_zoho_lead" tan pronto el usuario brinde SU NOMBRE O EMAIL. No esperes a tener ambos; si solo tienes el nombre, ¡guárdalo ya! Luego, si da el email, vuelve a usar la herramienta para actualizarlo. Además, guarda como NOTA (`add_zoho_note`) cualquier información importante del negocio.' : '- CRM: No disponible.'}
${imagePrompts ? `\nINSTRUCCIONES ESPECÍFICAS PARA ENVIAR IMÁGENES:\n${imagePrompts}\nIMPORTANTE: Cuando una de estas situaciones ocurra, DEBES usar la herramienta buscar_imagen con los términos apropiados para encontrar y enviar la imagen correspondiente.` : ''}

CONOCIMIENTO ADICIONAL (ENTRENAMIENTO RAG):
${context || 'No hay fragmentos de entrenamiento específicos para esta consulta, básate en tu Identidad y Contexto Laboral.'}

INSTRUCCIONES DE EJECUCIÓN:
1. Tu comportamiento debe estar guiado PRIMERO por el "PROMPT DE COMPORTAMIENTO" y la "Descripción del Negocio".
2. Posees MEMORIA de la conversación. Si el usuario ya se presentó o brindó información previamente en el historial, NO la vuelvas a pedir. Úsala para personalizar la charla.
3. Actúa siempre como un miembro experto de ${agent.jobCompany || 'la empresa'}.
4. Si la consulta se responde con el "Conocimiento Adicional", intégralo de forma natural.
5. Mantén el Estilo de Comunicación (${styleDescription}) en cada palabra.
6. EXTRACCIÓN DE DATOS: Si el usuario menciona su nombre o correo electrónico, extráelos y guárdalos internamente para personalizar futuras interacciones.

INSTRUCCIONES ESPECÍFICAS DE ZOHO CRM (DOCUMENTACIÓN):
- Notas: USA 'add_zoho_note' cada vez que el usuario proporcione detalles clave sobre su proyecto, presupuesto, urgencia o dolores (pain points). No esperes al final; documenta mientras hablas.
- Seguimiento: USA 'create_zoho_task' si el usuario pide ser contactado más tarde, solicita una cotización formal que tú no puedes dar, o si detectas una oportunidad clara de venta que requiere intervención humana.
- Citas: USA 'schedule_zoho_event' si el usuario acepta explícitamente una reunión o demo.
- IMPORTANTE: Antes de usar notas, tareas o eventos, DEBES haber creado el Lead con 'create_zoho_lead' (aunque solo tengas el nombre). Si ya lo creaste antes, no hay problema, el sistema detectará que ya existe y evitará duplicados.
- Odoo CRM: Si Odoo está activo, usa 'create_odoo_lead' para prospectos y 'add_odoo_note' para detalles importantes de la charla. Funciona igual que Zoho: guarda el nombre en cuanto lo tengas y actualízalo con el email después.
`;

            // Custom Fields Collection
            if ((agent as any).customFieldDefinitions && (agent as any).customFieldDefinitions.length > 0) {
                systemPrompt += '\nTU OBJETIVO SECUNDARIO ES RECOLECTAR LA SIGUIENTE INFORMACIÓN DEL USUARIO:\n';
                (agent as any).customFieldDefinitions.forEach((field: any) => {
                    let fieldDesc = `- ${field.label} (ID: "${field.key}"): ${field.description || 'Sin descripción'}`;
                    if (field.type === 'SELECT' && field.options && field.options.length > 0) {
                        fieldDesc += ` [Opciones válidas: ${field.options.join(', ')}]`;
                    }
                    systemPrompt += fieldDesc + '\n';
                });
                systemPrompt += '\nCuando el usuario te proporcione esta información, USA LA HERRAMIENTA "update_contact" para guardarla.\n';
                systemPrompt += 'Para campos con Opciones válidas, DEBES ajustar la respuesta del usuario a una de las opciones exactas si es posible, o pedir clarificación.\n';
                systemPrompt += 'No seas intrusivo. Pregunta por estos datos de manera natural durante la conversación.\n';
            }

            // Global instruction for standard fields
            systemPrompt += `
CRITICAL INSTRUCTIONS FOR DATA SAVING:
1. YOU ARE RESPONSIBLE for saving user data. Use the 'update_contact' tool.
2. IF the user provides their Name, Email, Phone, or ANY data matching the CUSTOM FIELDS defined above, you MUST call 'update_contact' IMMEDIATELY.
3. DO NOT just acknowledge data in text. You MUST call the tool to save it.
4. If you fail to call the tool, the data is lost.

When calling 'update_contact':
- Extract Name, Email, Phone (standard fields).
- Map user input to the *exact* custom field keys defined above (e.g. if field is "salary", map "5000" to "salary").
`;

            // Define tools for Calendar and Image Search, and Contact Update
            const tools: any[] = [
                {
                    name: 'update_contact',
                    description: 'Update the contact information with collected data. Use this tool whenever the user provides their name, email, phone, or other requested info.',
                    parameters: {
                        type: 'object',
                        properties: {
                            updates: {
                                type: 'object',
                                description: 'Object containing the fields to update. EXAMPLE: { "name": "Donald", "salario_mensual": 5000, "otro_campo": "valor" }.',
                                properties: {
                                    name: { type: 'string', description: "User's full name. Extract carefully." },
                                    email: { type: 'string', description: "User's email address" },
                                    phone: { type: 'string', description: "User's phone number" }
                                },
                                additionalProperties: true,
                                required: []
                            }
                        },
                        required: ['updates']
                    }
                }
            ];

            // Setup Custom Fields in Tool Schema
            if ((agent as any).customFieldDefinitions && (agent as any).customFieldDefinitions.length > 0) {
                const updatesProps = tools[0].parameters.properties.updates.properties;
                (agent as any).customFieldDefinitions.forEach((field: any) => {
                    let type = 'string';
                    if (field.type === 'NUMBER') type = 'number';
                    if (field.type === 'BOOLEAN') type = 'boolean';

                    updatesProps[field.key] = {
                        type,
                        description: field.description || `Value for ${field.label}`
                    };

                    if (field.type === 'SELECT' && field.options && field.options.length > 0) {
                        updatesProps[field.key].enum = field.options;
                        updatesProps[field.key].description += ` (Valid options: ${field.options.join(', ')})`;
                    }
                });
            }

            if (hasCalendar) {
                tools.push(
                    {
                        name: "revisar_disponibilidad",
                        description: "Consulta los eventos ocupados en una fecha específica para ver disponibilidad.",
                        parameters: {
                            type: "object",
                            properties: {
                                fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD" }
                            },
                            required: ["fecha"]
                        }
                    },
                    {
                        name: "agendar_cita",
                        description: "Crea un evento en el calendario de Google.",
                        parameters: {
                            type: "object",
                            properties: {
                                resumen: { type: "string", description: "Título de la cita" },
                                descripcion: { type: "string", description: "Detalles adicionales" },
                                inicio: { type: "string", description: "Fecha y hora de inicio (ISO 8601)" },
                                fin: { type: "string", description: "Fecha y hora de fin (ISO 8601)" },
                                email: { type: "string", description: "Email del invitado (opcional)" }
                            },
                            required: ["resumen", "inicio", "fin"]
                        }
                    }
                );
            }

            if (hasZoho) {
                tools.push(
                    {
                        name: "create_zoho_lead",
                        description: "Crea un nuevo Lead en Zoho CRM con los datos proporcionados.",
                        parameters: {
                            type: "object",
                            properties: {
                                FirstName: { type: "string", description: "Primer nombre del lead" },
                                LastName: { type: "string", description: "Apellido del lead" },
                                Email: { type: "string", description: "Correo electrónico" },
                                Phone: { type: "string", description: "Teléfono (opcional)" },
                                Description: { type: "string", description: "Notas o descripción adicional sobre el lead (opcional)" }
                            },
                            required: []
                        }
                    },
                    {
                        name: "add_zoho_note",
                        description: "Agrega una nota importante a un Lead existente en Zoho CRM. Úsala para documentar preguntas clave, objeciones, intereses específicos o cualquier información relevante de la conversación.",
                        parameters: {
                            type: "object",
                            properties: {
                                noteContent: { type: "string", description: "Contenido de la nota. Incluye fecha/hora y contexto relevante." }
                            },
                            required: ["noteContent"]
                        }
                    },
                    {
                        name: "create_zoho_task",
                        description: "Crea una tarea/recordatorio en Zoho CRM para que un humano haga seguimiento. Úsala cuando el cliente necesite una llamada, cotización, o cualquier acción manual.",
                        parameters: {
                            type: "object",
                            properties: {
                                subject: { type: "string", description: "Título de la tarea (ej: 'Llamar a Roberto para cotización')" },
                                dueDate: { type: "string", description: "Fecha de vencimiento en formato YYYY-MM-DD" },
                                priority: { type: "string", enum: ["High", "Normal", "Low"], description: "Prioridad de la tarea" },
                                description: { type: "string", description: "Detalles adicionales sobre la tarea" }
                            },
                            required: ["subject", "dueDate"]
                        }
                    },
                    {
                        name: "schedule_zoho_event",
                        description: "Agenda un evento/reunión en Zoho CRM cuando el cliente acepta una cita. Sincroniza con el calendario del equipo de ventas.",
                        parameters: {
                            type: "object",
                            properties: {
                                title: { type: "string", description: "Título del evento (ej: 'Reunión con Roberto - Demo producto')" },
                                startDateTime: { type: "string", description: "Fecha y hora de inicio en formato ISO 8601 (ej: '2026-02-15T10:00:00')" },
                                endDateTime: { type: "string", description: "Fecha y hora de fin en formato ISO 8601" },
                                description: { type: "string", description: "Detalles de la reunión" },
                                location: { type: "string", description: "Ubicación (puede ser URL de Zoom/Meet)" }
                            },
                            required: ["title", "startDateTime", "endDateTime"]
                        }
                    }
                );
            }

            if (hasOdoo) {
                tools.push(
                    {
                        name: "create_odoo_lead",
                        description: "Crea o actualiza un Lead/Oportunidad en Odoo CRM.",
                        parameters: {
                            type: "object",
                            properties: {
                                name: { type: "string", description: "Nombre del lead" },
                                email: { type: "string", description: "Email" },
                                phone: { type: "string", description: "Teléfono" },
                                description: { type: "string", description: "Descripción o notas" }
                            },
                            required: []
                        }
                    },
                    {
                        name: "add_odoo_note",
                        description: "Añade una nota interna al muro (chatter) del lead en Odoo.",
                        parameters: {
                            type: "object",
                            properties: {
                                noteContent: { type: "string", description: "Contenido de la nota" }
                            },
                            required: ["noteContent"]
                        }
                    }
                );
            }

            // Try Gemini first if model is Gemini, with fallback to OpenAI
            let useOpenAI = false;
            let fallbackModel = 'gpt-4o'; // Default fallback model

            // Check if we need to force OpenAI due to missing base64 for image
            if (model.includes('gemini') && fileType === 'image' && fileUrl && !imageBase64) {
                console.log('[GEMINI] Image present but Base64 missing. Forcing OpenAI to use URL.');
                useOpenAI = true;
                modelUsedForLogging = fallbackModel;
            }

            if (model.includes('gemini') && !useOpenAI) {
                // Google Gemini Logic
                console.log('[GEMINI] Attempting to use Gemini model:', model);
                console.log('[GEMINI] Has googleKey:', !!googleKey, 'Key length:', googleKey?.length || 0);
                if (!googleKey) {
                    console.error('[GEMINI] Google API Key not configured, falling back to GPT-4o');
                    if (!openaiKey) throw new Error("Neither Google API Key nor OpenAI API Key is configured");
                    useOpenAI = true; // Fallback to OpenAI
                    modelUsedForLogging = fallbackModel; // Update model for logging
                } else {
                    try {
                        // Re-instantiate with correct key
                        console.log('[GEMINI] Initializing GoogleGenerativeAI...');
                        const currentGenAI = new GoogleGenerativeAI(googleKey);
                        // Map model names to correct API model identifiers
                        // According to Google's API documentation, model names may need version suffix
                        // Try gemini-1.5-flash-001 or gemini-1.5-flash-latest if standard name fails
                        let geminiModelName = model;
                        if (model === 'gemini-1.5-flash') {
                            // Try with version suffix first (more stable)
                            geminiModelName = 'gemini-1.5-flash-001';
                        } else if (model === 'gemini-1.5-pro') {
                            geminiModelName = 'gemini-1.5-pro-001';
                        }
                        console.log('[GEMINI] Using model name:', geminiModelName);
                        console.log('[GEMINI] GoogleGenerativeAI initialized, getting model:', geminiModelName);

                        const geminiTools = hasCalendar ? [{
                            functionDeclarations: tools.map(t => ({
                                name: t.name,
                                description: t.description,
                                parameters: t.parameters
                            }))
                        }] : undefined;

                        const googleModel = currentGenAI.getGenerativeModel({
                            model: geminiModelName,
                            systemInstruction: systemPrompt,
                            generationConfig: {
                                temperature: agent.temperature
                            },
                            tools: geminiTools as any
                        });

                        const chatHistory = history.reverse().map((m: Message) => {
                            const parts: any[] = [{
                                text: m.role === 'HUMAN'
                                    ? `[Intervención humana]: ${m.content}`
                                    : m.content
                            }];

                            // Add image if present in metadata
                            if (m.metadata && typeof m.metadata === 'object' && (m.metadata as any).type === 'image' && (m.metadata as any).url) {
                                // For history, we'll just reference the image in text since we can't load old images easily
                                parts.push({ text: `[Imagen adjunta: ${(m.metadata as any).url}]` });
                            }

                            return {
                                role: m.role === 'USER' ? 'user' : 'model',
                                parts
                            };
                        });

                        const chat = googleModel.startChat({
                            history: chatHistory,
                        });

                        // Prepare message parts (text + image if present)
                        // For PDFs, the text is already included in messageContent, so just send text
                        const messageParts: any[] = [{ text: messageContent }];

                        if (fileType === 'image' && imageBase64) {
                            // Convert base64 to FileData format for Gemini
                            const base64Data = imageBase64.split(',')[1] || imageBase64; // Remove data:image/...;base64, prefix if present
                            const mimeMatch = imageBase64.match(/data:image\/([^;]+)/);
                            const mimeType = mimeMatch ? mimeMatch[1] : 'jpeg';

                            messageParts.push({
                                inlineData: {
                                    data: base64Data,
                                    mimeType: `image/${mimeType}`
                                }
                            });
                        }

                        console.log('[GEMINI] Sending message with', messageParts.length, 'parts');
                        console.log('[GEMINI] Model:', geminiModelName, 'Has API Key:', !!googleKey);
                        let result = await chat.sendMessage(messageParts);
                        console.log('[GEMINI] Response received successfully');

                        // Handle tool calls for Gemini
                        let call = result.response.functionCalls()?.[0];
                        while (call) {
                            const { name, args } = call;
                            let toolResult;
                            if (name === "update_contact") {
                                console.log('[GEMINI] Tool update_contact called with:', args);

                                // HEURISTIC: Fix common LLM mistake of sending top-level keys instead of nested 'updates'
                                if (!(args as any).updates && ((args as any).name || (args as any).email || (args as any).phone)) {
                                    console.warn('[GEMINI] Detected top-level contact fields, moving to updates object');
                                    (args as any).updates = {};
                                    if ((args as any).name) (args as any).updates.name = (args as any).name;
                                    if ((args as any).email) (args as any).updates.email = (args as any).email;
                                    if ((args as any).phone) (args as any).updates.phone = (args as any).phone;
                                }

                                // Normalize keys (Name -> name, Email -> email) to be safe
                                let updates = (args as any).updates || {};
                                const normalizedUpdates: Record<string, any> = {};
                                for (const [k, v] of Object.entries(updates)) {
                                    const lower = k.toLowerCase();
                                    if (['name', 'email', 'phone'].includes(lower)) {
                                        normalizedUpdates[lower] = v;
                                    } else {
                                        normalizedUpdates[k] = v;
                                    }
                                }
                                (args as any).updates = normalizedUpdates; // Assign specific object

                                if (conversation.contactId) {
                                    try {
                                        const { updateContact } = await import('@/lib/actions/contacts');
                                        const result = await updateContact(
                                            conversation.contactId,
                                            normalizedUpdates, // Pass the normalized object directly
                                            workspace.id
                                        );

                                        // Sync name to conversation if updated
                                        if ((args as any).updates?.name) {
                                            await prisma.conversation.update({
                                                where: { id: conversation.id },
                                                data: { contactName: (args as any).updates.name }
                                            });
                                            // Update local object
                                            conversation.contactName = (args as any).updates.name;
                                        }

                                        toolResult = result.success
                                            ? { success: true, message: "Contact updated successfully" }
                                            : { success: false, error: result.error };
                                    } catch (e) {
                                        console.error('[GEMINI] updateContact error:', e);
                                        toolResult = { success: false, error: "Failed to update contact" };
                                    }
                                } else {
                                    toolResult = { success: false, error: "No contact ID linked" };
                                }
                            } else if (name === "revisar_disponibilidad") {
                                toolResult = calendarIntegration
                                    ? await listAvailableSlots(calendarIntegration.configJson, (args as any).fecha)
                                    : { success: false, error: 'Calendar integration missing' };
                            } else if (name === "agendar_cita") {
                                toolResult = calendarIntegration
                                    ? await createCalendarEvent(calendarIntegration.configJson, args as any)
                                    : { success: false, error: 'Calendar integration missing' };
                            } else if (name === "buscar_imagen") {
                                // Search for images matching the query
                                const query = (args as any).query;
                                const foundMedia = await searchAgentMedia(channel.agentId, query);
                                if (foundMedia.length > 0) {
                                    // Return the first matching image
                                    const image = foundMedia[0];
                                    selectedImage = { url: image.url, altText: image.altText };
                                    toolResult = {
                                        found: true,
                                        url: image.url,
                                        description: image.description || image.fileName,
                                        altText: image.altText
                                    };
                                } else {
                                    // Try to find any image if no match
                                    if (agentMedia.length > 0) {
                                        const image = agentMedia[0];
                                        selectedImage = { url: image.url, altText: image.altText };
                                        toolResult = {
                                            found: true,
                                            url: image.url,
                                            description: image.description || image.fileName,
                                            altText: image.altText
                                        };
                                    } else {
                                        toolResult = { found: false, message: "No se encontraron imágenes disponibles." };
                                    }
                                }
                            } else if (name === "create_zoho_lead") {
                                console.log('[GEMINI] Tool create_zoho_lead called with:', args);
                                try {
                                    const { createZohoLead } = await import('@/lib/zoho');

                                    // Retrieve stored Lead ID from metadata
                                    const meta = (conversation.metadata as any) || {};
                                    const currentLeadId = meta.zohoLeadId;

                                    const res = await createZohoLead(channel.agentId, args as any, currentLeadId);

                                    // Save new Lead ID if created/found
                                    if (res.data && res.data[0]?.details?.id) {
                                        const newLeadId = res.data[0].details.id;
                                        if (newLeadId && newLeadId !== currentLeadId) {
                                            console.log('[GEMINI] Saving new Zoho Lead ID to metadata:', newLeadId);
                                            await prisma.conversation.update({
                                                where: { id: conversation.id },
                                                data: { metadata: { ...meta, zohoLeadId: newLeadId } }
                                            });
                                            // Update local conversation object for subsequent calls
                                            conversation.metadata = { ...meta, zohoLeadId: newLeadId };
                                        }
                                    }

                                    toolResult = { success: true, api_response: res };
                                } catch (e: any) {
                                    console.error('[GEMINI] createZohoLead error:', e);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "add_zoho_note") {
                                console.log('[GEMINI] Tool add_zoho_note called');
                                try {
                                    const meta = (conversation.metadata as any) || {};
                                    const leadId = meta.zohoLeadId;
                                    if (!leadId) throw new Error("No Lead ID found. Create a lead first.");

                                    const { addZohoNote } = await import('@/lib/zoho');
                                    const res = await addZohoNote(channel.agentId, leadId, (args as any).noteContent);
                                    toolResult = { success: true, api_response: res };
                                } catch (e: any) {
                                    console.error('[GEMINI] addZohoNote error:', e);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "create_zoho_task") {
                                console.log('[GEMINI] Tool create_zoho_task called');
                                try {
                                    const meta = (conversation.metadata as any) || {};
                                    const leadId = meta.zohoLeadId;
                                    if (!leadId) throw new Error("No Lead ID found. Create a lead first.");

                                    const { createZohoTask } = await import('@/lib/zoho');
                                    const res = await createZohoTask(channel.agentId, leadId, args as any);
                                    toolResult = { success: true, api_response: res };
                                } catch (e: any) {
                                    console.error('[GEMINI] createZohoTask error:', e);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "schedule_zoho_event") {
                                console.log('[GEMINI] Tool schedule_zoho_event called');
                                try {
                                    const meta = (conversation.metadata as any) || {};
                                    const leadId = meta.zohoLeadId;
                                    if (!leadId) throw new Error("No Lead ID found. Create a lead first.");

                                    const { scheduleZohoEvent } = await import('@/lib/zoho');
                                    const res = await scheduleZohoEvent(channel.agentId, leadId, args as any);
                                    toolResult = { success: true, api_response: res };
                                } catch (e: any) {
                                    console.error('[GEMINI] scheduleZohoEvent error:', e);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "create_odoo_lead") {
                                console.log('[GEMINI] Tool create_odoo_lead called');
                                try {
                                    const { createOdooLead } = await import('@/lib/odoo');
                                    const meta = (conversation.metadata as any) || {};
                                    const currentLeadId = meta.odooLeadId;
                                    const res = await createOdooLead(channel.agentId, args as any, currentLeadId);
                                    if (res.id && res.id !== currentLeadId) {
                                        await prisma.conversation.update({
                                            where: { id: conversation.id },
                                            data: { metadata: { ...meta, odooLeadId: res.id } }
                                        });
                                        conversation.metadata = { ...meta, odooLeadId: res.id };
                                    }
                                    toolResult = { success: true, api_response: res };
                                } catch (e: any) {
                                    console.error('[GEMINI] createOdooLead error:', e);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "add_odoo_note") {
                                console.log('[GEMINI] Tool add_odoo_note called');
                                try {
                                    const meta = (conversation.metadata as any) || {};
                                    const leadId = meta.odooLeadId;
                                    if (!leadId) throw new Error("No Lead ID found. Create a lead first.");
                                    const { addOdooNote } = await import('@/lib/odoo');
                                    const res = await addOdooNote(channel.agentId, leadId, (args as any).noteContent);
                                    toolResult = { success: true, api_response: res };
                                } catch (e: any) {
                                    console.error('[GEMINI] addOdooNote error:', e);
                                    toolResult = { success: false, error: e.message };
                                }
                            }

                            result = await chat.sendMessage([{
                                functionResponse: {
                                    name,
                                    response: { result: toolResult }
                                }
                            }]);
                            call = result.response.functionCalls()?.[0];
                        }

                        replyContent = result.response.text();
                        tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;
                    } catch (geminiError: any) {
                        console.error('[GEMINI] Error calling Gemini API:', geminiError);
                        console.error('[GEMINI] Error message:', geminiError?.message);
                        console.error('[GEMINI] Error code:', geminiError?.code);
                        console.error('[GEMINI] Error status:', geminiError?.status);
                        console.error('[GEMINI] Falling back to GPT-4o');

                        // Fallback to GPT-4o if Gemini fails
                        if (!openaiKey) throw geminiError; // Re-throw if no OpenAI key available
                        useOpenAI = true; // Will use OpenAI logic below
                        modelUsedForLogging = fallbackModel; // Update model for OpenAI fallback and logging
                        console.log('[GEMINI] Updated modelUsedForLogging to:', modelUsedForLogging);
                    }
                }
            }

            // OpenAI Logic (Default or Fallback from Gemini)
            if (!model.includes('gemini') || useOpenAI) {
                // OpenAI Logic (Default or Fallback)
                if (!openaiKey) throw new Error("OpenAI API Key not configured");

                const currentOpenAI = new OpenAI({ apiKey: openaiKey });

                const openAiMessages: any[] = [
                    { role: 'system', content: systemPrompt },
                    ...history.reverse().map((m: Message) => {
                        const isImage = m.metadata && typeof m.metadata === 'object' && (m.metadata as any).type === 'image' && (m.metadata as any).url;

                        if (isImage) {
                            return {
                                role: m.role === 'USER' ? 'user' : 'assistant',
                                content: [
                                    {
                                        type: 'text', text: m.role === 'HUMAN'
                                            ? `[Intervención humana]: ${m.content}`
                                            : (m.content || 'Imagen enviada')
                                    },
                                    { type: 'image_url', image_url: { url: (m.metadata as any).url } }
                                ]
                            };
                        }

                        // Text only message
                        return {
                            role: m.role === 'USER' ? 'user' : 'assistant',
                            content: m.role === 'HUMAN'
                                ? `[Intervención humana]: ${m.content}`
                                : m.content
                        };
                    }),
                    (() => {
                        // If image is present, use multimodal format
                        if (fileType === 'image' && (imageBase64 || fileUrl)) {
                            return {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: data.content || 'Describe esta imagen'
                                    },
                                    {
                                        type: 'image_url',
                                        image_url: {
                                            url: imageBase64 || fileUrl // OpenAI accepts data URLs or public URLs
                                        }
                                    }
                                ]
                            };
                        }

                        // For PDFs or text only, use simple text format (PDF text is already in messageContent)
                        return { role: 'user', content: messageContent };
                    })()
                ];

                const openAiTools = tools.length > 0 ? tools.map(t => ({
                    type: 'function',
                    function: t
                })) : undefined;

                // Use gpt-4o for images (has vision), otherwise use agent's configured model
                // Note: If model is gpt-4o-mini and it fails, we'll fallback to gpt-4o
                // If we're falling back from Gemini, use gpt-4o
                let modelToUse = modelUsedForLogging;
                if (useOpenAI && model.includes('gemini')) {
                    // We're falling back from Gemini, use gpt-4o
                    modelToUse = fallbackModel;
                    console.log('[OPENAI] Fallback from Gemini, using model:', modelToUse);
                }

                // Safety check: Never use a Gemini model name with OpenAI
                if (modelToUse.includes('gemini')) {
                    console.warn('[OPENAI] Detected Gemini model name in OpenAI call, forcing fallback to gpt-4o');
                    modelToUse = fallbackModel;
                }

                console.log('[OPENAI] Sending request with model:', modelToUse, 'messages:', openAiMessages.length);
                let completion;
                try {
                    completion = await currentOpenAI.chat.completions.create({
                        messages: openAiMessages as any,
                        model: modelToUse,
                        temperature: agent.temperature,
                        tools: openAiTools as any,
                    });
                    console.log('[OPENAI] Response received');
                } catch (modelError: any) {
                    // If model is not available (e.g., gpt-4o-mini), try fallback to gpt-4o
                    if (modelToUse === 'gpt-4o-mini' && (modelError?.message?.includes('model') || modelError?.code === 'model_not_found')) {
                        console.warn('[OPENAI] Model gpt-4o-mini not available, falling back to gpt-4o');
                        completion = await currentOpenAI.chat.completions.create({
                            messages: openAiMessages as any,
                            model: 'gpt-4o',
                            temperature: agent.temperature,
                            tools: openAiTools as any,
                        });
                        console.log('[OPENAI] Fallback to gpt-4o successful');
                    } else {
                        throw modelError; // Re-throw if it's a different error
                    }
                }

                let message = completion.choices[0].message;

                // Handle tool calls for OpenAI
                while (message.tool_calls) {
                    openAiMessages.push(message);
                    for (const toolCall of message.tool_calls as any[]) {
                        const { name, arguments: argsJson } = toolCall.function;
                        const args = JSON.parse(argsJson);
                        let toolResult;
                        if (name === "update_contact") {
                            console.log('[WIDGET] Tool update_contact called with:', args);

                            // Helper to normalize keys to lowercase
                            const normalizeKeys = (obj: any) => {
                                if (!obj || typeof obj !== 'object') return {};
                                const newObj: any = {};
                                for (const [k, v] of Object.entries(obj)) {
                                    newObj[k.toLowerCase()] = v;
                                }
                                return newObj;
                            };

                            // Debug Logger Helper
                            const logDebugWidget = async (message: string, data?: any) => {
                                const fs = await import('fs');
                                const path = await import('path');
                                const timestamp = new Date().toISOString();
                                const logLine = `[${timestamp}][WIDGET] ${message} ${data ? JSON.stringify(data) : ''}\n`;
                                const logPath = path.join(process.cwd(), 'debug-errors.log');
                                try {
                                    await fs.promises.appendFile(logPath, logLine);
                                } catch (e) { }
                            };

                            let normalizedArgs = normalizeKeys(args);
                            let updates = normalizeKeys(normalizedArgs.updates || {});

                            // HEURISTIC: If 'updates' is empty but top-level fields exist, use them
                            if (Object.keys(updates).length === 0) {
                                if (normalizedArgs.name) updates.name = normalizedArgs.name;
                                if (normalizedArgs.email) updates.email = normalizedArgs.email;
                                if (normalizedArgs.phone) updates.phone = normalizedArgs.phone;
                            }

                            // HEURISTIC: Sync custom "nombre_completo" to standard "name" if standard is missing
                            // This fixes the issue where user defines "nombre_completo" and AI uses it, but UI needs "name"
                            if (!updates.name && updates.nombre_completo) {
                                updates.name = updates.nombre_completo;
                            }

                            // Assign back for consistency
                            args.updates = updates;

                            await logDebugWidget('Tool call processed', {
                                contactId: conversation.contactId,
                                updates,
                                normalizedArgs
                            });

                            if (conversation.contactId) {
                                try {
                                    const { updateContact } = await import('@/lib/actions/contacts');
                                    const result = await updateContact(
                                        conversation.contactId,
                                        updates, // Pass normalized object
                                        workspace.id
                                    );

                                    // Store debug info in metadata (SAFELY)
                                    try {
                                        const debugInfo: any = {
                                            timestamp: new Date().toISOString(),
                                            updates: args.updates,
                                            result: result ? { success: result.success, message: result.success ? 'Contact updated' : (result.error || 'Unknown error') } : 'No result'
                                        };

                                        // Update metadata with debug info
                                        const currentMeta = (conversation.metadata as any) || {};
                                        await prisma.conversation.update({
                                            where: { id: conversation.id },
                                            data: {
                                                metadata: {
                                                    ...currentMeta,
                                                    lastContactUpdate: debugInfo
                                                }
                                            } as any
                                        });
                                    } catch (logErr) {
                                        console.error('[WIDGET] Failed to log metadata:', logErr);
                                    }

                                    // ONLY Sync name to conversation if contact update SUCCEEDED
                                    if (result.success && updates.name) {
                                        await prisma.conversation.update({
                                            where: { id: conversation.id },
                                            data: { contactName: updates.name }
                                        });
                                        // Update local object
                                        conversation.contactName = updates.name;
                                    }

                                    toolResult = result.success
                                        ? { success: true, message: "Contact updated successfully" }
                                        : { success: false, error: result.error };
                                } catch (e: any) {
                                    console.error('[WIDGET] updateContact error:', e);

                                    // Log exception to metadata
                                    const currentMeta = (conversation.metadata as any) || {};
                                    await prisma.conversation.update({
                                        where: { id: conversation.id },
                                        data: {
                                            metadata: {
                                                ...currentMeta,
                                                lastContactUpdateError: {
                                                    message: e.message,
                                                    stack: e.stack
                                                }
                                            }
                                        } as any // Force cast for debug
                                    });

                                    toolResult = { success: false, error: "Failed to update contact" };
                                }
                            } else {
                                await logDebugWidget('No contactId linked', {});
                                toolResult = { success: false, error: "No contact ID linked" };
                            }
                        } else if (name === "revisar_disponibilidad") {
                            toolResult = calendarIntegration
                                ? await listAvailableSlots(calendarIntegration.configJson, args.fecha)
                                : { success: false, error: 'Calendar integration missing' };
                        } else if (name === "agendar_cita") {
                            toolResult = calendarIntegration
                                ? await createCalendarEvent(calendarIntegration.configJson, args)
                                : { success: false, error: 'Calendar integration missing' };
                        } else if (name === "buscar_imagen") {
                            // Search for images matching the query
                            const query = args.query;
                            const foundMedia = await searchAgentMedia(channel.agentId, query);
                            if (foundMedia.length > 0) {
                                // Return the first matching image
                                const image = foundMedia[0];
                                selectedImage = { url: image.url, altText: image.altText };
                                toolResult = {
                                    found: true,
                                    url: image.url,
                                    description: image.description || image.fileName,
                                    altText: image.altText
                                };
                            } else {
                                // Try to find any image if no match
                                if (agentMedia.length > 0) {
                                    const image = agentMedia[0];
                                    selectedImage = { url: image.url, altText: image.altText };
                                    toolResult = {
                                        found: true,
                                        url: image.url,
                                        description: image.description || image.fileName,
                                        altText: image.altText
                                    };
                                } else {
                                    toolResult = { found: false, message: "No se encontraron imágenes disponibles." };
                                }
                            }
                        } else if (name === "create_zoho_lead") {
                            console.log('[OPENAI] Tool create_zoho_lead called with:', args);
                            try {
                                const { createZohoLead } = await import('@/lib/zoho');

                                // Retrieve stored Lead ID from metadata
                                const meta = (conversation.metadata as any) || {};
                                const currentLeadId = meta.zohoLeadId;

                                const res = await createZohoLead(channel.agentId, args, currentLeadId);

                                // Save new Lead ID if created/found
                                if (res.data && res.data[0]?.details?.id) {
                                    const newLeadId = res.data[0].details.id;
                                    if (newLeadId && newLeadId !== currentLeadId) {
                                        console.log('[OPENAI] Saving new Zoho Lead ID to metadata:', newLeadId);
                                        await prisma.conversation.update({
                                            where: { id: conversation.id },
                                            data: { metadata: { ...meta, zohoLeadId: newLeadId } }
                                        });
                                        // Update local conversation object
                                        conversation.metadata = { ...meta, zohoLeadId: newLeadId };
                                    }
                                }

                                toolResult = { success: true, api_response: res };
                            } catch (e: any) {
                                console.error('[OPENAI] createZohoLead error:', e);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "add_zoho_note") {
                            console.log('[OPENAI] Tool add_zoho_note called');
                            try {
                                const meta = (conversation.metadata as any) || {};
                                const leadId = meta.zohoLeadId;
                                if (!leadId) throw new Error("No Lead ID found. Create a lead first.");

                                const { addZohoNote } = await import('@/lib/zoho');
                                const res = await addZohoNote(channel.agentId, leadId, (args as any).noteContent);
                                toolResult = { success: true, api_response: res };
                            } catch (e: any) {
                                console.error('[OPENAI] addZohoNote error:', e);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "create_zoho_task") {
                            console.log('[OPENAI] Tool create_zoho_task called');
                            try {
                                const meta = (conversation.metadata as any) || {};
                                const leadId = meta.zohoLeadId;
                                if (!leadId) throw new Error("No Lead ID found. Create a lead first.");

                                const { createZohoTask } = await import('@/lib/zoho');
                                const res = await createZohoTask(channel.agentId, leadId, args as any);
                                toolResult = { success: true, api_response: res };
                            } catch (e: any) {
                                console.error('[OPENAI] createZohoTask error:', e);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "schedule_zoho_event") {
                            console.log('[OPENAI] Tool schedule_zoho_event called');
                            try {
                                const meta = (conversation.metadata as any) || {};
                                const leadId = meta.zohoLeadId;
                                if (!leadId) throw new Error("No Lead ID found. Create a lead first.");

                                const { scheduleZohoEvent } = await import('@/lib/zoho');
                                const res = await scheduleZohoEvent(channel.agentId, leadId, args as any);
                                toolResult = { success: true, api_response: res };
                            } catch (e: any) {
                                console.error('[OPENAI] scheduleZohoEvent error:', e);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "create_odoo_lead") {
                            console.log('[OPENAI] Tool create_odoo_lead called');
                            try {
                                const { createOdooLead } = await import('@/lib/odoo');
                                const meta = (conversation.metadata as any) || {};
                                const currentLeadId = meta.odooLeadId;
                                const res = await createOdooLead(channel.agentId, args as any, currentLeadId);
                                if (res.id && res.id !== currentLeadId) {
                                    await prisma.conversation.update({
                                        where: { id: conversation.id },
                                        data: { metadata: { ...meta, odooLeadId: res.id } }
                                    });
                                    conversation.metadata = { ...meta, odooLeadId: res.id };
                                }
                                toolResult = { success: true, api_response: res };
                            } catch (e: any) {
                                console.error('[OPENAI] createOdooLead error:', e);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "add_odoo_note") {
                            console.log('[OPENAI] Tool add_odoo_note called');
                            try {
                                const meta = (conversation.metadata as any) || {};
                                const leadId = meta.odooLeadId;
                                if (!leadId) throw new Error("No Lead ID found. Create a lead first.");
                                const { addOdooNote } = await import('@/lib/odoo');
                                const res = await addOdooNote(channel.agentId, leadId, (args as any).noteContent);
                                toolResult = { success: true, api_response: res };
                            } catch (e: any) {
                                console.error('[OPENAI] addOdooNote error:', e);
                                toolResult = { success: false, error: e.message };
                            }
                        }
                        openAiMessages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: JSON.stringify(toolResult)
                        });
                    }
                    completion = await currentOpenAI.chat.completions.create({
                        messages: openAiMessages as any,
                        model: modelToUse,
                        temperature: agent.temperature,
                        tools: openAiTools as any,
                    });
                    message = completion.choices[0].message;
                }

                replyContent = message.content || '...';
                tokensUsed = completion.usage?.total_tokens || 0;
            }

            // 6. Save Agent Message (with image metadata if image was selected)
            const agentMsg = await prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    role: 'AGENT',
                    content: replyContent,
                    metadata: selectedImage ? {
                        type: 'image',
                        url: selectedImage.url,
                        altText: selectedImage.altText || null
                    } : undefined
                }
            });

            // 6.5. [REMOVED] Legacy regex extraction.
            // We rely on the 'update_contact' tool for this now.
            // const extractedName = ...
            // const extractedEmail = ...

            // 7. Deduct Credits
            await prisma.$transaction([
                prisma.creditBalance.update({
                    where: { workspaceId: workspace.id },
                    data: {
                        balance: { decrement: 1 },
                        totalUsed: { increment: 1 }
                    }
                }),
                prisma.usageLog.create({
                    data: {
                        workspaceId: workspace.id,
                        agentId: channel.agentId,
                        // @ts-ignore
                        channelId: channel.id,
                        conversationId: conversation.id,
                        tokensUsed: tokensUsed,
                        creditsUsed: 1,
                        // Store strict model name used
                        model: model.includes('gemini') ? 'gemini-1.5-flash' : modelUsedForLogging
                    }
                })
            ]);

            return { userMsg, agentMsg };

        } catch (error) {
            console.error("AI Error:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : 'No stack trace';
            console.error("Error details:", errorMessage);
            console.error("Error stack:", errorStack);
            console.error("Model used:", model);
            console.error("File type:", fileType);
            console.error("Has imageBase64:", !!imageBase64);
            console.error("Has openaiKey:", !!openaiKey);
            console.error("Has googleKey:", !!googleKey);

            // Fallback message if AI fails
            const fallbackMsg = await prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    role: 'AGENT',
                    content: errorMessage.includes('credits')
                        ? "Lo siento, no hay créditos disponibles en este momento. Por favor, contacta al administrador."
                        : errorMessage.includes('API Key') || errorMessage.includes('not configured') || errorMessage.includes('GOOGLE_API_KEY')
                            ? "Error de configuración del servidor. Por favor, contacta al administrador."
                            : errorMessage.includes('rate limit') || errorMessage.includes('429') || errorMessage.includes('quota')
                                ? "Lo siento, estoy recibiendo demasiadas solicitudes o se ha alcanzado el límite de cuota. Por favor, espera un momento e intenta de nuevo."
                                : errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')
                                    ? "Lo siento, la solicitud está tardando demasiado. Por favor, intenta de nuevo."
                                    : errorMessage.includes('permission') || errorMessage.includes('403')
                                        ? "Error de permisos en la API. Por favor, contacta al administrador."
                                        : errorMessage.includes('401') || errorMessage.includes('Unauthorized')
                                            ? "Error de autenticación en la API. Por favor, contacta al administrador."
                                            : "Lo siento, estoy teniendo problemas de conexión en este momento. Por favor, intenta de nuevo."
                }
            });
            return { userMsg, agentMsg: fallbackMsg };
        }
    } catch (outerError) {
        // Catch any error that occurs before the inner try-catch
        console.error("Widget Message Error (outer catch):", outerError);
        const errorMessage = outerError instanceof Error ? outerError.message : 'Unknown error';
        console.error("Error details:", errorMessage);

        // Re-throw with more context for the client
        throw new Error(`Error procesando mensaje: ${errorMessage}`);
    }
}

export async function getWidgetMessages(channelId: string, visitorId: string) {
    try {
        const conversation = await prisma.conversation.findFirst({
            where: {
                channelId: channelId,
                externalId: visitorId
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!conversation) {
            return [];
        }

        return conversation.messages;
    } catch (error) {
        console.error("Error fetching widget messages:", error);
        return [];
    }
}
