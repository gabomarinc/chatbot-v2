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
                select: { id: true }
            }
        }
    })

    return agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        totalChats: agent._count.conversations,
        leadsCaptured: agent.conversations.length,
        efficiency: agent._count.conversations > 0
            ? Math.round((agent.conversations.length / agent._count.conversations) * 100)
            : 0
    }))
})
