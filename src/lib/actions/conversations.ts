'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getUserWorkspace } from './workspace'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { sendAssignmentEmail } from '@/lib/email'
import { sendAssignmentPushNotification } from '@/lib/push'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Helper to get Resend client
 */
function getResendClient() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY not configured');
    return new Resend(apiKey);
}

/**
 * Summarize conversation intent using AI
 */
async function summarizeIntent(messages: any[]) {
    try {
        let openaiKey = process.env.OPENAI_API_KEY;
        let googleKey = process.env.GOOGLE_API_KEY;

        if (!openaiKey || !googleKey) {
            const configs = await prisma.globalConfig.findMany({
                where: { key: { in: ['OPENAI_API_KEY', 'GOOGLE_API_KEY'] } }
            });
            if (!openaiKey) openaiKey = configs.find(c => c.key === 'OPENAI_API_KEY')?.value;
            if (!googleKey) googleKey = configs.find(c => c.key === 'GOOGLE_API_KEY')?.value;
        }

        const chatContext = messages
            .map(m => `${m.role === 'USER' ? 'Usuario' : 'Bot'}: ${m.content}`)
            .join('\n');

        const prompt = `Eres un asistente experto en resumir intenciones de clientes para equipos comerciales.
Tu tarea es leer la conversación y resumir en UNA SOLA LÍNEA corta y directa qué es lo que el usuario busca o cuál es su intención principal. No uses introducciones, ve al grano.

Ejemplo: "Ruben busca comprar un local comercial en la capital" o "Maria pregunta por precios de mantenimiento de software".

CONVERSACIÓN:
${chatContext}

RESUMEN (1 línea):`;

        if (openaiKey) {
            const openai = new OpenAI({ apiKey: openaiKey });
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'system', content: prompt }],
                max_tokens: 100,
                temperature: 0.3
            });
            return response.choices[0].message.content?.trim() || "No se pudo generar el resumen";
        } else if (googleKey) {
            const genAI = new GoogleGenerativeAI(googleKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            return result.response.text().trim() || "No se pudo generar el resumen";
        }

        return "IA no configurada para resúmenes.";
    } catch (error) {
        console.error('Error summarizing intent:', error);
        return "Error al generar resumen.";
    }
}

/**
 * Assign a conversation to a user (agent/member)
 */
export async function assignConversation(conversationId: string, userId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: 'No autorizado' }
        }

        const workspace = await getUserWorkspace()
        if (!workspace) {
            return { error: 'Workspace no encontrado' }
        }

        // Verify conversation belongs to workspace
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                agent: {
                    workspaceId: workspace.id
                }
            },
            include: {
                agent: true,
                contact: true,
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 15
                }
            }
        })

        if (!conversation) {
            return { error: 'Conversación no encontrada' }
        }

        // Verify user is a member of the workspace and get their email
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                userId: userId,
                workspaceId: workspace.id
            },
            include: { user: true }
        })

        if (!membership || !membership.user) {
            return { error: 'Usuario no es miembro del workspace' }
        }

        // Assign conversation (bot remains active unless manually assumed)
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                assignedTo: userId,
                assignedAt: new Date()
            }
        })

        // RE-FETCH conversation to ensure we have any contact info updated recently
        const refreshedConv = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { agent: true, contact: true, messages: { orderBy: { createdAt: 'desc' }, take: 20 } }
        });

        if (refreshedConv) {
            // Update local object for notifications
            (conversation as any).contactName = refreshedConv.contactName;
            (conversation as any).contactEmail = refreshedConv.contactEmail;
            (conversation as any).contact = refreshedConv.contact;
        }

        // Generate Summary and Send Email
        const intentSummary = await summarizeIntent([...conversation.messages].reverse());

        try {
            const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
            const link = `${APP_URL}/chat?id=${conversation.id}`;

            await sendAssignmentEmail(
                membership.user.email,
                conversation.agent.name,
                workspace.name,
                membership.user.name || membership.user.email,
                link,
                {
                    name: conversation.contactName || conversation.contact?.name || 'Visitante',
                    email: conversation.contactEmail || conversation.contact?.email || 'No proporcionado',
                    phone: conversation.contact?.phone || 'No proporcionado'
                },
                intentSummary
            );
        } catch (emailError) {
            console.error('Error sending assignment email:', emailError);
        }

        // Send Push Notification
        const userWithFcm = membership.user as any;
        if (userWithFcm.fcmToken) {
            await sendAssignmentPushNotification(
                userWithFcm.fcmToken,
                membership.user.name || '',
                conversation.contactName || conversation.contact?.name || 'Visitante',
                intentSummary,
                conversation.id
            );
        }

        revalidatePath('/dashboard')
        revalidatePath('/chat')
        return { success: true }
    } catch (error: any) {
        console.error('Error assigning conversation:', error)
        return { error: error.message || 'Error al asignar conversación' }
    }
}

