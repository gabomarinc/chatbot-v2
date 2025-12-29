'use server'

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { Message } from '@prisma/client';
import { generateEmbedding, cosineSimilarity } from '@/lib/ai';
import { listAvailableSlots, createCalendarEvent } from '@/lib/google';

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
                    integrations: { where: { provider: 'GOOGLE_CALENDAR', enabled: true } },
                    intents: { where: { enabled: true } }
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
        },
        select: {
            id: true,
            agentId: true,
            channelId: true,
            externalId: true,
            contactName: true,
            contactEmail: true,
            status: true,
            lastMessageAt: true,
            assignedTo: true,
            assignedAt: true,
            createdAt: true
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

    const userMsg = await prisma.message.create({
        data: {
            conversationId: conversation.id,
            role: 'USER',
            content: messageContent, // Use messageContent which includes PDF text if applicable
            metadata: messageMetadata ? messageMetadata : undefined
        }
    })

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

    // 4.6. Check if conversation is handled by human
    // If assignedTo is not null, a human is handling it, so bot should NOT auto-respond
    if (conversation.assignedTo !== null) {
        console.log(`[HUMAN HANDLING] Conversation ${conversation.id} is handled by human ${conversation.assignedTo}, skipping bot response`);
        
        // Return without generating bot response
        return {
            userMsg: userMsg,
            agentMsg: null as any, // No bot response when human is handling
        };
    }

    // 5. Generate AI Response
    try {
        // Fetch recent history for context
        const history = await prisma.message.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: 'desc' },
            take: 10 // Last 10 messages
        });

        let replyContent = '...';
        let tokensUsed = 0;
        // Determine model to use: gpt-4o for images (has vision), otherwise use agent's configured model
        let modelUsedForLogging = model; // Default to agent's model
        if (!model.includes('gemini') && fileType === 'image' && imageBase64) {
            modelUsedForLogging = 'gpt-4o'; // Override for images when using OpenAI
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

        const calendarIntegration = agent.integrations[0];
        const hasCalendar = !!calendarIntegration;

        const systemPrompt = `IDENTIDAD Y CONTEXTO LABORAL (FUNDAMENTAL):
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

CONOCIMIENTO ADICIONAL (ENTRENAMIENTO RAG):
${context || 'No hay fragmentos de entrenamiento específicos para esta consulta, básate en tu Identidad y Contexto Laboral.'}

INSTRUCCIONES DE EJECUCIÓN:
1. Tu comportamiento debe estar guiado PRIMERO por el "PROMPT DE COMPORTAMIENTO" y la "Descripción del Negocio".
2. Posees MEMORIA de la conversación. Si el usuario ya se presentó o brindó información previamente en el historial, NO la vuelvas a pedir. Úsala para personalizar la charla.
3. Actúa siempre como un miembro experto de ${agent.jobCompany || 'la empresa'}.
4. Si la consulta se responde con el "Conocimiento Adicional", intégralo de forma natural.
5. Mantén el Estilo de Comunicación (${styleDescription}) en cada palabra.
6. EXTRACCIÓN DE DATOS: Si el usuario menciona su nombre o correo electrónico, extráelos y guárdalos internamente para personalizar futuras interacciones.
`;

        // Define tools for Calendar
        const tools: any[] = hasCalendar ? [
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
        ] : [];

        if (model.includes('gemini')) {
            // Google Gemini Logic
            if (!googleKey) throw new Error("Google API Key not configured");

            // Re-instantiate with correct key
            const currentGenAI = new GoogleGenerativeAI(googleKey);
            const geminiModelName = "gemini-1.5-flash";

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
                const parts: any[] = [{ text: m.role === 'HUMAN' 
                    ? `[Intervención humana]: ${m.content}`
                    : m.content }];
                
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
            let result = await chat.sendMessage(messageParts);
            console.log('[GEMINI] Response received');

            // Handle tool calls for Gemini
            let call = result.response.functionCalls()?.[0];
            while (call) {
                const { name, args } = call;
                let toolResult;
                if (name === "revisar_disponibilidad") {
                    toolResult = await listAvailableSlots(calendarIntegration.configJson, (args as any).fecha);
                } else if (name === "agendar_cita") {
                    toolResult = await createCalendarEvent(calendarIntegration.configJson, args as any);
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

        } else {
            // OpenAI Logic (Default)
            if (!openaiKey) throw new Error("OpenAI API Key not configured");

            const currentOpenAI = new OpenAI({ apiKey: openaiKey });

            const openAiMessages: any[] = [
                { role: 'system', content: systemPrompt },
                ...history.reverse().map((m: Message) => {
                    const baseMessage: any = {
                        role: m.role === 'USER' ? 'user' : 'assistant',
                        content: m.role === 'HUMAN' 
                            ? `[Intervención humana]: ${m.content}`
                            : m.content
                    };
                    
                    // If message has image metadata, reference it (can't load old images in history easily)
                    if (m.metadata && typeof m.metadata === 'object' && (m.metadata as any).type === 'image') {
                        baseMessage.content = `${baseMessage.content}\n[Imagen adjunta anteriormente]`;
                    }
                    
                    return baseMessage;
                }),
                (() => {
                    // If image is present, use multimodal format
                    if (fileType === 'image' && imageBase64) {
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
                                        url: imageBase64 // OpenAI accepts data URLs directly
                                    }
                                }
                            ]
                        };
                    }
                    
                    // For PDFs or text only, use simple text format (PDF text is already in messageContent)
                    return { role: 'user', content: messageContent };
                })()
            ];

            const openAiTools = hasCalendar ? tools.map(t => ({
                type: 'function',
                function: t
            })) : undefined;

            // Use gpt-4o for images (has vision), gpt-4o-mini for text only (modelUsedForLogging already set above)
            const modelToUse = modelUsedForLogging;
            
            console.log('[OPENAI] Sending request with model:', modelToUse, 'messages:', openAiMessages.length);
            let completion = await currentOpenAI.chat.completions.create({
                messages: openAiMessages as any,
                model: modelToUse,
                temperature: agent.temperature,
                tools: openAiTools as any,
            });
            console.log('[OPENAI] Response received');

            let message = completion.choices[0].message;

            // Handle tool calls for OpenAI
            while (message.tool_calls) {
                openAiMessages.push(message);
                for (const toolCall of message.tool_calls as any[]) {
                    const { name, arguments: argsJson } = toolCall.function;
                    const args = JSON.parse(argsJson);
                    let toolResult;
                    if (name === "revisar_disponibilidad") {
                        toolResult = await listAvailableSlots(calendarIntegration.configJson, args.fecha);
                    } else if (name === "agendar_cita") {
                        toolResult = await createCalendarEvent(calendarIntegration.configJson, args);
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

        // 6. Save Agent Message
        const agentMsg = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: 'AGENT',
                content: replyContent
            }
        });

        // 6.5. Extract contact info from user message (name and email)
        const extractedName = data.content.match(/(?:me llamo|mi nombre es|soy)\s+([A-ZáéíóúÁÉÍÓÚ][a-záéíóúÁÉÍÓÚ]+(?:\s+[A-ZáéíóúÁÉÍÓÚ][a-záéíóúÁÉÍÓÚ]+)*)/i);
        const extractedEmail = data.content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

        if (extractedName || extractedEmail) {
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                    ...(extractedName && { contactName: extractedName[1] }),
                    ...(extractedEmail && { contactEmail: extractedEmail[0] })
                }
            });
        }

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
                    : errorMessage.includes('API Key') || errorMessage.includes('not configured')
                    ? "Error de configuración del servidor. Por favor, contacta al administrador."
                    : errorMessage.includes('rate limit') || errorMessage.includes('429')
                    ? "Lo siento, estoy recibiendo demasiadas solicitudes. Por favor, espera un momento e intenta de nuevo."
                    : errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')
                    ? "Lo siento, la solicitud está tardando demasiado. Por favor, intenta de nuevo."
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
