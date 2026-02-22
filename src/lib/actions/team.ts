'use server'

import { prisma } from '@/lib/prisma'
import { getUserWorkspace } from './workspace'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { sendTeamInvitationEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'
import { subDays, startOfDay, endOfDay } from 'date-fns'

// Get user's role in workspace
async function getUserWorkspaceRole(workspaceId: string) {
    const session = await auth()
    if (!session?.user?.id) return null

    const membership = await prisma.workspaceMember.findFirst({
        where: {
            userId: session.user.id,
            workspaceId
        },
        select: {
            role: true
        }
    })

    return membership?.role || null
}

// Check if user can invite members (OWNER or MANAGER)
async function canInviteMembers(workspaceId: string): Promise<boolean> {
    const role = await getUserWorkspaceRole(workspaceId)
    return role === 'OWNER' || role === 'MANAGER'
}

// Check if user can create agents
export async function canCreateAgents(): Promise<boolean> {
    const workspace = await getUserWorkspace()
    if (!workspace) return false

    const role = await getUserWorkspaceRole(workspace.id)
    return role === 'OWNER' || role === 'MANAGER'
}

// Check if user can manage agents (edit/delete)
export async function canManageAgents(): Promise<boolean> {
    const workspace = await getUserWorkspace()
    if (!workspace) return false

    const role = await getUserWorkspaceRole(workspace.id)
    return role === 'OWNER' || role === 'MANAGER'
}

// Check if user can assume conversations
export async function canAssumeConversations(): Promise<boolean> {
    // All members can assume conversations
    const workspace = await getUserWorkspace()
    return workspace !== null
}

// Check if user can view billing/subscriptions (only OWNER)
export async function canViewBilling(): Promise<boolean> {
    const workspace = await getUserWorkspace()
    if (!workspace) return false

    const role = await getUserWorkspaceRole(workspace.id)
    return role === 'OWNER'
}

// Check if user can view settings (only OWNER)
export async function canViewSettings(): Promise<boolean> {
    const workspace = await getUserWorkspace()
    if (!workspace) return false

    const role = await getUserWorkspaceRole(workspace.id)
    return role === 'OWNER'
}

/**
 * Get detailed statistics for a specific team member
 */
export async function getMemberStats(memberUserId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: 'No autorizado' }
        }

        const workspace = await getUserWorkspace()
        if (!workspace) {
            return { error: 'Workspace no encontrado' }
        }

        // Verify user is a member of the workspace
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                userId: memberUserId,
                workspaceId: workspace.id
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        createdAt: true,
                        lastLoginAt: true
                    }
                }
            }
        })

        if (!membership) {
            return { error: 'Miembro no encontrado' }
        }

        const now = new Date()
        const todayStart = startOfDay(now)
        const todayEnd = endOfDay(now)
        const weekStart = startOfDay(subDays(now, 7))
        const monthStart = startOfDay(subDays(now, 30))

        // Get conversation counts
        const [
            totalAssigned,
            assignedToday,
            assignedThisWeek,
            assignedThisMonth,
            activeConversations,
            pendingConversations,
            closedConversations,
            conversationsWithResponses
        ] = await Promise.all([
            // Total assigned
            prisma.conversation.count({
                where: {
                    assignedTo: memberUserId,
                    agent: { workspaceId: workspace.id }
                }
            }),
            // Assigned today
            prisma.conversation.count({
                where: {
                    assignedTo: memberUserId,
                    agent: { workspaceId: workspace.id },
                    assignedAt: { gte: todayStart, lte: todayEnd }
                }
            }),
            // Assigned this week
            prisma.conversation.count({
                where: {
                    assignedTo: memberUserId,
                    agent: { workspaceId: workspace.id },
                    assignedAt: { gte: weekStart }
                }
            }),
            // Assigned this month
            prisma.conversation.count({
                where: {
                    assignedTo: memberUserId,
                    agent: { workspaceId: workspace.id },
                    assignedAt: { gte: monthStart }
                }
            }),
            // Active conversations
            prisma.conversation.count({
                where: {
                    assignedTo: memberUserId,
                    agent: { workspaceId: workspace.id },
                    status: 'OPEN'
                }
            }),
            // Pending conversations
            prisma.conversation.count({
                where: {
                    assignedTo: memberUserId,
                    agent: { workspaceId: workspace.id },
                    status: 'PENDING'
                }
            }),
            // Closed conversations
            prisma.conversation.count({
                where: {
                    assignedTo: memberUserId,
                    agent: { workspaceId: workspace.id },
                    status: 'CLOSED'
                }
            }),
            // Conversations with responses
            prisma.conversation.count({
                where: {
                    assignedTo: memberUserId,
                    agent: { workspaceId: workspace.id },
                    messages: { some: { role: 'HUMAN' } }
                }
            })
        ])

        // Calculate response rate
        const responseRate = totalAssigned > 0
            ? Math.round((conversationsWithResponses / totalAssigned) * 100)
            : 0

        // Get average response time
        const conversationsWithHumanMessages = await prisma.conversation.findMany({
            where: {
                assignedTo: memberUserId,
                agent: { workspaceId: workspace.id },
                messages: { some: { role: 'HUMAN' } }
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 100
                }
            },
            take: 50
        })

        let totalResponseTime = 0
        let responseCount = 0

        for (const conv of conversationsWithHumanMessages) {
            const firstUserMessage = conv.messages.find(m => m.role === 'USER')
            const firstHumanMessage = conv.messages.find(m => m.role === 'HUMAN')

            if (firstUserMessage && firstHumanMessage && firstHumanMessage.createdAt > firstUserMessage.createdAt) {
                const responseTime = firstHumanMessage.createdAt.getTime() - firstUserMessage.createdAt.getTime()
                totalResponseTime += responseTime
                responseCount++
            }
        }

        const averageResponseTimeMs = responseCount > 0 ? totalResponseTime / responseCount : 0
        const averageResponseTimeMinutes = Math.round(averageResponseTimeMs / (1000 * 60))

        // Get recent assigned conversations
        const recentConversations = await prisma.conversation.findMany({
            where: {
                assignedTo: memberUserId,
                agent: { workspaceId: workspace.id }
            },
            include: {
                agent: {
                    select: { id: true, name: true }
                },
                channel: {
                    select: { id: true, type: true, displayName: true }
                },
                _count: {
                    select: { messages: true }
                }
            },
            orderBy: { lastMessageAt: 'desc' },
            take: 10
        })

        // Calculate peak activity (day and hour with most conversations)
        const conversationsForPeak = await prisma.conversation.findMany({
            where: {
                assignedTo: memberUserId,
                agent: { workspaceId: workspace.id },
                assignedAt: { gte: weekStart }
            },
            select: { assignedAt: true }
        })

        const dayCounts: Record<number, number> = {}
        const hourCounts: Record<number, number> = {}

        conversationsForPeak.forEach(conv => {
            if (conv.assignedAt) {
                const date = new Date(conv.assignedAt)
                const day = date.getDay()
                const hour = date.getHours()
                dayCounts[day] = (dayCounts[day] || 0) + 1
                hourCounts[hour] = (hourCounts[hour] || 0) + 1
            }
        })

        const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]
        const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]

        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        const peakDayName = peakDay ? dayNames[parseInt(peakDay[0])] : null
        const peakHourRange = peakHour ? `${peakHour[0]}:00 - ${parseInt(peakHour[0]) + 1}:00` : null

        return {
            success: true,
            member: {
                id: membership.user.id,
                name: membership.user.name,
                email: membership.user.email,
                role: membership.role,
                department: (membership as any).department,
                joinedAt: membership.user.createdAt,
                lastLoginAt: membership.user.lastLoginAt
            },
            stats: {
                totalAssigned,
                assignedToday,
                assignedThisWeek,
                assignedThisMonth,
                activeConversations,
                pendingConversations,
                closedConversations,
                responseRate,
                averageResponseTimeMinutes
            },
            peakActivity: {
                day: peakDayName,
                hour: peakHourRange
            },
            recentConversations: recentConversations.map(conv => ({
                id: conv.id,
                contactName: conv.contactName || conv.externalId,
                channelType: conv.channel?.type || 'UNKNOWN',
                channelName: conv.channel?.displayName || 'Sin canal',
                status: conv.status,
                lastMessageAt: conv.lastMessageAt,
                messageCount: conv._count.messages,
                assignedAt: conv.assignedAt
            }))
        }
    } catch (error: any) {
        console.error('Error getting member stats:', error)
        return { error: error.message || 'Error al obtener estadísticas del miembro' }
    }
}