/**
 * Unassign a conversation (remove assignment)
 */
export async function unassignConversation(conversationId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: 'No autorizado' }
        }

        const workspace = await getUserWorkspace()
        if (!workspace) {
            return { error: 'Workspace no encontrado' }
        }

        // Verify conversation belongs to workspace
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                agent: {
                    workspaceId: workspace.id
                }
            }
        })

        if (!conversation) {
            return { error: 'Conversación no encontrada' }
        }

        // Unassign conversation
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                assignedTo: null,
                assignedAt: null
            }
        })

        revalidatePath('/dashboard')
        revalidatePath('/chat')
        return { success: true }
    } catch (error: any) {
        console.error('Error unassigning conversation:', error)
        return { error: error.message || 'Error al desasignar conversación' }
    }
}

/**
 * Get conversations assigned to current user
 */
export async function getAssignedConversations() {
    const session = await auth()
    if (!session?.user?.id) return []

    const workspace = await getUserWorkspace()
    if (!workspace) return []

    const conversations = await prisma.conversation.findMany({
        where: {
            assignedTo: session.user.id,
            agent: {
                workspaceId: workspace.id
            }
        },
        include: {
            agent: {
                select: {
                    id: true,
                    name: true
                }
            },
            channel: {
                select: {
                    id: true,
                    type: true,
                    displayName: true
                }
            },
            _count: {
                select: {
                    messages: true
                }
            }
        },
        orderBy: {
            lastMessageAt: 'desc'
        },
        take: 50
    })

    return conversations
}

/**
 * Get conversations pending assignment (no assigned user)
 */
export async function getUnassignedConversations() {
    const session = await auth()
    if (!session?.user?.id) return []

    const workspace = await getUserWorkspace()
    if (!workspace) return []

    // The user's edit here was syntactically incorrect and introduced undefined variables.
    // Reverting to original correct code for getUnassignedConversations.
    // If there was a specific lint error related to type casting, it was not apparent
    // in the provided snippet or the original code.
    const conversations = await prisma.conversation.findMany({
        where: {
            assignedTo: null,
            agent: {
                workspaceId: workspace.id
            },
            status: {
                in: ['OPEN', 'PENDING']
            }
        },
        include: {
            agent: {
                select: {
                    id: true,
                    name: true
                }
            },
            channel: {
                select: {
                    id: true,
                    type: true,
                    displayName: true
                }
            },
            _count: {
                select: {
                    messages: true
                }
            }
        },
        orderBy: {
            lastMessageAt: 'desc'
        },
        take: 50
    })

    return conversations
}

/**
 * Assume conversation - Assign to current user and mark as handled by human
 */
