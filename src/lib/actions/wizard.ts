'use server'

import { prisma } from '@/lib/prisma'
import { load } from 'cheerio'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

// Interfaces
export interface WizardAnalysisResult {
    summary: string;
    questions: {
        id: string;
        text: string;
        options: string[];
    }[];
}

export interface WizardPersonalityOption {
    id: string; // 'A' | 'B'
    name: string; // e.g. "Vendedor Agresivo"
    description: string; // e.g. "Se enfocará en cerrar ventas rápidamente..."
    systemPrompt: string;
    temperature: number;
    communicationStyle: 'FORMAL' | 'CASUAL' | 'NORMAL';
}


async function getApiKeys() {
    let openaiKey = process.env.OPENAI_API_KEY;
    let googleKey = process.env.GOOGLE_API_KEY;

    if (!openaiKey || !googleKey) {
        const configs = await prisma.globalConfig.findMany({
            where: {
                key: { in: ['OPENAI_API_KEY', 'GOOGLE_API_KEY'] }
            }
        });
        if (!openaiKey) openaiKey = configs.find((c: any) => c.key === 'OPENAI_API_KEY')?.value;
        if (!googleKey) googleKey = configs.find((c: any) => c.key === 'GOOGLE_API_KEY')?.value;
    }
    return { openaiKey, googleKey };
}

// Helper to call LLM (tries Gemini first, falls back to OpenAI)
async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    const { openaiKey, googleKey } = await getApiKeys();

    // Try Gemini
    if (googleKey) {
        try {
            const genAI = new GoogleGenerativeAI(googleKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-pro",
                // Force JSON if possible via prompt, specific models support response_schema but flash works well with instruction
            });

            const result = await model.generateContent({
                contents: [
                    { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
                ]
            });
            return result.response.text();
        } catch (e) {
            console.error('Wizard: Gemini failed, falling back...', e);
        }
    }

    // Fallback OpenAI
    if (openaiKey) {
        const openai = new OpenAI({ apiKey: openaiKey });
        const completion = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: 'gpt-4o-mini',
            temperature: 0.7
        });
        return completion.choices[0].message.content || '';
    }

    throw new Error('No AI configured for Wizard');
}


export async function analyzeUrlAndGenerateQuestions(url: string, intent: string): Promise<WizardAnalysisResult> {
    // 1. Scrape URL
    // Ensure protocol exists
    let targetUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        targetUrl = `https://${url}`;
    }

    console.log(`[Wizard] Scraping ${targetUrl}...`);
    let textContent = "";
    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            signal: AbortSignal.timeout(15000) // Increased timeout to 15s
        });
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

        const html = await response.text();
        const $ = load(html);
        $('script, style, noscript, svg, nav, footer, header').remove(); // Remove navigation/footer noise
        textContent = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 12000); // Increased context limit
    } catch (e) {
        console.error('[Wizard] Scraping failed:', e);
        // Don't crash, just let the AI halluciation or default fallback happen if scraping fails but return "Not found" context
        // OR explicit error. Let's throw specific error for UI to handle?
        // Actually, for "Wizard", maybe we just want to warn?
        // But user specifically asked to analyze web. If web fails, we should tell them.
        throw new Error('No se pudo acceder al sitio web. Verifica la URL o que el sitio sea público.');
    }

    // 2. Generate Analysis and Questions
    const systemPrompt = `Eres un experto en configuración de Chatbots de IA para negocios.
Tu objetivo es analizar el contenido de un sitio web y generar:
1. Un resumen breve del negocio.
2. 3 preguntas estratégicas para definir la personalidad del bot.
3. Para cada pregunta, sugiere 2 o 3 respuestas predefinidas (cortas) que cubran los casos más comunes.

Salida estrictamente en JSON:
{
  "summary": "Resumen del negocio...",
  "questions": [
    { 
      "id": "q1", 
      "text": "¿Pregunta 1?", 
      "options": ["Opción A", "Opción B"] 
    },
    ...
  ]
}`;

    const userPrompt = `Sitio Web Content: "${textContent}"
Intención del Bot: ${intent} (e.g. Ventas, Soporte)

Genera el JSON de análisis. Las preguntas y opciones deben ayudar a decidir el tono y comportamiento del bot.`;

    let rawJson = "";
    try {
        rawJson = await callLLM(systemPrompt, userPrompt);
    } catch (error) {
        console.error('[Wizard] LLM Generation failed:', error);
        // Fallback or rethrow if strictly needed, but better to return default than crash
        return {
            summary: "No se pudo generar un análisis automático debido a un error de conexión con la IA.",
            questions: [
                { id: "q1", text: "¿Cuál es el tono de voz de tu marca?", options: ["Formal y serio", "Amigable y cercano", "Enérgico"] },
                { id: "q2", text: "¿Qué información es la más crítica para tus clientes?", options: ["Precios y Costos", "Características Técnicas", "Garantías"] },
                { id: "q3", text: "¿Cómo manejas las objeciones de venta?", options: ["Ofrecer descuentos", "Explicar valor", "Redirigir a humano"] }
            ]
        };
    }

    const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed = JSON.parse(cleanJson);
        return parsed as WizardAnalysisResult;
    } catch (e) {
        console.error('[Wizard] JSON Parse error:', e);
        // Fallback default
        return {
            summary: "No se pudo generar un resumen automático.",
            questions: [
                { id: "q1", text: "¿Cuál es el tono de voz de tu marca?", options: ["Formal", "Casual"] },
                { id: "q2", text: "¿Qué prioridad debe tener el bot?", options: ["Vender", "Informar"] },
                { id: "q3", text: "¿Nivel de tecnicismo?", options: ["Alto", "Bajo"] }
            ]
        };
    }
}


