'use server'

import { prisma } from '@/lib/prisma'
import { generateEmbedding, cosineSimilarity } from '@/lib/ai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { Message } from '@prisma/client'
import { listAvailableSlots, createCalendarEvent } from '@/lib/google'

export async function testAgent(
    agentId: string,
    content: string,
    visitorId: string,
    history: { role: 'USER' | 'AGENT', content: string }[] = []
) {
    console.log(`[testAgent] Starting for agentId: ${agentId}`);
    try {
        // 1. Fetch base agent (safest query)
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            include: {
                workspace: { include: { creditBalance: true } },
                integrations: { where: { provider: 'GOOGLE_CALENDAR', enabled: true } }
                // customFieldDefinitions removed from here to prevent crash if client is outdated
            }
        })
        console.log(`[testAgent] Agent found: ${agent?.name}`);

        if (!agent) throw new Error("Agent not found")

        // NOTE: customFieldDefinitions and handoffTargets are disabled in test mode
        // until production database is migrated. Test mode will work with basic features only.
        const customFields: any[] = [];
        const handoffTargets: any[] = [];

        // 0. Resolve API Keys (Same logic as widget)
        let openaiKey = process.env.OPENAI_API_KEY
        let googleKey = process.env.GOOGLE_API_KEY

        if (!openaiKey || !googleKey) {
            console.log("[testAgent] Checking global config for keys...");
            try {
                const configs = await (prisma as any).globalConfig.findMany({
                    where: { key: { in: ['OPENAI_API_KEY', 'GOOGLE_API_KEY'] } }
                })
                if (!openaiKey) openaiKey = configs.find((c: any) => c.key === 'OPENAI_API_KEY')?.value
                if (!googleKey) googleKey = configs.find((c: any) => c.key === 'GOOGLE_API_KEY')?.value
            } catch (e) {
                console.warn("[testAgent] Could not fetch global config:", e);
            }
        }

        console.log(`[testAgent] Keys resolved - OpenAI: ${!!openaiKey}, Google: ${!!googleKey}`);

        if (googleKey) {
            const keyPreview = `${googleKey.substring(0, 8)}...${googleKey.substring(googleKey.length - 4)}`;
            console.log(`[testAgent] Google API Key preview: ${keyPreview}`);
            console.log(`[testAgent] Google API Key length: ${googleKey.length}`);
        }

        // CRITICAL: Check if we have the required API key for this agent's model
        const needsOpenAI = !agent.model.includes('gemini');
        const needsGoogle = agent.model.includes('gemini');

        if (needsOpenAI && !openaiKey) {
            return {
                agentMsg: {
                    content: "⚠️ Error de configuración: No se encontró la clave de OpenAI. Por favor, configura OPENAI_API_KEY en las variables de entorno de Vercel o en la configuración global."
                }
            };
        }

        if (needsGoogle && !googleKey) {
            return {
                agentMsg: {
                    content: "⚠️ Error de configuración: No se encontró la clave de Google AI. Por favor, configura GOOGLE_API_KEY en las variables de entorno de Vercel o en la configuración global."
                }
            };
        }

        // RAG Logic
        let context = ""
        try {
            console.log("[testAgent] Generating embedding for RAG...");
            const queryVector = await generateEmbedding(content)
            const chunks = await prisma.documentChunk.findMany({
                where: {
                    knowledgeSource: {
                        knowledgeBase: { agentId: agentId },
                        status: 'READY'
                    }
                }
            })

            const sortedChunks = chunks
                .map(chunk => ({
                    content: chunk.content,
                    similarity: cosineSimilarity(queryVector, chunk.embedding as number[])
                }))
                .filter(c => c.similarity > 0.4)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 5)

            context = sortedChunks.map(c => c.content).join("\n\n")
            console.log(`[testAgent] RAG Context found: ${sortedChunks.length} chunks`);
        } catch (e) {
            console.error("Test RAG Error:", e)
        }

        // ---------------------------------------------------------
        // SYSTEM PROMPT CONSTRUCTION (MATCHING llm.ts)
        // ---------------------------------------------------------

        const styleDescription = agent.communicationStyle === 'FORMAL' ? 'serio y profesional (FORMAL)' :
            agent.communicationStyle === 'CASUAL' ? 'amigable y cercano (DESENFADADO)' : 'equilibrado (NORMAL)';

        const currentTime = new Intl.DateTimeFormat('es-ES', {
            timeZone: agent.timezone || 'UTC',
            dateStyle: 'full',
            timeStyle: 'long'
        }).format(new Date());

        const calendarIntegration = agent.integrations[0];
        const hasCalendar = !!calendarIntegration;

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