export async function assumeConversation(conversationId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: 'No autorizado' }
        }

        const workspace = await getUserWorkspace()
        if (!workspace) {
            return { error: 'Workspace no encontrado' }
        }

        // Verify conversation belongs to workspace
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                agent: {
                    workspaceId: workspace.id
                }
            }
        })

        if (!conversation) {
            return { error: 'Conversación no encontrada' }
        }

        // Verify user is a member of the workspace
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                userId: session.user.id,
                workspaceId: workspace.id
            }
        })

        if (!membership) {
            return { error: 'Usuario no es miembro del workspace' }
        }

        // Assign conversation to current user and pause bot
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                assignedTo: session.user.id,
                assignedAt: new Date(),
                isPaused: false // Keep bot active even when taking control manually
            }
        })

        revalidatePath('/dashboard')
        revalidatePath('/chat')
        return { success: true }
    } catch (error: any) {
        console.error('Error assuming conversation:', error)
        return { error: error.message || 'Error al asumir conversación' }
    }
}

/**
 * Pause bot - Human takes manual control
 */
export async function pauseBot(conversationId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { error: 'No autorizado' }

        const workspace = await getUserWorkspace()
        if (!workspace) return { error: 'Workspace no encontrado' }

        await prisma.conversation.update({
            where: { id: conversationId },
            data: { isPaused: true }
        })

        revalidatePath('/dashboard')
        revalidatePath('/chat')
        return { success: true }
    } catch (error: any) {
        console.error('Error pausing bot:', error)
        return { error: error.message || 'Error al pausar bot' }
    }
}

/**
 * Unpause bot - Resumes AI but keeps assignment
 */
export async function unpauseBot(conversationId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { error: 'No autorizado' }

        await prisma.conversation.update({
            where: { id: conversationId },
            data: { isPaused: false }
        })

        revalidatePath('/dashboard')
        revalidatePath('/chat')
        return { success: true }
    } catch (error: any) {
        console.error('Error unpausing bot:', error)
        return { error: error.message || 'Error al re-activar bot' }
    }
}

/**
 * Delegate conversation to bot - Unassign so bot handles it automatically
 */
export async function delegateToBot(conversationId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: 'No autorizado' }
        }

        const workspace = await getUserWorkspace()
        if (!workspace) {
            return { error: 'Workspace no encontrado' }
        }

        // Verify conversation belongs to workspace
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                agent: {
                    workspaceId: workspace.id
                }
            }
        })

        if (!conversation) {
            return { error: 'Conversación no encontrada' }
        }

        // Check if user has permission (must be assigned to them or be OWNER/MANAGER)
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                userId: session.user.id,
                workspaceId: workspace.id
            }
        })

        if (!membership) {
            return { error: 'Usuario no es miembro del workspace' }
        }

        // Allow delegation if user is assigned OR is OWNER/MANAGER
        if (conversation.assignedTo && conversation.assignedTo !== session.user.id) {
            if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') {
                return { error: 'No tienes permiso para delegar esta conversación' }
            }
        }

        // Unassign conversation and resume bot
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                assignedTo: null,
                assignedAt: null,
                isPaused: false
            }
        })

        revalidatePath('/dashboard')
        revalidatePath('/chat')
        return { success: true }
    } catch (error: any) {
        console.error('Error delegating to bot:', error)
        return { error: error.message || 'Error al delegar conversación' }
    }
}

/**
 * Close conversation - Mark as CLOSED and unassign
 */
export async function closeConversation(conversationId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: 'No autorizado' }
        }

        const workspace = await getUserWorkspace()
        if (!workspace) {
            return { error: 'Workspace no encontrado' }
        }

        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                agent: {
                    workspaceId: workspace.id
                }
            }
        })

        if (!conversation) {
            return { error: 'Conversación no encontrada' }
        }

        // Check permissions (same as delegate)
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                userId: session.user.id,
                workspaceId: workspace.id
            }
        })

        if (!membership) {
            return { error: 'Usuario no es miembro del workspace' }
        }

        if (conversation.assignedTo && conversation.assignedTo !== session.user.id) {
            if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') {
                return { error: 'No tienes permiso para cerrar esta conversación' }
            }
        }

        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                status: 'CLOSED',
                assignedTo: null,
                assignedAt: null
            }
        })

        revalidatePath('/dashboard')
        revalidatePath('/chat')
        return { success: true }
    } catch (error: any) {
        console.error('Error closing conversation:', error)
        return { error: error.message || 'Error al cerrar conversación' }
    }
}


