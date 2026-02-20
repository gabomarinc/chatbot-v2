'use server'

import { prisma } from '@/lib/prisma'
import { getUserWorkspace } from './workspace'
import { cache } from 'react'
import { startOfDay, endOfDay, subDays, format, getHours, getDay } from 'date-fns'

export const getCustomFieldsAnalytics = cache(async () => {
    const workspace = await getUserWorkspace()
    if (!workspace) return []

    // 1. Get all custom field definitions in the workspace
    const definitions = await prisma.customFieldDefinition.findMany({
        where: { agent: { workspaceId: workspace.id } },
        select: { key: true, label: true, type: true }
    })

    // Remove duplicates by key
    const uniqueDefinitions = definitions.reduce((acc, current) => {
        const x = acc.find(item => item.key === current.key);
        if (!x) {
            return acc.concat([current]);
        } else {
            return acc;
        }
    }, [] as typeof definitions);

    // 2. Get all contacts with customData
    const contacts = await prisma.contact.findMany({
        where: { workspaceId: workspace.id },
        select: { customData: true }
    })

    // 3. Aggregate data for each field
    const analytics = uniqueDefinitions.map(def => {
        const values: Record<string, number> = {}
        let totalEntries = 0

        contacts.forEach(contact => {
            const data = contact.customData as Record<string, any>
            if (data && data[def.key] !== undefined && data[def.key] !== null && data[def.key] !== '') {
                const val = String(data[def.key])
                values[val] = (values[val] || 0) + 1
                totalEntries++
            }
        })

        // Sort by frequency and take top 5
        const topValues = Object.entries(values)
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)

        return {
            key: def.key,
            label: def.label,
            total: totalEntries,
            data: topValues
        }
    })

    return analytics.filter(a => a.total > 0)
})

export const getConversionFunnel = cache(async () => {
    const workspace = await getUserWorkspace()
    if (!workspace) return { total: 0, interactions: 0, leads: 0, qualified: 0 }

    const [totalConversations, conversionsWithUser, contactsCount] = await Promise.all([
        prisma.conversation.count({ where: { agent: { workspaceId: workspace.id } } }),
        prisma.conversation.count({
            where: {
                agent: { workspaceId: workspace.id },
                messages: { some: { role: 'USER' } }
            }
        }),
        prisma.contact.count({ where: { workspaceId: workspace.id } })
    ])

    // "Qualified" could be contacts with at least one custom field filled
    const qualifiedCount = await prisma.contact.count({
        where: {
            workspaceId: workspace.id,
            NOT: { customData: {} } // Simplified check
        }
    })

    return {
        interactions: totalConversations, // Total chats
        engaged: conversionsWithUser,    // At least one user message
        leads: contactsCount,            // Contact record created
        qualified: qualifiedCount        // Has custom data
    }
})

export const getHeatmapData = cache(async () => {
    const workspace = await getUserWorkspace()
    if (!workspace) return []

    const thirtyDaysAgo = subDays(new Date(), 30)

    // Get contact creation events
    const contacts = await prisma.contact.findMany({
        where: {
            workspaceId: workspace.id,
            createdAt: { gte: thirtyDaysAgo }
        },
        select: { createdAt: true }
    })

    // Initialize 7x24 grid (Day of week x Hour of day)
    const grid: number[][] = Array(7).fill(0).map(() => Array(24).fill(0))

    contacts.forEach(c => {
        const day = getDay(c.createdAt) // 0 (Sun) to 6 (Sat)
        const hour = getHours(c.createdAt) // 0 to 23
        grid[day][hour]++
    })

    return grid
})

