'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getUserWorkspace } from './dashboard'
import { revalidatePath } from 'next/cache'

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
            }
        })

        if (!conversation) {
            return { error: 'Conversación no encontrada' }
        }

        // Verify user is a member of the workspace
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                userId: userId,
                workspaceId: workspace.id
            }
        })

        if (!membership) {
            return { error: 'Usuario no es miembro del workspace' }
        }

        // Assign conversation
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                assignedTo: userId,
                assignedAt: new Date()
            }
        })

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

        // Assign conversation to current user (this marks it as handled by human)
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                assignedTo: session.user.id,
                assignedAt: new Date()
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

        // Unassign conversation (bot will handle automatically)
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


