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
    console.log(`[Wizard] Scraping ${url}...`);
    let textContent = "";
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KonsulBot/1.0)' },
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) throw new Error('Failed to fetch');

        const html = await response.text();
        const $ = load(html);
        $('script, style, noscript, svg').remove();
        textContent = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000); // Limit context
    } catch (e) {
        console.error('[Wizard] Scraping failed:', e);
        throw new Error('No se pudo analizar el sitio web. Verifica la URL.');
    }

    // 2. Generate Analysis and Questions
    const systemPrompt = `Eres un experto en configuración de Chatbots de IA para negocios.
Tu objetivo es analizar el contenido de un sitio web y generar:
1. Un resumen breve del negocio.
2. 3 preguntas estratégicas para definir la personalidad del bot.

Salida estrictamente en JSON:
{
  "summary": "Resumen del negocio...",
  "questions": [
    { "id": "q1", "text": "¿Pregunta 1?" },
    { "id": "q2", "text": "¿Pregunta 2?" },
    { "id": "q3", "text": "¿Pregunta 3?" }
  ]
}`;

    const userPrompt = `Sitio Web Content: "${textContent}"
Intención del Bot: ${intent} (e.g. Ventas, Soporte)

Genera el JSON de análisis. Las preguntas deben ayudar a decidir si el bot debe ser más agresivo/pasivo, formal/casual, o técnico/simple.`;

    let rawJson = "";
    try {
        rawJson = await callLLM(systemPrompt, userPrompt);
    } catch (error) {
        console.error('[Wizard] LLM Generation failed:', error);
        // Fallback or rethrow if strictly needed, but better to return default than crash
        return {
            summary: "No se pudo generar un análisis automático debido a un error de conexión con la IA.",
            questions: [
                { id: "q1", text: "¿Cuál es el tono de voz de tu marca?" },
                { id: "q2", text: "¿Qué información es la más crítica para tus clientes?" },
                { id: "q3", text: "¿Cómo manejas las objeciones de venta?" }
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
                { id: "q1", text: "¿Cuál es el tono de voz de tu marca?" },
                { id: "q2", text: "¿Qué información es la más crítica para tus clientes?" },
                { id: "q3", text: "¿Cómo manejas las objeciones de venta?" }
            ]
        };
    }
}


export async function generateAgentPersonalities(
    webSummary: string,
    answers: { question: string, answer: string }[],
    intent: string
): Promise<WizardPersonalityOption[]> {

    const systemPrompt = `Eres un arquitecto de Prompts para IA. 
Tu tarea es diseñar 2 personalidades distintas para un Chatbot basado en las respuestas del usuario.

Salida estrictamente en JSON (Array de 2 opciones):
[
  {
    "id": "A",
    "name": "Nombre de la Personalidad (Ej: Consultor Experto)",
    "description": "Breve descripción de cómo se comportará...",
    "systemPrompt": "El Prompt de Sistema COMPLETO y detallado...",
    "temperature": 0.3,
    "communicationStyle": "FORMAL" 
  },
  {
    "id": "B", 
     ...
  }
]
Note: communicationStyle must be 'FORMAL', 'CASUAL', or 'NORMAL'.`;

    const qaText = answers.map(a => `P: ${a.question}\nR: ${a.answer}`).join('\n');
    const userPrompt = `Contexto del Negocio: ${webSummary}
Intención: ${intent}
Entrevista de Configuración:
${qaText}

Genera 2 opciones contrastantes pero útiles (ej: Una más orientado a cierre/ventas vs otra más orientada a asesoría/educación, o Formal vs Cercano).`;

    const rawJson = await callLLM(systemPrompt, userPrompt);
    const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed = JSON.parse(cleanJson);
        return parsed as WizardPersonalityOption[];
    } catch (e) {
        console.error('[Wizard] Personality Gen error:', e);
        // Fallback
        return [
            {
                id: 'A',
                name: "Estándar Profesional",
                description: "Un asistente equilibrado y profesional.",
                systemPrompt: "Eres un asistente virtual profesional...",
                temperature: 0.5,
                communicationStyle: 'NORMAL'
            },
            {
                id: 'B',
                name: "Asesor Amigable",
                description: "Un asistente con tono cercano y empático.",
                systemPrompt: "Eres un asistente virtual amigable...",
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
    },
    channels: {
        web: boolean;
        whatsapp: boolean;
        instagram: boolean;
    }
}) {
    // 1. Create Base Agent
    const personality = data.knowledge.personality;
    const { createAgent } = await import('./dashboard');
    const { addKnowledgeSource } = await import('./knowledge');

    const agent = await createAgent({
        name: data.name,
        description: `Agente de ${data.intent}`,
        model: 'gpt-4o-mini',
        systemPrompt: personality?.systemPrompt || 'Eres un asistente útil.',
        temperature: personality?.temperature || 0.7,
        isActive: true
    });

    if (!agent) throw new Error('Failed to create agent');

    try {
        // 2. Add Knowledge Source
        let sourceData: any = {
            type: data.knowledge.type === 'PDF' ? 'DOCUMENT' : data.knowledge.type,
            updateInterval: 'NEVER',
            crawlSubpages: false
        };

        if (data.knowledge.type === 'WEB') {
            sourceData.url = data.knowledge.source as string;
            sourceData.crawlSubpages = true;
        } else if (data.knowledge.type === 'TEXT') {
            sourceData.text = data.knowledge.source as string;
        } else if (data.knowledge.type === 'PDF') {
            sourceData.fileContent = data.knowledge.source as string; // Base64
            sourceData.fileName = data.knowledge.fileName || 'documento.pdf';
        }

        await addKnowledgeSource(agent.id, sourceData);

        // 3. Create Channels
        const channelsToCreate = [];
        if (data.channels.web) channelsToCreate.push({ type: 'WEBCHAT', displayName: 'Chat Web' });
        if (data.channels.whatsapp) channelsToCreate.push({ type: 'WHATSAPP', displayName: 'WhatsApp' });
        if (data.channels.instagram) channelsToCreate.push({ type: 'INSTAGRAM', displayName: 'Instagram' });

        for (const ch of channelsToCreate) {
            await prisma.channel.create({
                data: {
                    agentId: agent.id,
                    type: ch.type as any,
                    displayName: ch.displayName,
                    isActive: true,
                    configJson: {}
                }
            })
        }

        return agent;

    } catch (e) {
        console.error('Error in wizard creation flow:', e);
        throw e;
    }
}
