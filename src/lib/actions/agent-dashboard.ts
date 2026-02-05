'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getUserWorkspace } from './workspace'
import { cache } from 'react'
import { subDays, startOfDay, endOfDay } from 'date-fns'

/**
 * Get personal stats for an AGENT user
 */
export const getAgentPersonalStats = cache(async () => {
    const session = await auth()
    if (!session?.user?.id) return null

    const workspace = await getUserWorkspace()
    if (!workspace) return null

    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const weekStart = startOfDay(subDays(now, 7))
    const monthStart = startOfDay(subDays(now, 30))

    // Get assigned conversations count
    const assignedCount = await prisma.conversation.count({
        where: {
            assignedTo: session.user.id,
            agent: {
                workspaceId: workspace.id
            }
        }
    })

    // Get assigned conversations today
    const assignedToday = await prisma.conversation.count({
        where: {
            assignedTo: session.user.id,
            agent: {
                workspaceId: workspace.id
            },
            assignedAt: {
                gte: todayStart,
                lte: todayEnd
            }
        }
    })

    // Get conversations with responses (by counting messages with HUMAN role from this user)
    const conversationsWithResponses = await prisma.conversation.count({
        where: {
            assignedTo: session.user.id,
            agent: {
                workspaceId: workspace.id
            },
            messages: {
                some: {
                    role: 'HUMAN'
                }
            }
        }
    })

    // Calculate response rate
    const responseRate = assignedCount > 0
        ? Math.round((conversationsWithResponses / assignedCount) * 100)
        : 0

    // Get conversations handled this week
    const handledThisWeek = await prisma.conversation.count({
        where: {
            assignedTo: session.user.id,
            agent: {
                workspaceId: workspace.id
            },
            assignedAt: {
                gte: weekStart
            }
        }
    })

    // Get conversations handled this month
    const handledThisMonth = await prisma.conversation.count({
        where: {
            assignedTo: session.user.id,
            agent: {
                workspaceId: workspace.id
            },
            assignedAt: {
                gte: monthStart
            }
        }
    })

    // Get active conversations (OPEN status)
    const activeConversations = await prisma.conversation.count({
        where: {
            assignedTo: session.user.id,
            agent: {
                workspaceId: workspace.id
            },
            status: 'OPEN'
        }
    })

    // Get pending conversations (PENDING status)
    const pendingConversations = await prisma.conversation.count({
        where: {
            assignedTo: session.user.id,
            agent: {
                workspaceId: workspace.id
            },
            status: 'PENDING'
        }
    })

    // Get closed conversations
    const closedConversations = await prisma.conversation.count({
        where: {
            assignedTo: session.user.id,
            agent: {
                workspaceId: workspace.id
            },
            status: 'CLOSED'
        }
    })

    // Calculate average response time (time between first message and first HUMAN response)
    // This is a simplified calculation - in production you might want more sophisticated logic
    const conversationsWithHumanMessages = await prisma.conversation.findMany({
        where: {
            assignedTo: session.user.id,
            agent: {
                workspaceId: workspace.id
            },
            messages: {
                some: {
                    role: 'HUMAN'
                }
            }
        },
        include: {
            messages: {
                orderBy: {
                    createdAt: 'asc'
                },
                take: 100 // Limit for performance
            }
        }
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

    return {
        totalAssigned: assignedCount,
        assignedToday,
        handledThisWeek,
        handledThisMonth,
        activeConversations,
        pendingConversations,
        closedConversations,
        responseRate,
        averageResponseTimeMinutes
    }
})

/**
 * Get recent assigned conversations for agent dashboard
 */
export async function getAgentRecentConversations(limit: number = 10) {
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
            assignedUser: {
                select: {
                    id: true,
                    name: true,
                    email: true
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
        take: limit
    })

    return conversations.map(conv => ({
        id: conv.id,
        contactName: conv.contactName || 'Sin nombre',
        contactEmail: conv.contactEmail,
        agentName: conv.agent.name,
        channelType: conv.channel?.type || 'UNKNOWN',
        channelName: conv.channel?.displayName || 'Sin canal',
        status: conv.status,
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv._count.messages,
        assignedAt: conv.assignedAt
    }))
}



