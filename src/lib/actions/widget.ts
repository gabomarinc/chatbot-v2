'use server'

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { Message } from '@prisma/client';
import { generateEmbedding, cosineSimilarity } from '@/lib/ai';
import { listAvailableSlots, createCalendarEvent } from '@/lib/google';
import { searchAgentMedia } from '@/lib/actions/agent-media';
import { retrieveRelevantChunks } from '@/lib/retrieval';

export async function sendWidgetMessage(data: {
    channelId: string;
    content: string;
    visitorId: string; // Used as externalId
    metadata?: any; // Optional metadata for file attachments
    imageUrl?: string; // URL of uploaded image
    imageBase64?: string; // Base64 encoded image for AI processing
    fileUrl?: string; // URL of uploaded file (PDF, image or audio)
    fileType?: 'pdf' | 'image' | 'audio'; // Type of uploaded file
    extractedText?: string; // Extracted text from PDF
    transcription?: string; // Transcription from audio
    isTest?: boolean;
    agentId?: string;
}) {
    try {
        // 0. Resolve API Keys (Env vs DB)
        let openaiKey = process.env.OPENAI_API_KEY;
        let googleKey = process.env.GOOGLE_API_KEY;

        // Only fetch from DB if env vars are missing
        if (!openaiKey || !googleKey) {
            const configs = await (prisma as any).config.findMany({
                where: {
                    key: { in: ['OPENAI_API_KEY', 'GOOGLE_API_KEY'] }
                }
            });

            if (!openaiKey) openaiKey = configs.find((c: any) => c.key === 'OPENAI_API_KEY')?.value;
            if (!googleKey) googleKey = configs.find((c: any) => c.key === 'GOOGLE_API_KEY')?.value;
        }

        // 1. Validate Channel or Agent (if testing)
        let channel: any;

        if (data.isTest && data.agentId) {
            // Bypass strict channel validation for testing environment
            const agent = await prisma.agent.findUnique({
                where: { id: data.agentId },
                include: {
                    workspace: { include: { creditBalance: true, paymentConfigs: true } },
                    integrations: { where: { provider: { in: ['GOOGLE_CALENDAR', 'ZOHO', 'ODOO', 'HUBSPOT', 'NEON_CATALOG', 'ALTAPLAZA'] as any }, enabled: true } },
                    intents: { where: { enabled: true } },
                    customFieldDefinitions: true
                }
            });
            if (!agent) throw new Error("Agent not found for testing");

            channel = {
                id: data.channelId || 'test-channel',
                isActive: true, // Always active for testing
                agentId: agent.id,
                agent: agent
            };
        } else {
            channel = await prisma.channel.findUnique({
                where: { id: data.channelId },
                include: {
                    agent: {
                        include: {
                            workspace: { include: { creditBalance: true, paymentConfigs: true } },
                            integrations: { where: { provider: { in: ['GOOGLE_CALENDAR', 'ZOHO', 'ODOO', 'HUBSPOT', 'NEON_CATALOG', 'ALTAPLAZA'] as any }, enabled: true } },
                            intents: { where: { enabled: true } },
                            customFieldDefinitions: true
                        }
                    }
                }
            }) as any;

            if (!channel) {
                throw new Error("Channel not found")
            }

            if (!channel.isActive) {
                throw new Error("Channel is not active. Please activate the channel in the channel settings.")
            }
        }

        const agent = channel.agent;
        const workspace = agent.workspace;
        const creditBalance = workspace.creditBalance;
        const model = agent.model;

        // 2. Credit Check
        if (!creditBalance || creditBalance.balance <= 0) {
            console.log(`Workspace ${workspace.id} has insufficient credits.`);
            throw new Error("Insufficient credits");
        }

        // 3. Find or Create Conversation (Try to resume the latest one if possible)
        let conversation = await prisma.conversation.findFirst({
            where: {
                channelId: data.isTest ? null : channel.id,
                agentId: channel.agentId,
                externalId: data.visitorId,
            },
            include: { contact: true },
            orderBy: { lastMessageAt: 'desc' }
        })

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    agentId: channel.agentId,
                    channelId: data.isTest ? null : channel.id,
                    externalId: data.visitorId,
                    contactName: `Visitante ${data.visitorId.slice(0, 4)}`,
                    status: 'OPEN',
                    lastMessageAt: new Date()
                },
                include: { contact: true }
            })
        } else {
            // Reopen if it was closed
            const updates: any = { lastMessageAt: new Date() };
            if (conversation.status === 'CLOSED') {
                updates.status = 'OPEN';
                updates.npsScore = null;
                updates.npsComment = null;
                console.log(`[WIDGET] Reopening conversation ${conversation.id} for user ${data.visitorId}`);
            }

            conversation = await prisma.conversation.update({
                where: { id: conversation.id },
                data: updates,
                include: { contact: true }
            })
        }

        // 3.4. Ensure contact exists and is linked
        if (!conversation.contactId) {
            console.log(`[WIDGET] No contact linked for conversation ${conversation.id}. Creating new contact...`);
            try {
                // WhatsApp Phone Extraction Logic
                let extractedPhone = null;
                if (channel.type === 'WHATSAPP' || channel.type === 'WHATSAPP_WEB') {
                    // externalId usually looks like "50766667777@c.us" or similar
                    extractedPhone = conversation.externalId.split('@')[0];
                    console.log(`[WIDGET] Extracted WhatsApp phone: ${extractedPhone}`);
                }

                // Create a new contact if one doesn't exist
                const newContact = await prisma.contact.create({
                    data: {
                        workspaceId: workspace.id,
                        name: conversation.contactName || 'Visitante',
                        email: conversation.contactEmail,
                        phone: extractedPhone,
                        externalId: conversation.externalId,
                        customData: {},
                    }
                });
                console.log(`[WIDGET] Created contact ${newContact.id}`);

                // Link to conversation
                const updatedConversation = await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: { contactId: newContact.id },
                    include: { contact: true }
                });

                conversation = updatedConversation;
            } catch (error) {
                console.error(`[WIDGET] Error creating/linking contact:`, error);
            }
        } else if (conversation.contact && !conversation.contact.phone && (channel.type === 'WHATSAPP' || channel.type === 'WHATSAPP_WEB')) {
            // Update existing contact if phone is missing
            try {
                const extractedPhone = conversation.externalId.split('@')[0];
                await prisma.contact.update({
                    where: { id: conversation.contactId },
                    data: { phone: extractedPhone }
                });
                console.log(`[WIDGET] Updated existing contact phone: ${extractedPhone}`);
            } catch (e) {
                console.error('[WIDGET] Error updating contact phone:', e);
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

        // For PDFs or Audio, include extracted text or transcription in the message content
        let messageContent = data.content;
        if (fileType === 'pdf' && data.extractedText) {
            // Prepend extracted text to the message
            messageContent = data.content
                ? `${data.content}\n\n--- Contenido del PDF ---\n${data.extractedText}`
                : `--- Contenido del PDF ---\n${data.extractedText}`;
        } else if (fileType === 'audio' && data.transcription) {
            // Use transcription for audio messages
            messageContent = data.transcription;
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

        // When a user proactively replies, cancel any pending follow-ups and reset the followUpCount
        await (prisma as any).scheduledFollowUp.updateMany({
            where: { conversationId: conversation.id, status: 'PENDING' },
            data: { status: 'CANCELLED' }
        });

        if ((conversation as any).followUpCount > 0) {
            await (prisma as any).conversation.update({
                where: { id: conversation.id },
                data: { followUpCount: 0 }
            });
        }

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
        // If isPaused is true OR status is PENDING, a human is handling it (or will), so bot should NOT auto-respond
        if (conversation.isPaused || conversation.status === 'PENDING') {
            console.log(`[PAUSED/PENDING] Conversation ${conversation.id} is paused for human takeover or pending (${conversation.status}), skipping bot response`);

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

            // 5.1 Retrieve Context (RAG) - Enhanced with Anchoring & Thresholding
            let context = "";
            try {
                // Use the shared retrieval logic (Ensemble + Re-ranker + Threshold)
                const chunks = await retrieveRelevantChunks(channel.agentId, data.content, 10);

                if (chunks.length > 0) {
                    // Mandatory Contextual Anchoring formatting
                    context = chunks.map(c => `[FUENTE: ${c.sourceName}]: ${c.content}`).join("\n\n---\n\n");
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

            const hubspotIntegration = agent.integrations.find((i: any) => i.provider === 'HUBSPOT');
            const hasHubSpot = !!hubspotIntegration;

            const altaplazaIntegration = agent.integrations.find((i: any) => i.provider === 'ALTAPLAZA');
            const hasAltaplaza = !!altaplazaIntegration && altaplazaIntegration.enabled;

            const neonIntegration = agent.integrations.find((i: any) => i.provider === 'NEON_CATALOG');
            const hasNeon = !!neonIntegration && neonIntegration.enabled;

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
${hasZoho || hasOdoo || hasHubSpot ? `- CRM: TIENES ACCESO a ${[hasZoho && 'Zoho CRM', hasOdoo && 'Odoo CRM', hasHubSpot && 'HubSpot CRM'].filter(Boolean).join(', ')}. Es OBLIGATORIO usar las herramientas de creación de registros tan pronto el usuario brinde SU NOMBRE O EMAIL.` : '- CRM: No disponible.'}
${imagePrompts ? `\nINSTRUCCIONES ESPECÍFICAS PARA ENVIAR IMÁGENES:\n${imagePrompts}\nIMPORTANTE: Cuando una de estas situaciones ocurra, DEBES usar la herramienta buscar_imagen con los términos apropiados para encontrar y enviar la imagen correspondiente.` : ''}

CONOCIMIENTO ADICIONAL (ENTRENAMIENTO RAG - ESTRICTO):
Usa la información a continuación para responder. 
IMPORTANTE: En tus documentos, "PP" se refiere a "Panamá Pacífico". Tenlo en cuenta para cruzar información.

REGLAS Y USO DEL CONTEXTO:
1. FLUIDEZ Y COMPRENSIÓN: Eres inteligente. Lee el contexto de entrenamiento proporcionado y úsalo para responder de forma natural, sin sonar como un robot que solo lee un documento. Si te preguntan por propiedades, opciones o características, búscalas en el texto y preséntalas de la mejor manera.
2. CERO ALUCINACIONES (CRÍTICO): NUNCA inventes precios, nombres de propiedades, características, direcciones, cifras o promociones. Toda cifra o dato verificable que compartas DEBE provenir de la información de arriba.
3. PREGUNTAS QUEDAN PENDIENTES: Si, y solo si, el usuario te pide un dato concreto o exige información que definitivamente NO ESTÁ en el contexto (ej. un precio de una casa específica que no está en el PDF), dile educadamente que, como su asistente, no tienes ese dato de memoria ahora mismo y lo enviarás al equipo interno para informarle luego. SOLO en ese caso, usa OBLIGATORIAMENTE la herramienta 'log_pending_question' para guardar la duda del usuario en el panel.

${context || 'No hay información de entrenamiento específica para esta consulta. Si el usuario hace una pregunta sobre información oficial que no tienes, indícale educadamente que debes registrar su consulta y usa LA HERRAMIENTA log_pending_question.'}

INSTRUCCIONES DE EJECUCIÓN (PRIORIDAD MÁXIMA):
1. VERACIDAD: No inventes nada. Usa 'log_pending_question' si no sabes algo.
2. LIMITACIÓN: Solo usa el contexto de arriba.
3. ESTILO: Mantén un tono ${styleDescription} y profesional.
6. EXTRACCIÓN DE DATOS: Si el usuario menciona su nombre o correo electrónico, extráelos y guárdalos internamente.

${hasZoho ? `INSTRUCCIONES ZOHO CRM:
- ACTUALIZACIÓN CONTINUA: USA 'create_zoho_lead' CADA VEZ que el usuario mencione un dato nuevo (nombre, email, teléfono o interés). No esperes al final.
- CAMPO DESCRIPTION: DEBES poner lo que el usuario busca en el campo 'Description' de Zoho.
- NOTAS: USA 'add_zoho_note' para detalles específicos o requerimientos complejos.` : ''}

${hasOdoo ? `INSTRUCCIONES ODOO CRM:
- ACTUALIZACIÓN CONTINUA: USA 'create_odoo_lead' CADA VEZ que el usuario mencione un dato nuevo (nombre, email, teléfono o interés). No esperes.
- CAMPO DESCRIPTION: DEBES poner lo que el usuario busca en el campo 'description' de Odoo.
- NOTAS: USA 'add_odoo_note' para guardar requerimientos adicionales.` : ''}

${hasHubSpot ? `INSTRUCCIONES HUBSPOT CRM:
- ACTUALIZACIÓN CONTINUA: USA 'create_hubspot_contact' CADA VEZ que el usuario mencione un dato nuevo (nombre, email, teléfono o interés).
- CAMPO DESCRIPTION: DEBES poner lo que el usuario busca en el campo 'description' de la herramienta. Esto creará una nota automática.
- NOTAS: USA 'add_hubspot_note' para guardar requerimientos específicos adicionales.` : ''}

ENCUESTA DE SATISFACCIÓN (NPS):
- Estado: ${(agent as any).enableNPS ? 'ACTIVADA' : 'DESACTIVADA'}
${(agent as any).enableNPS ? '- REGLA: Antes de dar por finalizada la atención con "finalizar_atencion", DEBES preguntar al usuario: "¿Qué tan probable es que nos recomiendes a un amigo o colega? (Responde con un número del 0 al 10)".\n- Una vez que el usuario te dé la nota, usa la herramienta "registrar_nps" para guardarla y luego despídete y usa "finalizar_atencion".' : '- No es necesario preguntar por satisfacción.'}
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

- Map user input to the *exact* custom field keys defined above (e.g. if field is "salary", map "5000" to "salary").
5. FINALIZACIÓN DE ATENCIÓN: Solo usa 'finalizar_atencion' cuando el usuario ya no tenga dudas y la consulta haya sido resuelta. NO la uses si hay una cita agendada hoy o pendiente, o si el usuario dijo que volvería con una consulta específica mas tarde.

${channel.agent.jobType === 'SALES' ? `
PAGOS Y COBROS (CAPACIDAD DE VENTAS):
Tienes la capacidad de generar LINKS DE PAGO para los clientes.
${(() => {
                        const ws = workspace as any;
                        const activeConfigs = ws.paymentConfigs?.filter((pc: any) => pc.isActive) || [];
                        if (activeConfigs.length === 0) return 'No hay pasarelas de pago configuradas por ahora. Si el usuario quiere pagar, dile que un agente humano se pondrá en contacto pronto.';

                        const gateways = activeConfigs.map((pc: any) => pc.gateway);
                        const mentions = [];
                        if (gateways.includes('PAGUELOFACIL')) mentions.push('Tarjetas vía PagueloFacil');
                        if (gateways.includes('YAPPY')) mentions.push('pagos vía Yappy');

                        return `Pasarelas Activas: ${gateways.join(', ')}.
Reglas para cobrar (ESTRICTO):
1. NO INVENTES PRECIOS. Solo usa los precios que están en tu Base de Conocimiento (Entrenamiento RAG) o que el usuario/negocio te haya indicado explícitamente.
2. Identifica qué quiere comprar el cliente y usa el monto EXACTO definido para ese producto o servicio.
3. Si el usuario pregunta por un producto que no tiene precio en tu contexto, NO inventes uno; dile que un agente le confirmará el precio pronto.
4. Usa la herramienta 'generar_link_de_pago' solo cuando el monto sea 100% seguro.
5. Entrega el enlace al cliente y dile que puede completar su pago de forma segura${mentions.length > 0 ? ` (Aceptamos ${mentions.join(' y ')}).` : '.'}`;
                    })()}
` : ''}
`;

            const neonPrompt = hasNeon ? `\nBÚSQUEDA EN CATÁLOGO (NEON DB):
- TIENES ACCESO al catálogo de productos de la empresa en tiempo real.
- Si el usuario pregunta por precios, stock, tallas, marcas o cualquier detalle de un producto, USA 'query_product_catalog'.
- No asumas que no tienes la información sin antes consultar la herramienta.
- Si la herramienta no devuelve resultados, informa al usuario que no se encontró el producto específico y ofrece ayuda para buscar algo similar.` : '';

            systemPrompt += neonPrompt;

            // Define tools for Calendar and Image Search, and Contact Update
            const tools: any[] = [];

            // Transfer instruction
            if (channel.agent.transferToHuman) {
                systemPrompt += `\nTRANSFERENCIA A HUMANO:\nTienes permiso para transferir esta conversación a un humano si el usuario lo solicita o si detectas una necesidad específica.\n`;

                // Add standard departments
                systemPrompt += `- Departamento SALES: Ventas, cotizaciones, precios, comprar.\n`;
                systemPrompt += `- Departamento SUPPORT: Problemas técnicos, errores, ayuda con el uso.\n`;
                systemPrompt += `- Departamento PERSONAL: Consultas generales o cuando no estés seguro.\n`;

                // Add subdepartments dynamically to inform the bot about human specialties
                try {
                    const availableMembers = await (prisma.workspaceMember as any).findMany({
                        where: { workspaceId: workspace.id, subDepartment: { not: null } },
                        select: { subDepartment: true }
                    });

                    const uniqueSubDepts = Array.from(new Set(availableMembers.map((m: any) => m.subDepartment)));
                    if (uniqueSubDepts.length > 0) {
                        systemPrompt += `\nSUBDEPARTAMENTOS DISPONIBLES (NICHOS/ESPECIALIDADES):\n`;
                        systemPrompt += `El equipo tiene expertos en los siguientes nichos: ${uniqueSubDepts.join(', ')}.\n`;
                        systemPrompt += `Si el usuario menciona o busca algo relacionado a estos nichos, DEBES incluir el parámetro 'subdepartamento' exacto al llamar a la herramienta 'asignar_a_humano'.\n`;
                    }
                } catch (e) { console.error(e) }

                // Add custom departments from "Ruteo Inteligente" (handoffTargets)
                const handoffTargets = (agent as any).handoffTargets;
                if (handoffTargets && Array.isArray(handoffTargets) && handoffTargets.length > 0) {
                    systemPrompt += `\nDEPARTAMENTOS PERSONALIZADOS CONFIGURADOS:\n`;
                    handoffTargets.forEach((target: any) => {
                        systemPrompt += `- Departamento "${target.name}": ${target.description || 'Transferir aquí cuando corresponda.'} (Usa este nombre exacto en el parámetro departamento)\n`;
                    });
                }

                systemPrompt += `\nAL LLAMAR A 'asignar_a_humano', el usuario será notificado y el sistema buscará al agente adecuado o enviará una notificación.\n`;
            }

            if (channel.agent.jobType === 'SALES') {
                tools.push({
                    name: 'generar_link_de_pago',
                    description: 'Genera un link de pago (Checkout) para que el cliente pueda pagar. Úsala cuando el usuario esté listo para comprar o pida un enlace para pagar.',
                    parameters: {
                        type: 'object',
                        properties: {
                            amount: { type: 'number', description: 'Monto total a cobrar (ej: 15.50)' },
                            description: { type: 'string', description: 'Concepto del pago que verá el cliente (ej: Reserva de consultoría)' },
                            gateway: { type: 'string', enum: ['PAGUELOFACIL', 'YAPPY'], description: 'Pasarela a utilizar (usa PAGUELOFACIL por defecto si hay varias)' }
                        },
                        required: ['amount', 'description', 'gateway']
                    }
                });
            }

            tools.push(
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
                },
                {
                    name: 'finalizar_atencion',
                    description: 'Finaliza la atención y cierra la conversación. Úsala solo cuando el usuario ya no tenga más dudas y la consulta haya sido resuelta satisfactoriamente. NO la uses si hay una cita pendiente o compromisos de seguimiento por parte del bot.',
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                },
                {
                    name: 'registrar_nps',
                    description: 'Registra la calificación de satisfacción (NPS) del usuario (0-10) y opcionalmente su comentario.',
                    parameters: {
                        type: 'object',
                        properties: {
                            score: { type: 'number', description: 'Calificación del 0 al 10' },
                            comment: { type: 'string', description: 'Comentario opcional del usuario si lo proporciona' }
                        },
                        required: ['score']
                    }
                },
                {
                    name: 'asignar_a_humano',
                    description: 'Transfiere la conversación a un agente humano del equipo. Úsala cuando el usuario pida hablar con una persona, cuando el bot no sepa responder algo complejo, o cuando se detecte una intención clara para un departamento (ventas, soporte).',
                    parameters: {
                        type: 'object',
                        properties: {
                            departamento: {
                                type: 'string',
                                description: 'Departamento principal al que asignar (SALES, SUPPORT, PERSONAL o cualquier nombre de departamento personalizado configurado).'
                            },
                            subdepartamento: {
                                type: 'string',
                                description: 'Nicho específico o subdepartamento (solo si está en la lista de Subdepartamentos Disponibles). Opcional.'
                            },
                            razon: { type: 'string', description: 'Breve explicación de por qué se transfiere la conversación.' }
                        },
                        required: ['departamento']
                    }
                },
                {
                    name: 'log_pending_question',
                    description: 'Manda una pregunta que el bot no sabe responder a una lista de espera para que un humano la responda más tarde. Úsala cuando no encuentres la información en el contexto de entrenamiento y el usuario parezca querer una respuesta oficial.',
                    parameters: {
                        type: 'object',
                        properties: {
                            pregunta: { type: 'string', description: 'La pregunta específica del usuario que no se pudo responder.' }
                        },
                        required: ['pregunta']
                    }
                }
            );

            if ((agent as any).proactiveFollowUps) {
                tools.push({
                    name: 'programar_seguimiento',
                    description: 'Programa que envíes un mensaje de seguimiento proactivo a este usuario en el futuro. Úsalo SIEMPRE que un usuario diga "te aviso mañana", "luego te mando X", o cuando quede una acción pendiente de su parte para incentivar la venta.',
                    parameters: {
                        type: 'object',
                        properties: {
                            motivo: { type: 'string', description: 'Instrucciones para el futuro tú sobre por qué revisar esto y de qué hablar con el usuario (ej: "Preguntarle si ya encontró su recibo de pago para continuar la compra").' }
                        },
                        required: ['motivo']
                    }
                });
            }

            // Setup Custom Fields in Tool Schema
            const updateContactTool = tools.find(t => t.name === 'update_contact');
            if (updateContactTool && (agent as any).customFieldDefinitions && (agent as any).customFieldDefinitions.length > 0) {
                const updatesProps = updateContactTool.parameters.properties.updates.properties;
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

            if (hasNeon) {
                tools.push({
                    name: 'query_product_catalog',
                    description: 'Busca productos, precios y existencias en el catálogo de la empresa.',
                    parameters: {
                        type: 'object',
                        properties: {
                            searchTerm: { type: 'string', description: 'El producto o categoría a buscar.' }
                        },
                        required: ['searchTerm']
                    }
                });
            }

            if (hasZoho) {
                tools.push(
                    {
                        name: "create_zoho_lead",
                        description: "Crea o actualiza un Lead en Zoho CRM. Úsala INMEDIATAMENTE cuando el usuario mencione su nombre o email. Pon en 'Description' lo que el usuario está buscando.",
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
                        description: "Crea o actualiza un Lead/Oportunidad en Odoo CRM. Úsala INMEDIATAMENTE cuando el usuario mencione su nombre o email. Pon en 'description' lo que el usuario está buscando.",
                        parameters: {
                            type: "object",
                            properties: {
                                name: { type: "string", description: "Nombre del contacto o lead" },
                                email: { type: "string", description: "Email de contacto" },
                                phone: { type: "string", description: "Teléfono" },
                                description: { type: "string", description: "Notas adicionales sobre lo que busca el cliente" }
                            },
                            required: ["name"]
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

            if (hasHubSpot) {
                tools.push(
                    {
                        name: "create_hubspot_contact",
                        description: "Crea o actualiza un Contacto en HubSpot CRM. Úsala INMEDIATAMENTE cuando el usuario mencione su nombre o email. Pon en el campo 'description' lo que el usuario busca.",
                        parameters: {
                            type: "object",
                            properties: {
                                name: { type: "string", description: "Nombre completo del contacto" },
                                email: { type: "string", description: "Email de contacto" },
                                phone: { type: "string", description: "Teléfono" },
                                description: { type: "string", description: "Intereses o notas sobre el contacto" }
                            },
                            required: ["name"]
                        }
                    },
                    {
                        name: "add_hubspot_note",
                        description: "Añade una nota a la línea de tiempo del contacto en HubSpot.",
                        parameters: {
                            type: "object",
                            properties: {
                                noteContent: { type: "string", description: "Contenido de la nota" }
                            },
                            required: ["noteContent"]
                        }
                    },
                    {
                        name: "create_hubspot_deal",
                        description: "Crea un Trato (Deal) en HubSpot y lo asocia con el contacto actual.",
                        parameters: {
                            type: "object",
                            properties: {
                                name: { type: "string", description: "Nombre o descripción breve del trato (ej: 'Servicio Web - Andres')" },
                                amount: { type: "number", description: "Monto estimado del trato (si se menciona)" }
                            },
                            required: ["name"]
                        }
                    }
                );
            }

            if (hasAltaplaza) {
                tools.push(
                    {
                        name: "altaplaza_check_user",
                        description: "Verifica si un usuario existe en Altaplaza usando su cédula.",
                        parameters: {
                            type: "object",
                            properties: {
                                idCard: { type: "string", description: "Cédula del usuario" }
                            },
                            required: ["idCard"]
                        }
                    },
                    {
                        name: "altaplaza_register_user",
                        description: "Registra un nuevo usuario en Altaplaza.",
                        parameters: {
                            type: "object",
                            properties: {
                                firstName: { type: "string" },
                                lastName: { type: "string" },
                                email: { type: "string" },
                                idCard: { type: "string" },
                                birthDate: { type: "string", description: "AAAA-MM-DD" },
                                phone: { type: "string" },
                                neighborhood: { type: "string" }
                            },
                            required: ["firstName", "lastName", "email", "idCard", "birthDate"]
                        }
                    },
                    {
                        name: "altaplaza_register_invoice",
                        description: "Registra una factura en Altaplaza.",
                        parameters: {
                            type: "object",
                            properties: {
                                idCard: { type: "string" },
                                invoiceNumber: { type: "string" },
                                amount: { type: "number" },
                                storeName: { type: "string" },
                                imageUrl: { type: "string", description: "URL de la imagen de la factura. SI ya procesaste una imagen en turnos anteriores, usa esa misma URL que está en el historial." },
                                date: { type: "string", description: "AAAA-MM-DD" }
                            },
                            required: ["idCard", "invoiceNumber", "amount", "storeName"]
                        }
                    }
                );

                systemPrompt += `\nINSTRUCCIONES ALTAPLAZA (CRÍTICO):
                1. SI el usuario quiere registrar factura o ver puntos, pide cédula y usa 'altaplaza_check_user'. 
                2. LA RESPUESTA de 'altaplaza_check_user' incluye 'invoicesCount' y 'points'. Úsalos para saludar.
                3. SI no existe el usuario, regístralo con 'altaplaza_register_user'.
                4. PARA REGISTRAR FACTURAS (altaplaza_register_invoice):
                   - EXTRACCIÓN: Analiza la foto enviada por el usuario para extraer Monto, Tienda y Fecha.
                   - CONFIRMACIÓN: Pide al usuario que confirme si los datos extraídos son correctos.
                   - EJECUCIÓN: Una vez confirmado (ej: "Sí", "Correcto"), llama a 'altaplaza_register_invoice'.
                5. MEMORIA DE IMAGEN: Si ya hay una foto analizada en el historial, NO pidas la foto de nuevo. USA los datos que ya tienes.
                6. CÉDULA FALTANTE: Si el usuario confirma los datos pero aún no te ha dado su cédula (idCard), PÍDESELA ("Por favor, bríndame tu cédula para completar el registro"). NO pidas la foto en su lugar.
                7. REGLA DE ORO: Si ya viste la foto una vez, el parámetro 'imageUrl' debe ser la URL que está en el historial. NUNCA respondas diciendo que no ves la imagen si la URL está presente en los mensajes anteriores.\n`;
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

                        const geminiTools = tools.length > 0 ? [{
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

                        // Gemini startChat expects chronological history (Oldest -> Newest)
                        // EXCLUDE the current message (last one in history) to avoid duplication
                        const previousHistory = history.slice(0, -1);
                        const chatHistory = previousHistory.map((m: any) => {
                            const parts: any[] = [{
                                text: m.role === 'HUMAN'
                                    ? `[Intervención humana]: ${m.content}`
                                    : m.content
                            }];

                            // Add image if present in metadata
                            if (m.metadata && typeof m.metadata === 'object' && (m.metadata as any).type === 'image' && (m.metadata as any).url) {
                                // For history, we'll explicitly label the URL as the invoice image URL
                                parts.push({ text: `[URL DE IMAGEN DE FACTURA: ${(m.metadata as any).url}]` });
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
                            if (name === "generar_link_de_pago") {
                                console.log('[GEMINI] Tool generar_link_de_pago called with:', args);
                                try {
                                    const { createPaymentLinkInternal } = await import('@/lib/actions/payments');
                                    const res = await createPaymentLinkInternal({
                                        contactId: conversation.contactId!,
                                        workspaceId: workspace.id,
                                        amount: (args as any).amount,
                                        description: (args as any).description,
                                        gateway: (args as any).gateway as any
                                    });

                                    if (res.success) {
                                        toolResult = {
                                            success: true,
                                            paymentUrl: res.transaction?.paymentUrl,
                                            message: "Link de pago generado con éxito. Entrégalo al usuario."
                                        };
                                    } else {
                                        toolResult = { success: false, error: res.error };
                                    }
                                } catch (e: any) {
                                    console.error('[GEMINI] generar_link_de_pago error:', e);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "update_contact") {
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

                                        // Sync name & email to conversation if updated
                                        if (normalizedUpdates.name || normalizedUpdates.email) {
                                            const syncData: any = {};
                                            if (normalizedUpdates.name) syncData.contactName = normalizedUpdates.name;
                                            if (normalizedUpdates.email) syncData.contactEmail = normalizedUpdates.email;

                                            await prisma.conversation.update({
                                                where: { id: conversation.id },
                                                data: syncData
                                            });
                                            // Update local object
                                            if (syncData.contactName) conversation.contactName = syncData.contactName;
                                            if (syncData.contactEmail) conversation.contactEmail = syncData.contactEmail;
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
                            } else if (name === "asignar_a_humano") {
                                try {
                                    const dept = (args as any).departamento;
                                    const subDept = (args as any).subdepartamento;

                                    // Find members in this workspace with that department
                                    let members = await (prisma.workspaceMember as any).findMany({
                                        where: {
                                            workspaceId: workspace.id,
                                            department: dept as any,
                                            ...(subDept ? { subDepartment: { contains: subDept, mode: 'insensitive' } } : {})
                                        },
                                        include: {
                                            user: true
                                        }
                                    });

                                    // If subDept was provided but no member was found, fallback to department search
                                    if (subDept && members.length === 0) {
                                        members = await (prisma.workspaceMember as any).findMany({
                                            where: {
                                                workspaceId: workspace.id,
                                                department: dept as any
                                            },
                                            include: {
                                                user: true
                                            }
                                        });
                                    }

                                    // RE-FETCH conversation to ensure we have any contact info updated in this turn
                                    const refreshedConv = await prisma.conversation.findUnique({
                                        where: { id: conversation.id },
                                        include: { contact: true }
                                    });
                                    if (refreshedConv) {
                                        conversation.contactName = refreshedConv.contactName;
                                        conversation.contactEmail = refreshedConv.contactEmail;
                                        (conversation as any).contact = refreshedConv.contact;
                                    }

                                    if (members.length > 0) {
                                        // Pick first member (could be improved with better load balancing)
                                        const member = members[0];

                                        await prisma.conversation.update({
                                            where: { id: conversation.id },
                                            data: {
                                                assignedTo: member.userId,
                                                status: 'OPEN',
                                                isPaused: false // KEEP the bot active until human manually assumes control
                                            }
                                        });

                                        // Send Assignment Email & Push Notification
                                        try {
                                            const { sendAssignmentEmail } = await import('@/lib/email');
                                            const { sendAssignmentPushNotification } = await import('@/lib/push');
                                            const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
                                            const link = `${appUrl}/chat?id=${conversation.id}`;
                                            const intentSummary = (args as any).razon || `El bot ha asignado esta conversación al departamento de ${dept}.`;

                                            await sendAssignmentEmail(
                                                member.user.email,
                                                agent.name,
                                                workspace.name,
                                                member.user.name || member.user.email,
                                                link,
                                                {
                                                    name: conversation.contactName || 'Visitante',
                                                    email: conversation.contactEmail || 'No proporcionado',
                                                    phone: (conversation as any).contact?.phone || 'No proporcionado'
                                                },
                                                intentSummary
                                            );

                                            if ((member.user as any).fcmToken) {
                                                await sendAssignmentPushNotification(
                                                    (member.user as any).fcmToken,
                                                    member.user.name || member.user.email,
                                                    conversation.contactName || 'Visitante',
                                                    intentSummary,
                                                    conversation.id
                                                );
                                            }
                                        } catch (notifyErr) {
                                            console.error('[GEMINI] Error sending notifications:', notifyErr);
                                        }

                                        toolResult = {
                                            success: true,
                                            message: `Conversación reasignada exitosamente a ${member.user.name || member.user.email} (${dept}). El bot se ha pausado.`,
                                            assigned_to: member.user.name || member.user.email
                                        };
                                    } else {
                                        // FALLBACK: If no member found, check if it's a custom handoff target from "Ruteo Inteligente"
                                        const handoffTargets = (agent as any).handoffTargets;
                                        const customTarget = Array.isArray(handoffTargets)
                                            ? handoffTargets.find((t: any) => t.name.toLowerCase() === dept.toLowerCase())
                                            : null;

                                        if (customTarget) {
                                            // Send email notification (Legacy "Ruteo Inteligente" behavior)
                                            const { sendHandoffEmail } = await import('@/lib/email');
                                            const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
                                            const link = `${appUrl}/chat?id=${conversation.id}`;

                                            await sendHandoffEmail(
                                                customTarget.email,
                                                agent.name,
                                                workspace.name,
                                                link,
                                                {
                                                    name: conversation.contactName || 'Visitante',
                                                    email: conversation.contactEmail || undefined
                                                },
                                                `[Ruteo Inteligente: ${customTarget.name}] ${(args as any).razon || 'El bot ha solicitado transferencia.'}`
                                            );

                                            // Mark as PENDING or PAUSE so bot stops responding
                                            await prisma.conversation.update({
                                                where: { id: conversation.id },
                                                data: { isPaused: true, status: 'PENDING' }
                                            });

                                            toolResult = {
                                                success: true,
                                                message: `Se ha enviado una notificación al equipo de ${customTarget.name} (${customTarget.email}). Un agente te contactará pronto. El bot se ha pausado.`
                                            };
                                        } else {
                                            toolResult = {
                                                success: false,
                                                error: `No hay agentes disponibles ni destinos de ruteo configurados para "${dept}".`
                                            };
                                        }
                                    }
                                } catch (e: any) {
                                    console.error('[GEMINI] asignar_a_humano error:', e);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "log_pending_question") {
                                try {
                                    const question = (args as any).pregunta;
                                    await (prisma as any).pendingQuestion.create({
                                        data: {
                                            agentId: agent.id,
                                            question: question,
                                            visitorId: data.visitorId,
                                            conversationId: conversation.id,
                                            status: 'PENDING'
                                        }
                                    });
                                    toolResult = { success: true, message: "Pregunta enviada a la lista de espera exitosamente." };
                                } catch (e: any) {
                                    console.error('[GEMINI] log_pending_question error:', e);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "programar_seguimiento") {
                                try {
                                    const horas = (agent as any).followUpTimer || 23.99;
                                    const motivo = (args as any).motivo || 'Seguimiento automatizado';
                                    const scheduledDate = new Date();
                                    scheduledDate.setHours(scheduledDate.getHours() + horas);

                                    await (prisma as any).scheduledFollowUp.create({
                                        data: {
                                            agentId: agent.id,
                                            conversationId: conversation.id,
                                            channelId: channel.id,
                                            scheduledFor: scheduledDate,
                                            reason: motivo,
                                            status: 'PENDING'
                                        }
                                    });
                                    toolResult = { success: true, message: `Seguimiento programado con éxito para dentro de ${horas} horas.` };
                                } catch (e: any) {
                                    console.error('[GEMINI] programar_seguimiento error:', e);
                                    toolResult = { success: false, error: e.message };
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
                            } else if (name === "query_product_catalog") {
                                try {
                                    const { queryProductCatalog } = await import('@/lib/neon-catalog');
                                    const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                    const searchTerm = (args as any).searchTerm;
                                    const result = await queryProductCatalog(neonIntegration.configJson as any, searchTerm);
                                    await logIntegrationEvent(agent.id, 'NEON_CATALOG' as any, 'PRODUCT_QUERY', result.error ? 'ERROR' : 'SUCCESS', { searchTerm, count: result.results?.length });
                                    toolResult = result;
                                } catch (e: any) {
                                    console.error('[GEMINI] query_product_catalog error:', e);
                                    toolResult = { results: [], total: 0, error: e.message };
                                }
                            } else if (name === "altaplaza_check_user") {
                                try {
                                    const { checkUser } = await import('@/lib/altaplaza');
                                    const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                    const result = await checkUser((args as any).idCard);
                                    await logIntegrationEvent(agent.id, 'ALTAPLAZA' as any, 'CHECK_USER', 'SUCCESS', { idCard: (args as any).idCard });
                                    toolResult = result;
                                } catch (e: any) {
                                    console.error('[GEMINI] altaplaza_check_user error:', e);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "altaplaza_register_user") {
                                try {
                                    const { registerUser } = await import('@/lib/altaplaza');
                                    const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                    const result = await registerUser(args as any);
                                    await logIntegrationEvent(agent.id, 'ALTAPLAZA' as any, 'REGISTER_USER', 'SUCCESS', { email: (args as any).email });
                                    toolResult = result;
                                } catch (e: any) {
                                    console.error('[GEMINI] altaplaza_register_user error:', e);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "altaplaza_register_invoice") {
                                try {
                                    const { registerInvoice } = await import('@/lib/altaplaza');
                                    const { logIntegrationEvent } = await import('@/lib/integrations-logger');

                                    const invoiceArgs = args as any;

                                    // Robustness: If AI forgot the image URL, try to find the last image in the conversation
                                    if (!invoiceArgs.imageUrl) {
                                        console.log('[ALTAPLAZA] Image URL missing from AI arguments, searching history...');
                                        // Search from newest to oldest
                                        const lastImageMsg = [...history].reverse().find((m: any) =>
                                            m.metadata && typeof m.metadata === 'object' &&
                                            (m.metadata as any).type === 'image' && (m.metadata as any).url
                                        );
                                        if (lastImageMsg) {
                                            invoiceArgs.imageUrl = (lastImageMsg.metadata as any).url;
                                            console.log('[ALTAPLAZA] Automatically injected image URL:', invoiceArgs.imageUrl);
                                        }
                                    }

                                    const result = await registerInvoice(invoiceArgs);
                                    await logIntegrationEvent(agent.id, 'ALTAPLAZA' as any, 'REGISTER_INVOICE', 'SUCCESS', { invoiceNumber: invoiceArgs.invoiceNumber, imageUrl: invoiceArgs.imageUrl });
                                    toolResult = result;
                                } catch (e: any) {
                                    console.error('[GEMINI] altaplaza_register_invoice error:', e);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "create_zoho_lead") {
                                console.log('[GEMINI] Tool create_zoho_lead called with:', args);
                                try {
                                    const { createZohoLead } = await import('@/lib/zoho');

                                    // Retrieve stored Lead ID from metadata
                                    const meta = (conversation.metadata as any) || {};
                                    const currentLeadId = meta.zohoLeadId;

                                    const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                    const res = await createZohoLead(channel.agentId, args as any, currentLeadId);
                                    await logIntegrationEvent(channel.agentId, 'ZOHO', 'CREATE_LEAD', 'SUCCESS', { leadId: res.data?.[0]?.details?.id });

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
                                    const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                    const res = await addZohoNote(channel.agentId, leadId, (args as any).noteContent);
                                    await logIntegrationEvent(channel.agentId, 'ZOHO', 'ADD_NOTE', 'SUCCESS');
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
                                    const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                    const res = await createZohoTask(channel.agentId, leadId, args as any);
                                    await logIntegrationEvent(channel.agentId, 'ZOHO', 'CREATE_TASK', 'SUCCESS');
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
                                    const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                    const res = await scheduleZohoEvent(channel.agentId, leadId, args as any);
                                    await logIntegrationEvent(channel.agentId, 'ZOHO', 'SCHEDULE_EVENT', 'SUCCESS');
                                    toolResult = { success: true, api_response: res };
                                } catch (e: any) {
                                    console.error('[GEMINI] scheduleZohoEvent error:', e);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "create_odoo_lead") {
                                console.log('[GEMINI] Tool create_odoo_lead called with args:', JSON.stringify(args));
                                try {
                                    const { createOdooLead } = await import('@/lib/odoo');
                                    const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                    const meta = (conversation.metadata as any) || {};
                                    const currentLeadId = meta.odooLeadId;
                                    const res = await createOdooLead(channel.agentId, args as any, currentLeadId);
                                    await logIntegrationEvent(channel.agentId, 'ODOO', 'CREATE_LEAD', 'SUCCESS', { id: res.id });
                                    console.log('[GEMINI] createOdooLead result:', JSON.stringify(res));
                                    if (res.id && res.id !== currentLeadId) {
                                        await prisma.conversation.update({
                                            where: { id: conversation.id },
                                            data: { metadata: { ...meta, odooLeadId: res.id } }
                                        });
                                        conversation.metadata = { ...meta, odooLeadId: res.id };
                                    }
                                    toolResult = { success: true, api_response: res };
                                } catch (e: any) {
                                    console.error('[GEMINI] createOdooLead error:', e.message);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "add_odoo_note") {
                                console.log('[GEMINI] Tool add_odoo_note called');
                                try {
                                    const meta = (conversation.metadata as any) || {};
                                    const leadId = meta.odooLeadId;
                                    if (!leadId) throw new Error("No Lead ID found. Create a lead first.");
                                    const { addOdooNote } = await import('@/lib/odoo');
                                    const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                    const res = await addOdooNote(channel.agentId, leadId, (args as any).noteContent);
                                    await logIntegrationEvent(channel.agentId, 'ODOO', 'ADD_NOTE', 'SUCCESS');
                                    toolResult = { success: true, api_response: res };
                                } catch (e: any) {
                                    console.error('[GEMINI] addOdooNote error:', e);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "create_hubspot_contact") {
                                console.log('[GEMINI] Tool create_hubspot_contact called');
                                try {
                                    const { createHubSpotContact } = await import('@/lib/hubspot');
                                    const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                    const meta = (conversation.metadata as any) || {};
                                    const currentContactId = meta.hubspotContactId;
                                    const res = await createHubSpotContact(channel.agentId, args as any, currentContactId);
                                    await logIntegrationEvent(channel.agentId, 'HUBSPOT', 'CREATE_CONTACT', 'SUCCESS', { id: res.id });
                                    if (res.id && res.id !== currentContactId) {
                                        await prisma.conversation.update({
                                            where: { id: conversation.id },
                                            data: { metadata: { ...meta, hubspotContactId: res.id } }
                                        });
                                        conversation.metadata = { ...meta, hubspotContactId: res.id };
                                    }
                                    toolResult = { success: true, api_response: res };
                                } catch (e: any) {
                                    console.error('[GEMINI] createHubSpotContact error:', e.message);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "add_hubspot_note") {
                                console.log('[GEMINI] Tool add_hubspot_note called');
                                try {
                                    const meta = (conversation.metadata as any) || {};
                                    const contactId = meta.hubspotContactId;
                                    if (!contactId) throw new Error("No Contact ID found. Create a contact first.");
                                    const { addHubSpotNote } = await import('@/lib/hubspot');
                                    const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                    const res = await addHubSpotNote(channel.agentId, contactId, (args as any).noteContent);
                                    await logIntegrationEvent(channel.agentId, 'HUBSPOT', 'ADD_NOTE', 'SUCCESS');
                                    toolResult = { success: true, api_response: res };
                                } catch (e: any) {
                                    console.error('[GEMINI] addHubSpotNote error:', e.message);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "create_hubspot_deal") {
                                console.log('[GEMINI] Tool create_hubspot_deal called');
                                try {
                                    const meta = (conversation.metadata as any) || {};
                                    const contactId = meta.hubspotContactId;
                                    if (!contactId) throw new Error("No Contact ID found. Create a contact first.");
                                    const { createHubSpotDeal } = await import('@/lib/hubspot');
                                    const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                    const res = await createHubSpotDeal(channel.agentId, contactId, args as any);
                                    await logIntegrationEvent(channel.agentId, 'HUBSPOT', 'CREATE_DEAL', 'SUCCESS');
                                    toolResult = { success: true, api_response: res };
                                } catch (e: any) {
                                    console.error('[GEMINI] createHubSpotDeal error:', e.message);
                                    toolResult = { success: false, error: e.message };
                                }
                            } else if (name === "registrar_nps") {
                                console.log('[GEMINI] Tool registrar_nps called');
                                try {
                                    const { score, comment } = args as any;
                                    const validatedScore = Math.max(0, Math.min(10, Math.round(score)));
                                    await prisma.conversation.update({
                                        where: { id: conversation.id },
                                        data: { npsScore: validatedScore, npsComment: comment } as any
                                    });
                                    toolResult = { success: true, message: `Puntuación NPS ${validatedScore} registrada correctamente.` };
                                } catch (e: any) {
                                    console.error('[GEMINI] registrar_nps error:', e);
                                    toolResult = { success: false, error: "Error al registrar NPS." };
                                }
                            } else if (name === "finalizar_atencion") {
                                console.log('[GEMINI] Tool finalizar_atencion called');
                                try {
                                    // Check if NPS is enabled and not yet provided
                                    if ((agent as any).enableNPS && !(conversation as any).npsScore) {
                                        toolResult = {
                                            success: false,
                                            error: "La encuesta NPS está activa. DEBES preguntar al usuario su calificación del 0 al 10 antes de cerrar definitivamente."
                                        };
                                    } else {
                                        await prisma.conversation.update({
                                            where: { id: conversation.id },
                                            data: { status: 'CLOSED', assignedTo: null, assignedAt: null }
                                        });
                                        toolResult = { success: true, message: "Conversación cerrada correctamente." };
                                    }
                                } catch (e: any) {
                                    console.error('[GEMINI] finalizar_atencion error:', e);
                                    toolResult = { success: false, error: "Error al cerrar la conversación." };
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

                // OpenAI expects messages in chronological order (Oldest -> Newest)
                // EXCLUDE the current message (last one in history) to avoid duplication
                const previousHistory = history.slice(0, -1);
                const openAiMessages: any[] = [
                    { role: 'system', content: systemPrompt },
                    ...previousHistory.map((m: any) => {
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
                        if (name === "generar_link_de_pago") {
                            console.log('[OPENAI] Tool generar_link_de_pago called with:', args);
                            try {
                                const { createPaymentLinkInternal } = await import('@/lib/actions/payments');
                                const res = await createPaymentLinkInternal({
                                    contactId: conversation.contactId!,
                                    workspaceId: workspace.id,
                                    amount: args.amount,
                                    description: args.description,
                                    gateway: args.gateway as any
                                });

                                if (res.success) {
                                    toolResult = {
                                        success: true,
                                        paymentUrl: res.transaction?.paymentUrl,
                                        message: "Link de pago generado con éxito. Entrégalo al usuario."
                                    };
                                } else {
                                    toolResult = { success: false, error: res.error };
                                }
                            } catch (e: any) {
                                console.error('[OPENAI] generar_link_de_pago error:', e);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "update_contact") {
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

                                    // Sync standard fields to conversation if contact update SUCCEEDED
                                    if (result.success && (updates.name || updates.email)) {
                                        const syncData: any = {};
                                        if (updates.name) syncData.contactName = updates.name;
                                        if (updates.email) syncData.contactEmail = updates.email;

                                        await prisma.conversation.update({
                                            where: { id: conversation.id },
                                            data: syncData
                                        });

                                        // Update local object
                                        if (syncData.contactName) conversation.contactName = syncData.contactName;
                                        if (syncData.contactEmail) conversation.contactEmail = syncData.contactEmail;
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
                        } else if (name === "asignar_a_humano") {
                            try {
                                const dept = args.departamento;
                                const subDept = args.subdepartamento;

                                // Find members in this workspace with that department
                                let members = await (prisma.workspaceMember as any).findMany({
                                    where: {
                                        workspaceId: workspace.id,
                                        department: dept as any,
                                        ...(subDept ? { subDepartment: { contains: subDept, mode: 'insensitive' } } : {})
                                    },
                                    include: {
                                        user: true
                                    }
                                });

                                // If subDept was provided but no member was found, fallback to department search
                                if (subDept && members.length === 0) {
                                    members = await (prisma.workspaceMember as any).findMany({
                                        where: {
                                            workspaceId: workspace.id,
                                            department: dept as any
                                        },
                                        include: {
                                            user: true
                                        }
                                    });
                                }

                                // RE-FETCH conversation to ensure we have any contact info updated in this turn
                                const refreshedConv = await prisma.conversation.findUnique({
                                    where: { id: conversation.id },
                                    include: { contact: true }
                                });
                                if (refreshedConv) {
                                    conversation.contactName = refreshedConv.contactName;
                                    conversation.contactEmail = refreshedConv.contactEmail;
                                    (conversation as any).contact = refreshedConv.contact;
                                }

                                if (members.length > 0) {
                                    // Pick first member (could be improved with better load balancing)
                                    const member = members[0];

                                    await prisma.conversation.update({
                                        where: { id: conversation.id },
                                        data: {
                                            assignedTo: member.userId,
                                            status: 'OPEN',
                                            isPaused: false // KEEP the bot active until human manually assumes control
                                        }
                                    });

                                    // Send Assignment Email & Push Notification
                                    try {
                                        const { sendAssignmentEmail } = await import('@/lib/email');
                                        const { sendAssignmentPushNotification } = await import('@/lib/push');
                                        const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
                                        const link = `${appUrl}/chat?id=${conversation.id}`;
                                        const intentSummary = args.razon || `El bot ha asignado esta conversación al departamento de ${dept}.`;

                                        await sendAssignmentEmail(
                                            member.user.email,
                                            agent.name,
                                            workspace.name,
                                            member.user.name || member.user.email,
                                            link,
                                            {
                                                name: conversation.contactName || 'Visitante',
                                                email: conversation.contactEmail || 'No proporcionado',
                                                phone: (conversation as any).contact?.phone || 'No proporcionado'
                                            },
                                            intentSummary
                                        );

                                        if ((member.user as any).fcmToken) {
                                            await sendAssignmentPushNotification(
                                                (member.user as any).fcmToken,
                                                member.user.name || member.user.email,
                                                conversation.contactName || 'Visitante',
                                                intentSummary,
                                                conversation.id
                                            );
                                        }
                                    } catch (notifyErr) {
                                        console.error('[OPENAI] Error sending notifications:', notifyErr);
                                    }

                                    toolResult = {
                                        success: true,
                                        message: `Conversación reasignada exitosamente a ${member.user.name || member.user.email} (${dept}). Bot pausado.`,
                                        assigned_to: member.user.name || member.user.email
                                    };
                                } else {
                                    // FALLBACK: If no member found, check if it's a custom handoff target from "Ruteo Inteligente"
                                    const handoffTargets = (agent as any).handoffTargets;
                                    const customTarget = Array.isArray(handoffTargets)
                                        ? handoffTargets.find((t: any) => t.name.toLowerCase() === dept.toLowerCase())
                                        : null;

                                    if (customTarget) {
                                        // Send email notification (Legacy "Ruteo Inteligente" behavior)
                                        const { sendHandoffEmail } = await import('@/lib/email');
                                        const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
                                        const link = `${appUrl}/chat?id=${conversation.id}`;

                                        await sendHandoffEmail(
                                            customTarget.email,
                                            agent.name,
                                            workspace.name,
                                            link,
                                            {
                                                name: conversation.contactName || 'Visitante',
                                                email: conversation.contactEmail || undefined
                                            },
                                            `[Ruteo Inteligente: ${customTarget.name}] ${args.razon || 'El bot ha solicitado transferencia.'}`
                                        );

                                        // Mark as PENDING and PAUSE bot
                                        await prisma.conversation.update({
                                            where: { id: conversation.id },
                                            data: { isPaused: true, status: 'PENDING' }
                                        });

                                        toolResult = {
                                            success: true,
                                            message: `Se ha enviado una notificación al equipo de ${customTarget.name} (${customTarget.email}). Un agente te contactará pronto. Bot pausado.`
                                        };
                                    } else {
                                        toolResult = {
                                            success: false,
                                            error: `No hay agentes disponibles ni destinos de ruteo configurados para "${dept}".`
                                        };
                                    }
                                }
                            } catch (e: any) {
                                console.error('[OPENAI] asignar_a_humano error:', e);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "log_pending_question") {
                            try {
                                const question = args.pregunta;
                                // Cast to any to bypass type check before schema update
                                await (prisma as any).pendingQuestion.create({
                                    data: {
                                        agentId: agent.id,
                                        question: question,
                                        visitorId: data.visitorId,
                                        conversationId: conversation.id,
                                        status: 'PENDING'
                                    }
                                });
                                toolResult = { success: true, message: "Pregunta enviada a la lista de espera exitosamente." };
                            } catch (e: any) {
                                console.error('[OPENAI] log_pending_question error:', e);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "programar_seguimiento") {
                            try {
                                const horas = (agent as any).followUpTimer || 23.99;
                                const motivo = args.motivo || 'Seguimiento automatizado';
                                const scheduledDate = new Date();
                                scheduledDate.setHours(scheduledDate.getHours() + horas);

                                await (prisma as any).scheduledFollowUp.create({
                                    data: {
                                        agentId: agent.id,
                                        conversationId: conversation.id,
                                        channelId: channel.id,
                                        scheduledFor: scheduledDate,
                                        reason: motivo,
                                        status: 'PENDING'
                                    }
                                });
                                toolResult = { success: true, message: `Seguimiento programado con éxito para dentro de ${horas} horas.` };
                            } catch (e: any) {
                                console.error('[OPENAI] programar_seguimiento error:', e);
                                toolResult = { success: false, error: e.message };
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
                        } else if (name === "query_product_catalog") {
                            try {
                                const { queryProductCatalog } = await import('@/lib/neon-catalog');
                                const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                const searchTerm = args.searchTerm;
                                const result = await queryProductCatalog(neonIntegration.configJson as any, searchTerm);
                                await logIntegrationEvent(agent.id, 'NEON_CATALOG' as any, 'PRODUCT_QUERY', result.error ? 'ERROR' : 'SUCCESS', { searchTerm, count: result.results?.length });
                                toolResult = result;
                            } catch (e: any) {
                                console.error('[OPENAI] query_product_catalog error:', e);
                                toolResult = { results: [], total: 0, error: e.message };
                            }
                        } else if (name === "altaplaza_check_user") {
                            try {
                                const { checkUser } = await import('@/lib/altaplaza');
                                const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                const result = await checkUser((args as any).idCard);
                                await logIntegrationEvent(agent.id, 'ALTAPLAZA' as any, 'CHECK_USER', 'SUCCESS', { idCard: (args as any).idCard });
                                toolResult = result;
                            } catch (e: any) {
                                console.error('[OPENAI] altaplaza_check_user error:', e);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "altaplaza_register_user") {
                            try {
                                const { registerUser } = await import('@/lib/altaplaza');
                                const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                const result = await registerUser(args as any);
                                await logIntegrationEvent(agent.id, 'ALTAPLAZA' as any, 'REGISTER_USER', 'SUCCESS', { email: (args as any).email });
                                toolResult = result;
                            } catch (e: any) {
                                console.error('[OPENAI] altaplaza_register_user error:', e);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "altaplaza_register_invoice") {
                            try {
                                const { registerInvoice } = await import('@/lib/altaplaza');
                                const { logIntegrationEvent } = await import('@/lib/integrations-logger');

                                const invoiceArgs = args as any;

                                // Robustness: If AI forgot the image URL, try to find the last image in the conversation
                                if (!invoiceArgs.imageUrl) {
                                    console.log('[ALTAPLAZA] [OPENAI] Image URL missing, searching history...');
                                    const lastImageMsg = [...history].reverse().find((m: any) =>
                                        m.metadata && typeof m.metadata === 'object' &&
                                        (m.metadata as any).type === 'image' && (m.metadata as any).url
                                    );
                                    if (lastImageMsg) {
                                        invoiceArgs.imageUrl = (lastImageMsg.metadata as any).url;
                                        console.log('[ALTAPLAZA] [OPENAI] Injected URL:', invoiceArgs.imageUrl);
                                    }
                                }

                                const result = await registerInvoice(invoiceArgs);
                                await logIntegrationEvent(agent.id, 'ALTAPLAZA' as any, 'REGISTER_INVOICE', 'SUCCESS', { invoiceNumber: invoiceArgs.invoiceNumber, imageUrl: invoiceArgs.imageUrl });
                                toolResult = result;
                            } catch (e: any) {
                                console.error('[OPENAI] altaplaza_register_invoice error:', e);
                                toolResult = { success: false, error: e.message };
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
                                const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                const res = await addZohoNote(channel.agentId, leadId, (args as any).noteContent);
                                await logIntegrationEvent(channel.agentId, 'ZOHO', 'ADD_NOTE', 'SUCCESS');
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
                                const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                const res = await createZohoTask(channel.agentId, leadId, args as any);
                                await logIntegrationEvent(channel.agentId, 'ZOHO', 'CREATE_TASK', 'SUCCESS');
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
                                const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                const res = await scheduleZohoEvent(channel.agentId, leadId, args as any);
                                await logIntegrationEvent(channel.agentId, 'ZOHO', 'SCHEDULE_EVENT', 'SUCCESS');
                                toolResult = { success: true, api_response: res };
                            } catch (e: any) {
                                console.error('[OPENAI] scheduleZohoEvent error:', e);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "create_odoo_lead") {
                            console.log('[OPENAI] Tool create_odoo_lead called with args:', JSON.stringify(args));
                            try {
                                const { createOdooLead } = await import('@/lib/odoo');
                                const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                const meta = (conversation.metadata as any) || {};
                                const currentLeadId = meta.odooLeadId;
                                const res = await createOdooLead(channel.agentId, args as any, currentLeadId);
                                await logIntegrationEvent(channel.agentId, 'ODOO', 'CREATE_LEAD', 'SUCCESS', { id: res.id });
                                console.log('[OPENAI] createOdooLead result:', JSON.stringify(res));
                                if (res.id && res.id !== currentLeadId) {
                                    await prisma.conversation.update({
                                        where: { id: conversation.id },
                                        data: { metadata: { ...meta, odooLeadId: res.id } }
                                    });
                                    conversation.metadata = { ...meta, odooLeadId: res.id };
                                }
                                toolResult = { success: true, api_response: res };
                            } catch (e: any) {
                                console.error('[OPENAI] createOdooLead error:', e.message);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "add_odoo_note") {
                            console.log('[OPENAI] Tool add_odoo_note called');
                            try {
                                const meta = (conversation.metadata as any) || {};
                                const leadId = meta.odooLeadId;
                                if (!leadId) throw new Error("No Lead ID found. Create a lead first.");
                                const { addOdooNote } = await import('@/lib/odoo');
                                const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                const res = await addOdooNote(channel.agentId, leadId, (args as any).noteContent);
                                await logIntegrationEvent(channel.agentId, 'ODOO', 'ADD_NOTE', 'SUCCESS');
                                toolResult = { success: true, api_response: res };
                            } catch (e: any) {
                                console.error('[OPENAI] addOdooNote error:', e);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "create_hubspot_contact") {
                            console.log('[OPENAI] Tool create_hubspot_contact called');
                            try {
                                const { createHubSpotContact } = await import('@/lib/hubspot');
                                const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                const meta = (conversation.metadata as any) || {};
                                const currentContactId = meta.hubspotContactId;
                                const res = await createHubSpotContact(channel.agentId, args as any, currentContactId);
                                await logIntegrationEvent(channel.agentId, 'HUBSPOT', 'CREATE_CONTACT', 'SUCCESS', { id: res.id });
                                if (res.id && res.id !== currentContactId) {
                                    await prisma.conversation.update({
                                        where: { id: conversation.id },
                                        data: { metadata: { ...meta, hubspotContactId: res.id } }
                                    });
                                    conversation.metadata = { ...meta, hubspotContactId: res.id };
                                }
                                toolResult = { success: true, api_response: res };
                            } catch (e: any) {
                                console.error('[OPENAI] createHubSpotContact error:', e.message);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "add_hubspot_note") {
                            console.log('[OPENAI] Tool add_hubspot_note called');
                            try {
                                const meta = (conversation.metadata as any) || {};
                                const contactId = meta.hubspotContactId;
                                if (!contactId) throw new Error("No Contact ID found. Create a contact first.");
                                const { addHubSpotNote } = await import('@/lib/hubspot');
                                const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                const res = await addHubSpotNote(channel.agentId, contactId, (args as any).noteContent);
                                await logIntegrationEvent(channel.agentId, 'HUBSPOT', 'ADD_NOTE', 'SUCCESS');
                                toolResult = { success: true, api_response: res };
                            } catch (e: any) {
                                console.error('[OPENAI] addHubSpotNote error:', e.message);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "create_hubspot_deal") {
                            console.log('[OPENAI] Tool create_hubspot_deal called');
                            try {
                                const meta = (conversation.metadata as any) || {};
                                const contactId = meta.hubspotContactId;
                                if (!contactId) throw new Error("No Contact ID found. Create a contact first.");
                                const { createHubSpotDeal } = await import('@/lib/hubspot');
                                const { logIntegrationEvent } = await import('@/lib/integrations-logger');
                                const res = await createHubSpotDeal(channel.agentId, contactId, args as any);
                                await logIntegrationEvent(channel.agentId, 'HUBSPOT', 'CREATE_DEAL', 'SUCCESS');
                                toolResult = { success: true, api_response: res };
                            } catch (e: any) {
                                console.error('[OPENAI] createHubSpotDeal error:', e.message);
                                toolResult = { success: false, error: e.message };
                            }
                        } else if (name === "registrar_nps") {
                            console.log('[OPENAI] Tool registrar_nps called');
                            try {
                                const { score, comment } = args as any;
                                const validatedScore = Math.max(0, Math.min(10, Math.round(score)));
                                await prisma.conversation.update({
                                    where: { id: conversation.id },
                                    data: { npsScore: validatedScore, npsComment: comment } as any
                                });
                                toolResult = { success: true, message: `Puntuación NPS ${validatedScore} registrada correctamente.` };
                            } catch (e: any) {
                                console.error('[OPENAI] registrar_nps error:', e);
                                toolResult = { success: false, error: "Error al registrar NPS." };
                            }
                        } else if (name === "finalizar_atencion") {
                            console.log('[OPENAI] Tool finalizar_atencion called');
                            try {
                                if ((agent as any).enableNPS && !(conversation as any).npsScore) {
                                    toolResult = {
                                        success: false,
                                        error: "La encuesta NPS está activa. DEBES preguntar al usuario su calificación del 0 al 10 antes de cerrar definitivamente."
                                    };
                                } else {
                                    await prisma.conversation.update({
                                        where: { id: conversation.id },
                                        data: { status: 'CLOSED', assignedTo: null, assignedAt: null }
                                    });

                                    // AUTOMATIC INSIGHTS: Trigger on close (Forced)
                                    if (conversation.contactId) {
                                        const { generateContactInsights } = await import('@/lib/actions/contacts');
                                        generateContactInsights(conversation.contactId, true).catch(e => console.error('[AUTO-INSIGHTS] Error on close:', e));
                                    }

                                    toolResult = { success: true, message: "Conversación cerrada correctamente." };
                                }
                            } catch (e: any) {
                                console.error('[OPENAI] finalizar_atencion error:', e);
                                toolResult = { success: false, error: "Error al cerrar la conversación." };
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

            // 6.2 AUTOMATIC INSIGHTS: Trigger after 5 messages milestone
            if (conversation.contactId) {
                const msgCount = await prisma.message.count({ where: { conversationId: conversation.id } });
                const meta = (conversation.metadata as any) || {};

                if (msgCount >= 5 && !meta.milestoneInsightsGenerated) {
                    console.log(`[AUTO-INSIGHTS] Milestone reached (${msgCount} messages). Triggering generation...`);

                    // Mark as generated in metadata FIRST to avoid race conditions
                    await prisma.conversation.update({
                        where: { id: conversation.id },
                        data: {
                            metadata: {
                                ...meta,
                                milestoneInsightsGenerated: true
                            }
                        }
                    });

                    const { generateContactInsights } = await import('@/lib/actions/contacts');
                    generateContactInsights(conversation.contactId).catch(e => console.error('[AUTO-INSIGHTS] Milestone error:', e));
                }
            }

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

export async function getWidgetMessages(
    channelId: string,
    visitorId: string,
    isTest?: boolean,
    agentId?: string,
    lastMessageAt?: Date
) {
    try {
        const conversation = await prisma.conversation.findFirst({
            where: {
                channelId: isTest ? null : channelId,
                agentId: isTest ? agentId : undefined,
                externalId: visitorId
            },
            include: {
                messages: {
                    where: lastMessageAt ? {
                        createdAt: { gt: new Date(lastMessageAt) }
                    } : undefined,
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