CONOCIMIENTO ADICIONAL (ENTRENAMIENTO RAG):
${context || 'No hay fragmentos de entrenamiento específicos para esta consulta, básate en tu Identidad y Contexto Laboral.'}

INSTRUCCIONES DE EJECUCIÓN:
1. Tu comportamiento debe estar guiado PRIMERO por el "PROMPT DE COMPORTAMIENTO" y la "Descripción del Negocio".
2. Si el usuario ya te dio información (nombre, interés, etc.), ÚSALA para personalizar la respuesta. No preguntes lo que ya sabes.
3. Actúa siempre como un miembro experto de ${agent.jobCompany || 'la empresa'}.
4. Si la consulta se responde con el "Conocimiento Adicional", intégralo de forma natural.
5. Mantén el Estilo de Comunicación (${styleDescription}) en cada palabra.
`;

        // ADDED: Customer Fields & Contact Collection (Same as llm.ts)
        if (customFields.length > 0) {
            systemPrompt += 'TU OBJETIVO SECUNDARIO ES RECOLECTAR LA SIGUIENTE INFORMACIÓN DEL USUARIO:\n';
            customFields.forEach((field: any) => {
                let fieldDesc = `- ${field.label} (ID: "${field.key}"): ${field.description || 'Sin descripción'}`;
                if (field.type === 'SELECT' && field.options && field.options.length > 0) {
                    fieldDesc += ` [Opciones válidas: ${field.options.join(', ')}]`;
                }
                systemPrompt += fieldDesc + '\n';
            });
            systemPrompt += '\nCuando el usuario te proporcione esta información, USA LA HERRAMIENTA "update_contact" para guardarla.\n';
            systemPrompt += 'Para campos con Opciones válidas, DEBES ajustar la respuesta del usuario a una de las opciones exactas si es posible, o pedir clarificación.\n';
            systemPrompt += 'No seas intrusivo. Pregunta por estos datos de manera natural durante la conversación.\n\n';
        }

        systemPrompt += `
ADEMÁS, TU OBJETIVO PRINCIPAL ES IDENTIFICAR Y GUARDAR LOS SIGUIENTES DATOS DE CONTACTO SI EL USUARIO LOS MENCIONA:
- Nombre completo (key: "name")
- Correo electrónico (key: "email")
- Número de teléfono (key: "phone")

INSTRUCCIONES CRÍTICAS PARA DATOS DE CONTACTO:
1. SI el usuario menciona su nombre, email o teléfono espontáneamente, USA INMEDIATAMENTE la herramienta "update_contact".
2. ES MUY COMÚN que el usuario responda directamente a tus preguntas.
   - Si preguntaste "¿Cuál es tu nombre?" y el usuario responde con frases como "Soy Omar", "Es Omar", "Si soy omar", EXTRAE SOLO EL NOMBRE ("Omar") y guárdalo. ¡NO guardes "Soy Omar" completo!
   - Si preguntaste "¿Cuál es tu correo?" y el usuario responde "juan@gmail.com", ASUME que es su email y guárdalo.
   - Si preguntaste por el teléfono y responden "5551234", ASUME que es el teléfono y guárdalo.
3. NO esperes al final de la conversación. Guárdalo apenas lo tengas.
`;

        // ADDED: Human Handoff Protocol (Smart Routing disabled in test mode)
        if (agent.transferToHuman) {
            systemPrompt += `
