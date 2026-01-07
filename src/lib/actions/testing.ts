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
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
            workspace: { include: { creditBalance: true } },
            integrations: { where: { provider: 'GOOGLE_CALENDAR', enabled: true } }
        }
    })

    if (!agent) throw new Error("Agent not found")

    // 0. Resolve API Keys (Same logic as widget)
    let openaiKey = process.env.OPENAI_API_KEY
    let googleKey = process.env.GOOGLE_API_KEY

    if (!openaiKey || !googleKey) {
        const configs = await (prisma as any).globalConfig.findMany({
            where: { key: { in: ['OPENAI_API_KEY', 'GOOGLE_API_KEY'] } }
        })
        if (!openaiKey) openaiKey = configs.find((c: any) => c.key === 'OPENAI_API_KEY')?.value
        if (!googleKey) googleKey = configs.find((c: any) => c.key === 'GOOGLE_API_KEY')?.value
    }

    // RAG Logic
    let context = ""
    try {
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
    } catch (e) {
        console.error("Test RAG Error:", e)
    }

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
2. Si el usuario ya te dio información (nombre, interés, etc.), ÚSALA para personalizar la respuesta. No preguntes lo que ya sabes.
3. Actúa siempre como un miembro experto de ${agent.jobCompany || 'la empresa'}.
4. Si la consulta se responde con el "Conocimiento Adicional", intégralo de forma natural.
5. Mantén el Estilo de Comunicación (${styleDescription}) en cada palabra.
`

    let replyContent = "..."

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

    if (agent.model.includes('gemini')) {
        if (!googleKey) throw new Error("Google API Key not configured")
        const genAI = new GoogleGenerativeAI(googleKey)
        const geminiTools = hasCalendar ? [{
            functionDeclarations: tools.map(t => ({
                name: t.name,
                description: t.description,
                parameters: t.parameters
            }))
        }] : undefined;

        // Apply same model mapping as widget.ts
        let geminiModelName = agent.model;
        if (agent.model === 'gemini-1.5-flash') {
            geminiModelName = 'gemini-1.5-flash-001';
        } else if (agent.model === 'gemini-1.5-pro') {
            geminiModelName = 'gemini-1.5-pro-001';
        }

        const model = genAI.getGenerativeModel({
            model: geminiModelName,
            systemInstruction: systemPrompt,
            generationConfig: { temperature: agent.temperature },
            tools: geminiTools as any
        })

        const geminiHistory = history.map(h => ({
            role: h.role === 'USER' ? 'user' : 'model',
            parts: [{ text: h.content }]
        }))

        const chat = model.startChat({ history: geminiHistory })
        let result = await chat.sendMessage(content)

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

        replyContent = result.response.text()
    } else {
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

        const openAiTools = hasCalendar ? tools.map(t => ({
            type: 'function',
            function: t
        })) : undefined;

        let completion = await openai.chat.completions.create({
            messages: openAiMessages,
            model: agent.model, // Use configured model instead of hardcoded
            temperature: agent.temperature,
            tools: openAiTools as any,
        })

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
            completion = await openai.chat.completions.create({
                messages: openAiMessages,
                model: agent.model, // Use configured model
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
}
