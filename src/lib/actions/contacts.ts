'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export interface FilterCondition {
    field: string; // "monthly_salary" or "city"
    operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'isSet' | 'isNotSet';
    value?: any;
}

export interface GetContactsOptions {
    workspaceId: string;
    filters?: FilterCondition[];
    page?: number;
    pageSize?: number;
}

export async function getContacts({ workspaceId, filters = [], page = 1, pageSize = 20 }: GetContactsOptions) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {
            workspaceId,
        };

        if (filters.length > 0) {
            // Build filter query array
            const jsonFilters = filters.map(filter => {
                const { field, operator, value } = filter;
                const lowerField = field.toLowerCase();
                const isStandardField = ['name', 'email', 'phone'].includes(lowerField);
                const isAgentField = lowerField === 'agentid';

                if (isAgentField) {
                    return { conversations: { some: { agentId: value } } };
                }

                if (isStandardField) {
                    // Standard Field Logic
                    if (operator === 'equals') {
                        return { [lowerField]: { equals: value, mode: 'insensitive' } };
                    } else if (operator === 'contains') {
                        return { [lowerField]: { contains: value, mode: 'insensitive' } };
                    } else if (operator === 'gt') {
                        return { [lowerField]: { gt: Number(value) } };
                    } else if (operator === 'lt') {
                        return { [lowerField]: { lt: Number(value) } };
                    } else if (operator === 'isSet') {
                        const standardConditions = [
                            { [lowerField]: { not: null } },
                            { [lowerField]: { not: '' } }
                        ];
                        if (lowerField === 'name') {
                            return {
                                AND: [
                                    { name: { not: null } },
                                    { name: { not: '' } },
                                    { NOT: { name: { contains: 'Visitante', mode: 'insensitive' } } }
                                ]
                            };
                        }
                        return { AND: standardConditions };
                    } else if (operator === 'isNotSet') {
                        return {
                            OR: [
                                { [lowerField]: null },
                                { [lowerField]: '' }
                            ]
                        };
                    }
                    return {};
                } else {
                    // Custom Field (JSONB) Logic
                    let jsonOp: any = {};
                    if (operator === 'equals') jsonOp = { equals: value };
                    else if (operator === 'contains') jsonOp = { string_contains: value };
                    else if (operator === 'gt') jsonOp = { gt: Number(value) };
                    else if (operator === 'lt') jsonOp = { lt: Number(value) };
                    else if (operator === 'isSet') jsonOp = { not: Prisma.JsonNull };
                    else if (operator === 'isNotSet') jsonOp = { equals: Prisma.JsonNull };

                    return {
                        customData: {
                            path: [field],
                            ...jsonOp
                        }
                    };
                }
            });

            if (jsonFilters.length > 0) {
                // Flatten any nested AND arrays to keep the query clean for Prisma
                where.AND = jsonFilters.flatMap(f => (f as any).AND ? (f as any).AND : [f]);
            }
        }

        await logDebug('[getContacts] Final Where Clause', where);

        const [contacts, total] = await Promise.all([
            prisma.contact.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    conversations: {
                        take: 1,
                        orderBy: { createdAt: 'desc' },
                        select: {
                            agent: {
                                select: { name: true }
                            }
                        }
                    },
                    _count: {
                        select: { conversations: true }
                    }
                }
            }),
            prisma.contact.count({ where })
        ]);

        return {
            contacts,
            total,
            totalPages: Math.ceil(total / pageSize),
            currentPage: page,
            success: true
        };
    } catch (error: any) {
        await logDebug('[getContacts] CRITICAL ERROR', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        console.error('[getContacts] Error:', error);
        return {
            contacts: [],
            total: 0,
            success: false,
            error: error.message || 'Error desconocido'
        };
    }
}
// Debug Logger Helper
async function logDebug(message: string, data?: any) {
    const fs = await import('fs');
    const path = await import('path');
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
    const logPath = '/tmp/chatbot-debug.log'; // Use tmp to avoid permission/cwd issues
    try {
        await fs.promises.appendFile(logPath, logLine);
    } catch (e) {
        // console.error("Failed to write to debug log", e);
    }
}

export async function updateContact(contactId: string, updates: Record<string, any>, workspaceId: string) {
    await logDebug('updateContact called', { contactId, updates, workspaceId });
    try {
        // 1. Fetch contact to verify existence and get current data
        const contact = await prisma.contact.findUnique({
            where: { id: contactId }
        });

        if (!contact) {
            await logDebug('Contact not found', { contactId });
            throw new Error('Contact not found');
        }

        // 2. Fetch custom fields definitions to validate
        const agents = await prisma.agent.findMany({
            where: { workspaceId },
            include: {
                customFieldDefinitions: true
            }
        });

        if (agents.length === 0) {
            await logDebug('No agents found for workspace', { workspaceId });
        }

        // Flatten all available fields in the workspace
        const allFields = agents.flatMap(a => a.customFieldDefinitions);
        const validKeys = new Set(allFields.map(f => f.key)); // Assuming keys in DB are case-sensitive but usually lowercase

        // Debug: Log valid keys
        await logDebug('Valid keys found', Array.from(validKeys));

        // 3. Filter updates
        const filteredUpdates: Record<string, any> = {};
        const standardUpdates: Record<string, any> = {};
        const standardFields = ['name', 'email', 'phone'];

        for (const [key, value] of Object.entries(updates)) {
            const lowerKey = key.toLowerCase();
            // Handle Standard Fields
            if (standardFields.includes(lowerKey)) {
                standardUpdates[lowerKey] = value;
            }
            // Handle Custom Fields (Robust Check)
            // convert validKeys to lowercase for comparison if needed, or rely on widget normalization
            else if (validKeys.has(key) || validKeys.has(lowerKey)) {
                // Prefer the exact key from validKeys if match found
                const exactKey = validKeys.has(key) ? key : lowerKey;
                filteredUpdates[exactKey] = value;
            } else {
                await logDebug('Dropping invalid key', { key, value, validKeys: Array.from(validKeys) });
            }
        }

        await logDebug('Prepared updates', { standardUpdates, filteredUpdates });

        // 4. Merge with existing data
        const currentData = (contact.customData as Record<string, any>) || {};
        const newData = { ...currentData, ...filteredUpdates };

        const updatedContact = await prisma.contact.update({
            where: { id: contactId },
            data: {
                customData: newData,
                ...standardUpdates
            }
        });

        await logDebug('Contact updated successfully', { id: updatedContact.id, name: updatedContact.name, customData: updatedContact.customData });

        return { success: true, contact: updatedContact };
    } catch (error) {
        await logDebug('Error updating contact', error);
        console.error('Error updating contact:', error);
        return { success: false, error: 'Failed to update contact' };
    }
}