export const getAgentPerformance = cache(async () => {
    const workspace = await getUserWorkspace()
    if (!workspace) return []

    const agents = await prisma.agent.findMany({
        where: { workspaceId: workspace.id },
        include: {
            _count: {
                select: {
                    conversations: true
                }
            },
            conversations: {
                where: { contactId: { not: null } },
                select: { id: true, npsScore: true } as any
            }
        }
    }) as any[]

    return agents.map((agent: any) => {
        const npsResponses = agent.conversations.filter((c: any) => c.npsScore !== null);
        const avgNps = npsResponses.length > 0
            ? Math.round((npsResponses.reduce((acc: number, c: any) => acc + c.npsScore, 0) / npsResponses.length) * 10) / 10
            : null;

        return {
            id: agent.id,
            name: agent.name,
            totalChats: agent._count.conversations,
            leadsCaptured: agent.conversations.length,
            efficiency: agent._count.conversations > 0
                ? Math.round((agent.conversations.length / agent._count.conversations) * 100)
                : 0,
            nps: avgNps
        }
    })
})

export const getChannelDistribution = cache(async () => {
    const workspace = await getUserWorkspace()
    if (!workspace) return []

    const distributions = await prisma.conversation.groupBy({
        by: ['channelId'],
        where: { agent: { workspaceId: workspace.id } },
        _count: { id: true }
    })

    const channels = await prisma.channel.findMany({
        where: { id: { in: distributions.map(d => d.channelId).filter(Boolean) as string[] } },
        select: { id: true, type: true }
    })

    const data = distributions.map(d => {
        const channel = channels.find(c => c.id === d.channelId)
        return {
            name: channel?.type || 'WEBCHAT',
            value: d._count.id
        }
    })

    // Group by type
    const grouped = data.reduce((acc, curr) => {
        const existing = acc.find(a => a.name === curr.name)
        if (existing) {
            existing.value += curr.value
        } else {
            acc.push(curr)
        }
        return acc
    }, [] as { name: string, value: number }[])

    const total = grouped.reduce((sum, g) => sum + g.value, 0)

    return grouped.map(g => ({
        ...g,
        percentage: total > 0 ? Math.round((g.value / total) * 100) : 0
    }))
})

export const getRetentionRate = cache(async () => {
    const workspace = await getUserWorkspace()
    if (!workspace) return { rate: 0, trend: 0 }

    // Retention: % of users who have more than 1 conversation
    const userConversations = await prisma.conversation.groupBy({
        by: ['externalId'],
        where: { agent: { workspaceId: workspace.id } },
        _count: { id: true }
    })

    const totalUsers = userConversations.length
    if (totalUsers === 0) return { rate: 0, trend: 0 }

    const returningUsers = userConversations.filter(u => u._count.id > 1).length
    const rate = Math.round((returningUsers / totalUsers) * 1000) / 10 // e.g. 18.4

    // Simple mock trend for now as calculating historical trend is more complex
    return { rate, trend: 2.1 }
})

export const getNPSAnalytics = cache(async () => {
    const workspace = await getUserWorkspace()
    if (!workspace) return null

    const conversations = await prisma.conversation.findMany({
        where: {
            agent: { workspaceId: workspace.id },
            npsScore: { not: null }
        } as any,
        select: {
            npsScore: true,
            npsComment: true,
            createdAt: true,
            agent: { select: { name: true } }
        } as any,
        orderBy: { createdAt: 'desc' }
    }) as any[]

    if (conversations.length === 0) return null

    const total = conversations.length
    const promoters = conversations.filter(c => c.npsScore >= 9).length
    const passives = conversations.filter(c => c.npsScore >= 7 && c.npsScore <= 8).length
    const detractors = conversations.filter(c => c.npsScore <= 6).length

    const npsScore = Math.round(((promoters - detractors) / total) * 100)
    const average = Math.round((conversations.reduce((acc, c) => acc + c.npsScore, 0) / total) * 10) / 10

    return {
        score: npsScore,
        average,
        total,
        distribution: {
            promoters: { count: promoters, percentage: Math.round((promoters / total) * 100) },
            passives: { count: passives, percentage: Math.round((passives / total) * 100) },
            detractors: { count: detractors, percentage: Math.round((detractors / total) * 100) }
        },
        recentComments: conversations
            .filter(c => c.npsComment)
            .slice(0, 10)
            .map(c => ({
                score: c.npsScore,
                comment: c.npsComment,
                agentName: c.agent.name,
                date: c.createdAt
            }))
    }
})