export async function generateAgentPersonalities(
    webSummary: string,
    answers: { question: string, answer: string }[],
    intent: string,
    agentName: string
): Promise<WizardPersonalityOption[]> {

    const systemPrompt = `Eres un arquitecto de Prompts para IA. 
Tu tarea es diseñar 2 personalidades distintas para un Chatbot llamado "${agentName}" basado en las respuestas del usuario.

Salida estrictamente en JSON (Array de 2 opciones).
Para "systemPrompt": USA EL PLADEHOLDER "{AGENT_NAME}" para referirte al nombre del agente. NO digas "Eres un Chatbot", di "Eres {AGENT_NAME}...".

JSON Schema:
[
  {
    "id": "A",
    "name": "Nombre de la Personalidad (Ej: Consultor Experto)",
    "description": "Descripción DETALLADA de 2-3 lineas sobre cómo se comportará, su tono, y cómo abordará al usuario.",
    "systemPrompt": "El Prompt de Sistema COMPLETO...",
    "temperature": 0.3,
    "communicationStyle": "FORMAL" // Valores permitidos: FORMAL, CASUAL, NORMAL
  },
  {
    "id": "B", 
     ...
  }
]`;

    const qaText = answers.map(a => `P: ${a.question}\nR: ${a.answer}`).join('\n');
    const userPrompt = `Contexto del Negocio: ${webSummary}
Intención: ${intent}
Entrevista de Configuración:
${qaText}

Genera 2 opciones contrastantes pero útiles para "${agentName}".`;

    const rawJson = await callLLM(systemPrompt, userPrompt);
    const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed = JSON.parse(cleanJson);
        // Replace placeholder validation if needed, but Prompt usually handles it.
        // Also ensure description is long enough?
        return parsed as WizardPersonalityOption[];
    } catch (e) {
        console.error('[Wizard] Personality Gen error:', e);
        // Fallback
        return [
            {
                id: 'A',
                name: "Estándar Profesional",
                description: "Un asistente equilibrado y profesional que prioriza la claridad y la eficiencia en cada respuesta.",
                systemPrompt: `Eres ${agentName}, un asistente virtual profesional...`,
                temperature: 0.5,
                communicationStyle: 'NORMAL'
            },
            {
                id: 'B',
                name: "Asesor Amigable",
                description: "Un asistente con tono cercano, cálido y empático, diseñado para conectar emocionalmente con el usuario.",
                systemPrompt: `Eres ${agentName}, un asistente virtual amigable...`,
                temperature: 0.7,
                communicationStyle: 'CASUAL'
            }
        ];
    }
}