HUMAN HANDOFF PROTOCOL (CRITICAL):
1. BEFORE calling 'escalate_to_human', you MUST verify you have the user's Name AND (Email OR Phone).
2. If these details are missing, POLITELY ASK FOR THEM: "Para transferirte con un especialista, necesito tu nombre y un medio de contacto (email o teléfono). ¿Me los podrías facilitar?"
3. Once you have the data (or if the user explicitly refuses but insists on transfer), THEN call 'escalate_to_human'.
4. Provide a clear summary of the user's request in the tool call.
`;
            // Smart Routing is disabled in test mode (requires schema migration)
        }


        // ---------------------------------------------------------
        // TOOLS DEFINITION
        // ---------------------------------------------------------

        // Base tools (Contact & Handoff)
        const activeTools: any[] = [
            {
                name: 'update_contact',
                description: 'Update the contact information with collected data.',
                parameters: {
                    type: 'object',
                    properties: {
                        updates: {
                            type: 'object',
                            description: 'Key-value pairs of data to update. Keys can be standard fields ("name", "email", "phone") or defined custom fields.'
                        }
                    },
                    required: ['updates']
                }
            },
            {
                name: 'escalate_to_human',
                description: 'Escalate the conversation to a human agent. USE ONLY AFTER COLLECTING USER CONTACT INFO (Name + Email/Phone) if possible.',
                parameters: {
                    type: 'object',
                    properties: {
                        summary: {
                            type: 'string',
                            description: 'Brief summary of the user\'s issue and why they need a human.'
                        },
                        departmentId: {
                            type: 'string',
                            description: 'The ID of the department to transfer to, based on user intent. Optional.'
                        }
                    },
                    required: ['summary']
                }
            }
        ];

        // Add Calendar tools if enabled
        if (hasCalendar) {
            activeTools.push(
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

        let replyContent = "..."

        if (agent.model.includes('gemini')) {
            if (!googleKey) throw new Error("Google API Key not configured")
            const genAI = new GoogleGenerativeAI(googleKey)

            // Build tools array
            const geminiTools = [{
                functionDeclarations: activeTools.map(t => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters
                }))
            }];

            // Try multiple variations of the agent's configured model
            const baseModel = agent.model; // e.g., "gemini-1.5-flash"
            const modelVariations = [
                `${baseModel}-001`,      // Try with -001 suffix first (production uses this)
                `${baseModel}-latest`,   // Try with -latest suffix
                baseModel,               // Try original name
            ];

            console.log(`[testAgent] Agent model: ${baseModel}, will try: ${modelVariations.join(', ')}`);

            let result: any = null;
            let lastError: any = null;
            let successfulModel = '';
            let chat: any = null; // Need this for tool call loop

            // Try each model variation
            for (const modelName of modelVariations) {
                try {
                    console.log(`[testAgent] Trying Gemini model: ${modelName}`);

                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        systemInstruction: systemPrompt,
                        generationConfig: { temperature: agent.temperature },
                        tools: geminiTools as any
                    });

                    const geminiHistory = history.map(h => ({
                        role: h.role === 'USER' ? 'user' : 'model',
                        parts: [{ text: h.content }]
                    }));

                    chat = model.startChat({ history: geminiHistory });

                    // This is where the error actually happens
                    result = await chat.sendMessage(content);

                    successfulModel = modelName;
                    console.log(`[testAgent] ✅ Successfully used model: ${modelName}`);
                    break; // Success!

                } catch (error: any) {
                    console.warn(`[testAgent] ❌ Failed with ${modelName}:`, error.message);
                    lastError = error;
                    result = null;
                    chat = null;
                }
            }

            if (!result) {
                // All Gemini variations failed - fallback to OpenAI (same as production widget)
                console.warn(`[testAgent] All Gemini models failed. Falling back to GPT-4o`);
                console.log(`[testAgent] Last Gemini error: ${lastError?.message}`);

                // Change model to GPT-4o for fallback
                agent.model = 'gpt-4o';
                // Continue to OpenAI logic below
            } else {
                // Gemini succeeded - handle tool calls for Gemini
                let call = result.response.functionCalls()?.[0];
                while (call) {
                    const { name, args } = call;
                    let toolResult = { success: true, message: "Action simulated in Test Mode." };

                    if (name === "revisar_disponibilidad") {
                        const slots = await listAvailableSlots(calendarIntegration.configJson, (args as any).fecha);
                        toolResult = { success: true, message: JSON.stringify(slots) };
                    } else if (name === "agendar_cita") {
                        const event = await createCalendarEvent(calendarIntegration.configJson, args as any);
                        toolResult = { success: true, message: "Cita agendada: " + JSON.stringify(event) };
                    } else if (name === 'escalate_to_human') {
                        toolResult = { success: true, message: "[TEST MODE] Handoff triggered. Email would be sent to appropriate department." };
                    } else if (name === 'update_contact') {
                        toolResult = { success: true, message: "[TEST MODE] Contact data collected." };
                    }

                    result = await chat.sendMessage([{
                        functionResponse: {
                            name,
                            response: { result: toolResult }
                        }
                    }]);
                    call = result.response.functionCalls()?.[0];
                }

                replyContent = result.response.text()
            }
        }

        if (!agent.model.includes('gemini')) {
            if (!openaiKey) throw new Error("OpenAI API Key not configured")
            const openai = new OpenAI({ apiKey: openaiKey })

            const openAiMessages: any[] = [
                { role: 'system', content: systemPrompt },
                ...history.map(h => ({
                    role: h.role === 'USER' ? 'user' : 'assistant',
                    content: h.content
                })),
                { role: 'user', content: content }
            ];

            const openAiTools = activeTools.map(t => ({
                type: 'function',
                function: t
            }));

            console.log(`[testAgent] Calling OpenAI model: ${agent.model}`);
            let completion = await openai.chat.completions.create({
                messages: openAiMessages,
                model: agent.model,
                temperature: agent.temperature,
                tools: openAiTools as any,
            })
            console.log("[testAgent] OpenAI Initial Response Received");
            let message = completion.choices[0].message;

            // Handle tool calls for OpenAI
            while (message.tool_calls) {
                openAiMessages.push(message);
                for (const toolCall of message.tool_calls as any[]) {
                    const { name, arguments: argsJson } = toolCall.function;
                    const args = JSON.parse(argsJson);
                    let toolResult: any = { success: true, message: "Action simulated in Test Mode." };

                    if (name === "revisar_disponibilidad") {
                        const slots = await listAvailableSlots(calendarIntegration.configJson, args.fecha);
                        toolResult = { success: true, message: JSON.stringify(slots) };
                    } else if (name === "agendar_cita") {
                        const event = await createCalendarEvent(calendarIntegration.configJson, args);
                        toolResult = { success: true, message: "Cita agendada: " + JSON.stringify(event) };
                    } else if (name === 'escalate_to_human') {
                        toolResult = { success: true, message: "[TEST MODE] Handoff triggered. Email would be sent to appropriate department." };
                    } else if (name === 'update_contact') {
                        toolResult = { success: true, message: "[TEST MODE] Contact data collected." };
                    }

                    openAiMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(toolResult) // Keep consistency
                    });
                }
                completion = await openai.chat.completions.create({
                    messages: openAiMessages,
                    model: agent.model,
                    temperature: agent.temperature,
                    tools: openAiTools as any,
                });
                message = completion.choices[0].message;
            }

            replyContent = message.content || '...'
        }

        return {
            agentMsg: { content: replyContent }
        }
    } catch (error) {
        console.error("[testAgent] Critical Error:", error);

        // CRITICAL: Never throw in Server Actions - always return serializable objects
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al procesar la solicitud';

        return {
            agentMsg: {
                content: `❌ Error del servidor: ${errorMessage}`
            }
        };
    }

}
