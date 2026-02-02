'use server'

import { prisma } from '@/lib/prisma'
import { load } from 'cheerio'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { AGENT_TEMPLATES } from '@/lib/agent-templates';

// Interfaces
export interface WizardAnalysisResult {
    summary: string;
    detectedCompanyName?: string;
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

const DEFAULT_PROMPTS = {
    SALES: (name: string, company: string | null) => {
        const companyIntro = company ? ` de ${company}` : '';
        return `Eres ${name}, un experto asistente de ventas${companyIntro}.
Tu objetivo es captar clientes, entender sus necesidades y persuadirlos para cerrar ventas o conseguir sus datos.

Instrucciones de Comportamiento:
1. PRESÉNTATE SIEMPRE al inicio: "Hola, soy ${name}${companyIntro}..."
2. PREGUNTA EL NOMBRE del usuario en el primer turno para personalizar la charla.
3. IDENTIFICA LA NECESIDAD: Pregunta qué está buscando o en qué producto tiene interés.
4. DESTACA BENEFICIOS: No solo des características, explica cómo ${company || 'nuestra empresa'} resuelve su problema.
5. CIERRA LA VENTA: Si hay interés, pide el email/teléfono o invita a agendar una reunión. Sé proactivo.`;
    },

    SUPPORT: (name: string, company: string | null) => {
        const companyIntro = company ? ` de ${company}` : '';
        return `Eres ${name}, especialista de soporte técnico${companyIntro}.
Tu objetivo es resolver problemas técnicos de manera eficiente y empática.

Instrucciones de Comportamiento:
1. PRESÉNTATE: "Hola, soy ${name}${companyIntro}, ¿en qué puedo ayudarte hoy?"
2. DIAGNOSTICA: Pregunta "¿Qué problema estás experimentando?" o "¿Te aparece algún mensaje de error?".
3. PIDE DETALLES: Solicita capturas, versiones o pasos que realizó el usuario.
4. GUÍA PASO A PASO: Da instrucciones claras y numeradas.
5. VERIFICA: Al final, pregunta "¿Se ha solucionado el problema?" antes de despedirte.`;
    },

    SERVICE: (name: string, company: string | null) => {
        const companyIntro = company ? ` de ${company}` : '';
        return `Eres ${name}, asistente de atención al cliente${companyIntro}.
Tu objetivo es resolver dudas generales y brindar una excelente experiencia.

Instrucciones de Comportamiento:
1. PRESÉNTATE amablemente: "Soy ${name}${companyIntro}".
2. RESPONDE DIRECTO: Si preguntan horarios o ubicación, da la información exacta.
3. ANTICÍPATE: Si preguntan por envíos, menciona también los tiempos de entrega.
4. SÉ AMABLE: Usa emojis si aplica y mantén un tono servicial.
5. ESCALA SI ES NECESARIO: Si no sabes algo, ofrece conectar con un humano.`;
    },

    PERSONAL: (name: string, company: string | null) => {
        const companyIntro = company ? ` de ${company}` : '';
        return `Eres ${name}, asistente virtual profesional${companyIntro}.
Tu objetivo es asistir al usuario con la información de tu base de conocimientos.
Responde de manera precisa y útil.`;
    }
};

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
2. Identificar el nombre de la empresa.
   - PISTA CRÍTICA: Mira la URL/Dominio proporcionado. Si el dominio es "arrobapunto.com" y encuentras "Arrobapunto" en el texto (incluso en el footer o créditos), ESE es el nombre del negocio.
   - Ignora "Powered by" externos (ej: "Powered by Shopify"), pero si el "Powered by" coincide con el dominio, entonces ES la empresa.
3. 3 preguntas estratégicas para definir la personalidad del bot.
4. Para cada pregunta, sugiere 2 o 3 respuestas predefinidas (cortas) que cubran los casos más comunes.

Salida estrictamente en JSON:
{
  "summary": "Resumen del negocio...",
  "detectedCompanyName": "Nombre de la Empresa",
  "questions": [
    { 
      "id": "q1", 
      "text": "¿Pregunta 1?", 
      "options": ["Opción A", "Opción B"] 
    },
    ...
  ]
}`;

    const userPrompt = `Sitio Web URL: "${targetUrl}"
Sitio Web Content: "${textContent}"
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
    agentName: string,
    companyName?: string
): Promise<WizardPersonalityOption[]> {

    const companyContext = companyName ? `La empresa es: ${companyName}.` : '';

    const systemPrompt = `Eres un arquitecto de Prompts para IA. 
Tu tarea es diseñar 2 personalidades distintas para un Chatbot llamado "${agentName}" ${companyContext}.
Basado en las respuestas del usuario y la intención "${intent}".

IMPORTANTE: Debes generar instrucciones de comportamiento "AFILADAS" y específicas para el rol.
- Si es VENTAS: Debe presentarse, pedir nombre, identificar necesidad, vender beneficios y PEDIR EL CIERRE.
- Si es SOPORTE: Debe diagnosticar, pedir detalles técnicos, guiar paso a paso y confirmar solución.

Salida estrictamente en JSON (Array de 2 opciones).
Para "systemPrompt": USA EL PLADEHOLDER "{AGENT_NAME}" para referirte al nombre del agente.

JSON Schema:
[
  {
    "id": "A",
    "name": "Nombre de la Personalidad",
    "description": "Descripción DETALLADA...",
    "systemPrompt": "Eres {AGENT_NAME}... (Incluye: Objetivo, Tone of Voice, INSTRUCCIONES DE COMPORTAMIENTO numeradas y 2 EJEMPLOS DE CONVERSACIÓN)",
    "temperature": 0.3,
    "communicationStyle": "FORMAL"
  },
  ...
]`;

    const qaText = answers.map(a => `P: ${a.question}\nR: ${a.answer}`).join('\n');
    const userPrompt = `Contexto del Negocio: ${webSummary}
Intención: ${intent}
Nombre Empresa: ${companyName || 'No especificado'}
Entrevista de Configuración:
${qaText}

Genera 2 opciones contrastantes. ASEGÚRATE de incluir "Instrucciones de Comportamiento" y "Ejemplos de Conversación" en el systemPrompt.`;

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
    avatarUrl?: string | null;
    primarySource: {
        type: 'WEB';
        source: string;
        personality?: WizardPersonalityOption;
        analysisSummary?: string;
    };
    additionalSources: {
        templates: string[];
        pdf?: File | null;
    };
    channels: {
        web: boolean;
        whatsapp: boolean;
        instagram: boolean;
        messenger: boolean;
    },
    allowEmojis?: boolean;
    webConfig?: {
        title: string;
        welcomeMessage: string;
        primaryColor: string;
    };
    whatsappConfig?: {
        phoneNumberId: string;
        accessToken: string;
        verifyToken: string;
    };
}) {
    try {
        // 1. Create Base Agent
        const personality = data.primarySource.personality;
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

        // Extract extra fields (Website, Company) from primarySource
        let jobWebsiteUrl: string | null = null;
        let jobCompany: string | null = null;
        if (data.primarySource.type === 'WEB' && typeof data.primarySource.source === 'string') {
            jobWebsiteUrl = data.primarySource.source;
            try {
                const urlObj = new URL(jobWebsiteUrl.startsWith('http') ? jobWebsiteUrl : `https://${jobWebsiteUrl}`);
                const hostname = urlObj.hostname.replace('www.', '');
                jobCompany = hostname.split('.')[0];
                jobCompany = jobCompany.charAt(0).toUpperCase() + jobCompany.slice(1);
            } catch (e) { }
        }

        const jobDescription = data.primarySource.analysisSummary || `Agente de ${data.intent}`;

        // Determine default system prompt if not provided by personality generator
        let defaultPrompt = DEFAULT_PROMPTS.PERSONAL(data.name, jobCompany);
        if (jobType === 'SALES') defaultPrompt = DEFAULT_PROMPTS.SALES(data.name, jobCompany);
        else if (jobType === 'SUPPORT') defaultPrompt = DEFAULT_PROMPTS.SUPPORT(data.name, jobCompany);

        // Check for 'SERVICE' intent explicitly
        if (normalizedIntent.includes('ATENCIÓN') || normalizedIntent.includes('SERVICE')) {
            defaultPrompt = DEFAULT_PROMPTS.SERVICE(data.name, jobCompany);
        }

        const agent = await createAgent({
            name: data.name,
            jobDescription: jobDescription,
            jobCompany: jobCompany,
            jobWebsiteUrl: jobWebsiteUrl,
            model: 'gemini-1.5-flash',
            personalityPrompt: personality?.systemPrompt || defaultPrompt,
            jobType: jobType,
            temperature: personality?.temperature || 0.7,
            communicationStyle: commStyle,
            allowEmojis: data.allowEmojis ?? true,
            signMessages: false,
            avatarUrl: data.avatarUrl
        });

        if (!agent) throw new Error('Failed to create agent record');

        // 2. Add Knowledge Sources (Primary + Additional)

        // 2a. Add Primary Source (Web - always present)
        try {
            await addKnowledgeSource(agent.id, {
                type: 'WEBSITE',
                url: data.primarySource.source,
                updateInterval: 'NEVER',
                crawlSubpages: true
            });
        } catch (sourceError) {
            console.error('Warning: Failed to add primary web source:', sourceError);
        }

        // 2b. Add Templates (required - at least one)
        for (const templateId of data.additionalSources.templates) {
            const template = AGENT_TEMPLATES.find(t => t.id === templateId);
            if (template) {
                try {
                    await addKnowledgeSource(agent.id, {
                        type: 'TEXT',
                        text: template.systemPrompt,
                        updateInterval: 'NEVER',
                        crawlSubpages: false
                    });
                } catch (err) {
                    console.error(`Warning: Failed to add template ${templateId}:`, err);
                }
            }
        }

        // 2c. Add PDF (optional)
        if (data.additionalSources.pdf) {
            try {
                const reader = new FileReader();
                const base64Promise = new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(data.additionalSources.pdf!);
                });

                const base64Content = await base64Promise;

                await addKnowledgeSource(agent.id, {
                    type: 'DOCUMENT',
                    fileContent: base64Content,
                    fileName: data.additionalSources.pdf.name,
                    updateInterval: 'NEVER',
                    crawlSubpages: false
                });
            } catch (pdfError) {
                console.error('Warning: Failed to add PDF source:', pdfError);
            }
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

        if (data.channels.whatsapp) {
            // If config is provided (legacy or future), use it. Otherwise create empty/pending channel.
            const waConfig = data.whatsappConfig;
            channelsToCreate.push({
                type: 'WHATSAPP',
                displayName: 'WhatsApp',
                config: waConfig ? {
                    phoneNumberId: waConfig.phoneNumberId,
                    accessToken: waConfig.accessToken,
                    verifyToken: waConfig.verifyToken
                } : {}
            });
        }
        if (data.channels.instagram) channelsToCreate.push({ type: 'INSTAGRAM', displayName: 'Instagram', config: {} });
        if (data.channels.messenger) channelsToCreate.push({ type: 'MESSENGER', displayName: 'Messenger', config: {} });

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

        // 4. Return Agent ID and Web Channel ID
        const fullAgent = await prisma.agent.findUnique({
            where: { id: agent.id },
            include: { channels: true }
        });

        const webChannel = fullAgent?.channels.find(ch => ch.type === 'WEBCHAT');

        return {
            success: true,
            agentId: agent.id,
            webChannelId: webChannel?.id || null,
            data: fullAgent
        };

    } catch (e: any) {
        console.error('Error in wizard creation flow:', e);
        return { success: false, error: e.message || 'Unknown error during creation' };
    }



}

