'use server'

import { prisma } from '@/lib/prisma';
import { decryptFields } from '@/lib/crypto';
import OpenAI from 'openai';
import { getUserWorkspace } from './workspace';
import { auth } from '@/auth';

const SENSITIVE_INTEGRATION_FIELDS = ['apiKey', 'connectionString', 'apiSecret', 'password', 'token'];

export async function analyzeInbox(agentId: string) {
    try {
        const integration = await prisma.agentIntegration.findUnique({
            where: {
                agentId_provider: {
                    agentId,
                    provider: 'EMAIL_IMAP'
                }
            } as any
        });

        if (!integration || !integration.enabled) {
            throw new Error('La integración de correo no está activa.');
        }

        const config = decryptFields(integration.configJson as any, SENSITIVE_INTEGRATION_FIELDS);

        // Fetch emails via IMAP
        const { ImapFlow } = await import('imapflow');
        const client = new ImapFlow({
            host: config.host,
            port: parseInt(config.port),
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.password
            },
            logger: false
        });

        await client.connect();

        let lock = await client.getMailboxLock('INBOX');
        let emails = [];
        try {
            // Fetch messages - we use a generator to get all and take the last 30
            // This is safer for different IMAP server implementations
            const messages = [];
            for await (let message of client.fetch('1:*', {
                envelope: true,
            })) {
                messages.push(message);
            }

            // Take the last 30
            const lastMessages = messages.slice(-30).reverse();

            for (const message of lastMessages) {
                if (message.envelope) {
                    emails.push({
                        subject: message.envelope.subject || '(Sin asunto)',
                        from: message.envelope.from?.[0]?.address || 'Desconocido',
                        date: message.envelope.date || new Date(),
                    });
                }
            }
        } finally {
            lock.release();
        }
        await client.logout();

        if (emails.length === 0) {
            return { success: true, summary: "No se encontraron correos para analizar." };
        }

        // Process with AI
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = `Analiza la siguiente lista de correos electrónicos recientes y genera un resumen ejecutivo. 
        Enfoque: Identificar oportunidades comerciales, urgencias de clientes y temas recurrentes.
        
        Lista de correos:
        ${emails.map(e => `- De: ${e.from} | Asunto: ${e.subject} | Fecha: ${e.date}`).join('\n')}
        
        Reglas:
        - Responde en español.
        - Usa Markdown.
        - Sé conciso pero accionable.
        - Agrupa por categorías (Ventas, Soporte, Otros).`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                role: "system",
                content: "Eres un analista de negocios experto que revisa bandejas de entrada para extraer inteligencia operativa."
            }, {
                role: "user",
                content: prompt
            }],
            temperature: 0.3
        });

        const summary = response.choices[0].message.content;

        return { success: true, summary, emailCount: emails.length };
    } catch (error: any) {
        console.error('[EMAIL_ANALYSIS] Error:', error);
        return { success: false, error: error.message };
    }
}
export async function analyzeWorkspaceInbox() {
    try {
        const session = await auth();
        const workspace = await getUserWorkspace();
        if (!workspace || !session?.user?.id) throw new Error('No se encontró el workspace o usuario activo.');

        const integration = await (prisma as any).workspaceIntegration.findUnique({
            where: {
                workspaceId_userId_provider: {
                    workspaceId: workspace.id,
                    userId: session.user.id,
                    provider: 'EMAIL_IMAP'
                }
            }
        });

        if (!integration || !integration.enabled) {
            throw new Error('La integración de correo no está activa.');
        }

        const config = decryptFields(integration.configJson as any, SENSITIVE_INTEGRATION_FIELDS);
        const focusArea = config.focusArea || 'General';
        const goals = config.goals || 'Identificar temas importantes';

        // Fetch emails via IMAP
        const { ImapFlow } = await import('imapflow');
        const client = new ImapFlow({
            host: config.host,
            port: parseInt(config.port),
            secure: config.secure === true || config.secure === 'true',
            auth: {
                user: config.user,
                pass: config.password
            },
            logger: false
        });

        await client.connect();

        let lock = await client.getMailboxLock('INBOX');
        let emails = [];
        try {
            const messages = [];
            for await (let message of client.fetch('1:*', {
                envelope: true,
            })) {
                messages.push(message);
            }

            const lastMessages = messages.slice(-30).reverse();

            for (const message of lastMessages) {
                if (message.envelope) {
                    emails.push({
                        subject: message.envelope.subject || '(Sin asunto)',
                        from: message.envelope.from?.[0]?.address || 'Desconocido',
                        date: message.envelope.date || new Date(),
                    });
                }
            }
        } finally {
            lock.release();
        }
        await client.logout();

        if (emails.length === 0) {
            return { success: true, summary: "No se encontraron correos para analizar." };
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const prompt = `Analiza la siguiente lista de correos electrónicos recientes y genera un resumen ejecutivo. 
        
        CONTEXTO DEL NEGOCIO:
        - Área de Enfoque: ${focusArea}
        - Objetivos del Usuario: ${goals}
        
        Lista de correos:
        ${emails.map(e => `- De: ${e.from} | Asunto: ${e.subject} | Fecha: ${e.date}`).join('\n')}
        
        Reglas:
        - Responde en español.
        - Usa Markdown con jerarquía clara (## para secciones).
        - Sé extremadamente conciso pero accionable.
        - Prioriza los temas que coincidan con los objetivos: ${goals}.
        - Agrupa por categorías relevantes al área (${focusArea}): Ej: 🚀 Oportunidades, ⚠️ Urgencias, 📊 Seguimiento.
        - Usa negritas para entidades clave.
        - No incluyas correos genéricos o de spam.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                role: "system",
                content: "Eres un analista de negocios experto que revisa bandejas de entrada para extraer inteligencia operativa basada en objetivos específicos."
            }, {
                role: "user",
                content: prompt
            }],
            temperature: 0.3
        });

        const summary = response.choices[0].message.content;

        // Persist the analysis result in the database
        await (prisma as any).workspaceIntegration.update({
            where: {
                workspaceId_userId_provider: {
                    workspaceId: workspace.id,
                    userId: session.user.id,
                    provider: 'EMAIL_IMAP'
                }
            },
            data: {
                lastAnalysis: summary,
                lastAnalysisAt: new Date()
            }
        });

        return {
            success: true,
            summary,
            emailCount: emails.length,
            lastAnalysisAt: new Date()
        };
    } catch (error: any) {
        console.error('[WORKSPACE_EMAIL_ANALYSIS] Error:', error);
        return { success: false, error: error.message };
    }
}

export async function generateEmailRecommendations(bulletContext: string) {
    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                role: "system",
                content: "Eres un asistente ejecutivo experto. Tu tarea es analizar un punto específico de un resumen de correos y generar recomendaciones accionables y borradores de respuesta."
            }, {
                role: "user",
                content: `Basado en este punto: "${bulletContext}", genera una respuesta extremadamente directa:
                1. **Acciones Recomendadas Inmediatas** (2-3 puntos breves y accionables).
                2. **Borrador de Respuesta Profesional** (un borrador listo para copiar).
                
                No incluyas introducciones, ni "Análisis Rápido", ni conclusiones. Usa negritas para los títulos de sección. Responde en Markdown.`
            }],
            temperature: 0.7
        });

        return { success: true, content: response.choices[0].message.content };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