export async function getContactDetail(contactId: string) {
    try {
        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
            include: {
                conversations: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        messages: {
                            orderBy: { createdAt: 'asc' }
                        },
                        agent: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        if (!contact) return { success: false, error: 'Contacto no encontrado' };

        return { success: true, contact };
    } catch (error: any) {
        console.error('Error fetching contact detail:', error);
        return { success: false, error: error.message };
    }
}

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateContactInsights(contactId: string) {
    try {
        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
            include: {
                conversations: {
                    include: {
                        messages: {
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                }
            }
        });

        if (!contact) throw new Error('Contacto no encontrado');

        const allMessages = contact.conversations.flatMap(c => c.messages);
        if (allMessages.length === 0) return { success: false, error: 'No hay mensajes para analizar' };

        const chatContext = allMessages
            .map(m => `${m.role === 'USER' ? 'Usuario' : 'Bot'}: ${m.content}`)
            .join('\n');

        let openaiKey = process.env.OPENAI_API_KEY;
        let googleKey = process.env.GOOGLE_API_KEY;

        if (!openaiKey || !googleKey) {
            const configs = await prisma.globalConfig.findMany({
                where: { key: { in: ['OPENAI_API_KEY', 'GOOGLE_API_KEY'] } }
            });
            if (!openaiKey) openaiKey = configs.find(c => c.key === 'OPENAI_API_KEY')?.value;
            if (!googleKey) googleKey = configs.find(c => c.key === 'GOOGLE_API_KEY')?.value;
        }

        const prompt = `Analiza la siguiente historia de conversación de un prospecto y genera un perfil detallado en formato JSON.
        
        CONVERSACIÓN:
        ${chatContext}
        
        Responde ÚNICAMENTE con un objeto JSON con esta estructura exacta:
        {
          "summary": "Un resumen biográfico corto (max 3 líneas)",
          "leadScore": (número del 1 al 100 basado en interés y cercanía al cierre),
          "aiInsights": {
            "interests": ["interés 1", "interés 2"],
            "problems": ["problema 1", "problema 2"],
            "sentiment": "predominante (positivo, neutral, frustrado)",
            "urgency": "nivel de urgencia (baja, media, alta)",
            "nextBestAction": "Sugerencia de lo que el agente debería hacer a continuación"
          }
        }`;

        let aiResponse = "";

        if (openaiKey) {
            const openai = new OpenAI({ apiKey: openaiKey });
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'system', content: prompt }],
                response_format: { type: "json_object" }
            });
            aiResponse = completion.choices[0].message.content || "{}";
        } else if (googleKey) {
            const genAI = new GoogleGenerativeAI(googleKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            aiResponse = result.response.text();
            // Basic JSON cleaning if Gemini returns markdown
            aiResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
        }

        const insights = JSON.parse(aiResponse);

        const updatedContact = await prisma.contact.update({
            where: { id: contactId },
            data: {
                summary: insights.summary,
                leadScore: insights.leadScore,
                aiInsights: insights.aiInsights,
                lastContactAt: allMessages[allMessages.length - 1].createdAt,
                activities: {
                    create: {
                        type: 'AI',
                        content: `Inteligencia AI actualizada. Lead Score: ${insights.leadScore}. Urgencia: ${insights.aiInsights.urgency}.`
                    }
                }
            }
        });

        revalidatePath('/contacts');
        return { success: true, contact: updatedContact };
    } catch (error: any) {
        console.error('Error generating insights:', error);
        return { success: false, error: error.message };
    }
}

export async function getContactsByIds(ids: string[]) {
    try {
        const contacts = await prisma.contact.findMany({
            where: {
                id: { in: ids }
            }
        });
        return { success: true, contacts };
    } catch (error: any) {
        console.error('Error fetching contacts by ids:', error);
        return { success: false, error: error.message };
    }
}

export async function addContactNote(contactId: string, content: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error('No autorizado');

        const activity = await prisma.contactActivity.create({
            data: {
                contactId,
                type: 'NOTE',
                content,
                userId: session.user.id
            },
            include: {
                user: {
                    select: { name: true, image: true }
                }
            }
        });

        revalidatePath('/contacts');
        return { success: true, activity };
    } catch (error: any) {
        console.error('Error adding contact note:', error);
        return { success: false, error: error.message };
    }
}