// Invite team member
export async function inviteTeamMember(name: string, email: string, role: 'MANAGER' | 'AGENT', department?: 'SUPPORT' | 'SALES' | 'PERSONAL') {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: 'No autorizado' }
        }

        const workspace = await getUserWorkspace()
        if (!workspace) {
            return { error: 'Workspace no encontrado' }
        }

        // Check permissions
        const canInvite = await canInviteMembers(workspace.id)
        if (!canInvite) {
            return { error: 'No tienes permiso para invitar miembros' }
        }

        // Get subscription plan to check max members
        const subscription = await prisma.subscription.findFirst({
            where: { workspaceId: workspace.id },
            include: { plan: true }
        })

        const maxMembers = subscription?.plan?.maxMembers || 2

        // Count current members
        const currentMemberCount = await prisma.workspaceMember.count({
            where: { workspaceId: workspace.id }
        })

        if (currentMemberCount >= maxMembers) {
            return { error: `Has alcanzado el límite de ${maxMembers} miembros para tu plan` }
        }

        // Check if user already exists
        let user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            // Create new user with temporary password
            const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)
            const hashedPassword = await bcrypt.hash(tempPassword, 10)

            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    passwordHash: hashedPassword
                }
            })
        }

        // Check if user is already a member
        const existingMember = await prisma.workspaceMember.findFirst({
            where: {
                userId: user.id,
                workspaceId: workspace.id
            }
        })

        if (existingMember) {
            return { error: 'Este usuario ya es miembro del workspace' }
        }

        // Add user to workspace
        await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId: workspace.id,
                role,
                department: department as any
            } as any
        })

        // Send invitation email
        try {
            const session = await auth()
            const inviterName = session?.user?.name || 'Un administrador'
            await sendTeamInvitationEmail(email, workspace.name, inviterName, role, true)
        } catch (emailError) {
            console.error('Error sending invitation email:', emailError)
            // Don't fail the entire operation if email fails
        }

        revalidatePath('/team')
        return { success: true }
    } catch (error: any) {
        console.error('Error inviting team member:', error)
        return { error: error.message || 'Error al invitar miembro' }
    }
}