export async function updateAgentWizard(agentId: string, data: {
    channels: {
        web: boolean;
        whatsapp: boolean;
        instagram: boolean;
        messenger: boolean;
    };
    webConfig?: {
        title: string;
        welcomeMessage: string;
        primaryColor: string;
    };
}) {
    try {
        const { updateChannel, getChannels } = await import('./dashboard');
        // We need raw prisma access to find channels by agentId quickly or use getChannels
        // Let's use prisma directly for efficiency in this transactional-like operation
        const workspace = await (await import('./dashboard')).getUserWorkspace();
        if (!workspace) throw new Error("Unauthorized");

        const agent = await prisma.agent.findFirst({
            where: { id: agentId, workspaceId: workspace.id },
            include: { channels: true }
        });

        if (!agent) throw new Error("Agent not found");

        // 1. Update WEB config
        if (data.channels.web) {
            const webChannel = agent.channels.find(c => c.type === 'WEBCHAT');
            const webConfigData = {
                title: data.webConfig?.title || agent.name,
                welcomeMessage: data.webConfig?.welcomeMessage || '¡Hola! ¿En qué puedo ayudarte?',
                primaryColor: data.webConfig?.primaryColor || '#21AC96'
            };

            if (webChannel) {
                await prisma.channel.update({
                    where: { id: webChannel.id },
                    data: {
                        isActive: true,
                        configJson: webConfigData
                    }
                });
            } else {
                await prisma.channel.create({
                    data: {
                        agentId: agent.id,
                        type: 'WEBCHAT',
                        displayName: 'Chat Web',
                        isActive: true,
                        configJson: webConfigData
                    }
                });
            }
        } else {
            // El usuario desactivó el canal Web: Lo eliminamos para que el agente quede limpio
            const webChannel = agent.channels.find(c => c.type === 'WEBCHAT');
            if (webChannel) {
                await prisma.channel.delete({ where: { id: webChannel.id } });
            }
        }

        // 2. Ensure other channels exist/active state
        // For WhatsApp, Instagram, Messenger, we mainly check if they need to be active
        // Connection happens via Embedded Signup which creates the channel, but we ensure 'isActive' here.

        const ensureChannel = async (type: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER', displayName: string, shouldBeActive: boolean) => {
            const existing = agent.channels.find(c => c.type === type);
            if (shouldBeActive) {
                if (existing) {
                    if (!existing.isActive) await prisma.channel.update({ where: { id: existing.id }, data: { isActive: true } });
                } else {
                    // Create empty placeholder if it doesn't exist? 
                    // For the "Connect" flow, we prefer the connection to create it.
                    // BUT if user just toggles it ON in wizard but doesn't connect, should we create it?
                    // Yes, so it shows up in dashboard list as "Pending".
                    await prisma.channel.create({
                        data: {
                            agentId: agent.id,
                            type,
                            displayName,
                            isActive: true,
                            configJson: {}
                        }
                    });
                }
            } else {
                if (existing) await prisma.channel.update({ where: { id: existing.id }, data: { isActive: false } });
            }
        };

        await ensureChannel('WHATSAPP', 'WhatsApp', data.channels.whatsapp);
        await ensureChannel('INSTAGRAM', 'Instagram', data.channels.instagram);
        await ensureChannel('MESSENGER', 'Messenger', data.channels.messenger);

        return { success: true };

    } catch (e: any) {
        console.error('Wizard update error:', e);
        return { success: false, error: e.message };
    }
}