export async function createAgentFromWizard(data: {
    name: string,
    intent: string,
    knowledge: {
        type: 'WEB' | 'PDF' | 'TEXT';
        source: string | File;
        personality?: WizardPersonalityOption;
        fileName?: string;
        analysisSummary?: string;
    },
    channels: {
        web: boolean;
        whatsapp: boolean;
        instagram: boolean;
    },
    allowEmojis?: boolean;
    webConfig?: {
        title: string;
        welcomeMessage: string;
        primaryColor: string;
    };
}) {
    try {
        // 1. Create Base Agent
        const personality = data.knowledge.personality;
        const { createAgent } = await import('./dashboard');
        const { addKnowledgeSource } = await import('./knowledge');

        // Map intent to JobType
        let jobType: 'SALES' | 'SUPPORT' | 'PERSONAL' = 'PERSONAL';
        const normalizedIntent = data.intent.toUpperCase();
        if (normalizedIntent.includes('VENTA') || normalizedIntent.includes('COMERCIAL') || normalizedIntent.includes('SALES')) jobType = 'SALES';
        else if (normalizedIntent.includes('SOPORTE') || normalizedIntent.includes('ATENCIÓN') || normalizedIntent.includes('SUPPORT') || normalizedIntent.includes('SERVICE')) jobType = 'SUPPORT';

        // Sanitize Communication Style
        let commStyle: 'NORMAL' | 'CASUAL' | 'FORMAL' = 'NORMAL';
        const rawStyle = (personality?.communicationStyle || 'NORMAL').toUpperCase();

        if (rawStyle.includes('CASUAL') || rawStyle.includes('CERCANO') || rawStyle.includes('AMIGABLE')) commStyle = 'CASUAL';
        else if (rawStyle.includes('FORMAL') || rawStyle.includes('SERIO')) commStyle = 'FORMAL';
        else commStyle = 'NORMAL';

        // Extract extra fields (Website, Company)
        let jobWebsiteUrl: string | null = null;
        let jobCompany: string | null = null;
        if (data.knowledge.type === 'WEB' && typeof data.knowledge.source === 'string') {
            jobWebsiteUrl = data.knowledge.source;
            try {
                const urlObj = new URL(jobWebsiteUrl.startsWith('http') ? jobWebsiteUrl : `https://${jobWebsiteUrl}`);
                const hostname = urlObj.hostname.replace('www.', '');
                jobCompany = hostname.split('.')[0];
                jobCompany = jobCompany.charAt(0).toUpperCase() + jobCompany.slice(1);
            } catch (e) { }
        }

        const jobDescription = data.knowledge.analysisSummary || `Agente de ${data.intent}`;

        const agent = await createAgent({
            name: data.name,
            jobDescription: jobDescription,
            jobCompany: jobCompany,
            jobWebsiteUrl: jobWebsiteUrl,
            model: 'gemini-1.5-flash',
            personalityPrompt: personality?.systemPrompt || `Eres ${data.name}, un asistente útil.`,
            jobType: jobType,
            temperature: personality?.temperature || 0.7,
            communicationStyle: commStyle,
            allowEmojis: data.allowEmojis ?? true,
            signMessages: false
        });

        if (!agent) throw new Error('Failed to create agent record');

        // 2. Add Knowledge Source
        // FIX: Map 'WEB' to 'WEBSITE' correctly
        let sourceType: 'TEXT' | 'WEBSITE' | 'VIDEO' | 'DOCUMENT' = 'TEXT';
        if (data.knowledge.type === 'WEB') sourceType = 'WEBSITE';
        else if (data.knowledge.type === 'PDF') sourceType = 'DOCUMENT';
        else sourceType = data.knowledge.type as any;

        let sourceData: any = {
            type: sourceType,
            updateInterval: 'NEVER',
            crawlSubpages: false
        };

        if (sourceType === 'WEBSITE') {
            // Ensure URL is string
            const sourceUrl = typeof data.knowledge.source === 'string' ? data.knowledge.source : '';
            if (!sourceUrl) console.warn("Website source URL is missing or invalid");

            sourceData.url = sourceUrl;
            sourceData.crawlSubpages = true;
        } else if (sourceType === 'TEXT') {
            sourceData.text = data.knowledge.source as string;
        } else if (sourceType === 'DOCUMENT') {
            sourceData.fileContent = data.knowledge.source as string;
            sourceData.fileName = data.knowledge.fileName || 'documento.pdf';
        }

        try {
            await addKnowledgeSource(agent.id, sourceData);
        } catch (sourceError) {
            console.error('Warning: Failed to add knowledge source during creation, but continuing:', sourceError);
        }

        // 3. Create Channels
        const channelsToCreate: any[] = [];

        // WEB
        if (data.channels.web) {
            const webConfig = data.webConfig || { title: '', welcomeMessage: '', primaryColor: '' };
            channelsToCreate.push({
                type: 'WEBCHAT',
                displayName: 'Chat Web',
                config: {
                    title: webConfig.title || agent.name, // Fallback to agent name
                    welcomeMessage: webConfig.welcomeMessage || '¡Hola! ¿En qué puedo ayudarte?',
                    primaryColor: webConfig.primaryColor || '#21AC96'
                }
            });
        }

        if (data.channels.whatsapp) channelsToCreate.push({ type: 'WHATSAPP', displayName: 'WhatsApp', config: {} });
        if (data.channels.instagram) channelsToCreate.push({ type: 'INSTAGRAM', displayName: 'Instagram', config: {} });

        for (const ch of channelsToCreate) {
            try {
                await prisma.channel.create({
                    data: {
                        agentId: agent.id,
                        type: ch.type as any,
                        displayName: ch.displayName,
                        isActive: true,
                        configJson: ch.config // SAVE CONFIG HERE
                    }
                });
            } catch (channelError) {
                console.error(`Failed to create channel ${ch.type}`, channelError);
                // Continue, don't fail entire agent
            }
        }

        return { success: true, data: agent };

    } catch (e: any) {
        console.error('Error in wizard creation flow:', e);
        return { success: false, error: e.message || 'Unknown error during creation' };
    }
}