// Remove team member
export async function removeTeamMember(memberId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: 'No autorizado' }
        }

        const workspace = await getUserWorkspace()
        if (!workspace) {
            return { error: 'Workspace no encontrado' }
        }

        // Get the member to remove
        const member = await prisma.workspaceMember.findFirst({
            where: {
                id: memberId,
                workspaceId: workspace.id
            },
            include: {
                user: true
            }
        })

        if (!member) {
            return { error: 'Miembro no encontrado' }
        }

        // Prevent removing owner
        if (member.role === 'OWNER') {
            return { error: 'No se puede eliminar al propietario del workspace' }
        }

        // Prevent removing yourself (though this shouldn't be possible in UI)
        if (member.userId === session.user.id) {
            return { error: 'No puedes eliminarte a ti mismo' }
        }

        // Check if user is member of any other workspace
        const otherMemberships = await prisma.workspaceMember.findMany({
            where: {
                userId: member.userId,
                workspaceId: { not: workspace.id }
            }
        })

        // Remove workspace membership
        await prisma.workspaceMember.delete({
            where: { id: memberId }
        })

        // If user is not a member of any other workspace, delete the user account
        if (otherMemberships.length === 0) {
            // Also unassign all conversations assigned to this user
            await prisma.conversation.updateMany({
                where: { assignedTo: member.userId },
                data: { assignedTo: null, assignedAt: null }
            })

            // Delete the user
            await prisma.user.delete({
                where: { id: member.userId }
            })
        } else {
            // Just unassign conversations in this workspace
            await prisma.conversation.updateMany({
                where: {
                    assignedTo: member.userId,
                    agent: { workspaceId: workspace.id }
                },
                data: { assignedTo: null, assignedAt: null }
            })
        }

        revalidatePath('/team')
        return { success: true }
    } catch (error: any) {
        console.error('Error removing team member:', error)
        return { error: error.message || 'Error al eliminar miembro' }
    }
}

// Update team member (role and/or department)
export async function updateTeamMember(memberId: string, data: { role?: 'MANAGER' | 'AGENT', department?: 'SUPPORT' | 'SALES' | 'PERSONAL' }) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: 'No autorizado' }
        }

        const workspace = await getUserWorkspace()
        if (!workspace) {
            return { error: 'Workspace no encontrado' }
        }

        // Get the member
        const member = await prisma.workspaceMember.findFirst({
            where: {
                id: memberId,
                workspaceId: workspace.id
            }
        })

        if (!member) {
            return { error: 'Miembro no encontrado' }
        }

        // Prevent changing owner role directly here (usually handled separately)
        if (member.role === 'OWNER' && data.role) {
            return { error: 'No se puede cambiar el rol del propietario' }
        }

        // Update member
        await prisma.workspaceMember.update({
            where: { id: memberId },
            data: {
                ...(data.role && { role: data.role }),
                ...(data.department && { department: data.department as any })
            }
        })

        revalidatePath('/team')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating team member:', error)
        return { error: error.message || 'Error al actualizar miembro' }
    }
}

// Deprecated: used for backward compatibility if needed, but we should use updateTeamMember
export async function updateTeamMemberRole(memberId: string, newRole: 'MANAGER' | 'AGENT') {
    return updateTeamMember(memberId, { role: newRole })
}
