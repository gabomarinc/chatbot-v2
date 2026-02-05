'use server'

import { prisma } from '@/lib/prisma'
import { getUserWorkspace } from './workspace'

export async function globalSearch(query: string) {
    const workspace = await getUserWorkspace()
    if (!workspace || !query || query.trim().length < 2) {
        return {
            agents: [],
            conversations: [],
            prospects: [],
            team: [],
        }
    }

    const searchTerm = query.trim().toLowerCase()

    // Search agents
    const allAgents = await prisma.agent.findMany({
        where: {
            workspaceId: workspace.id,
        },
        select: {
            id: true,
            name: true,
            avatarUrl: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' }
    })

    const agents = allAgents
        .filter(agent => agent.name.toLowerCase().includes(searchTerm))
        .slice(0, 5)

    // Search conversations (by contact name)
    const allConversations = await prisma.conversation.findMany({
        where: {
            agent: { workspaceId: workspace.id }
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
                    type: true,
                    displayName: true
                }
            }
        },
        orderBy: { lastMessageAt: 'desc' },
        take: 50 // Get more to filter in memory
    })

    const conversations = allConversations
        .filter(conv => {
            const contactName = conv.contactName?.toLowerCase() || ''
            const contactEmail = conv.contactEmail?.toLowerCase() || ''
            const externalId = conv.externalId?.toLowerCase() || ''
            return contactName.includes(searchTerm) ||
                contactEmail.includes(searchTerm) ||
                externalId.includes(searchTerm)
        })
        .slice(0, 5)

    // Search prospects (from conversations - unique contacts)
    // Prospects are essentially unique contacts from conversations
    const allProspectConversations = await prisma.conversation.findMany({
        where: {
            agent: { workspaceId: workspace.id }
        },
        select: {
            externalId: true,
            contactName: true,
            contactEmail: true,
            lastMessageAt: true,
            createdAt: true,
        },
        orderBy: { lastMessageAt: 'desc' },
        take: 100 // Get more to filter and deduplicate
    })

    const filteredConversations = allProspectConversations.filter(conv => {
        const contactName = conv.contactName?.toLowerCase() || ''
        const contactEmail = conv.contactEmail?.toLowerCase() || ''
        const externalId = conv.externalId?.toLowerCase() || ''
        return contactName.includes(searchTerm) ||
            contactEmail.includes(searchTerm) ||
            externalId.includes(searchTerm)
    })

    // Deduplicate by externalId (prospect = unique contact)
    const prospectsMap = new Map()
    allConversations.forEach(conv => {
        if (!prospectsMap.has(conv.externalId)) {
            prospectsMap.set(conv.externalId, {
                id: conv.externalId,
                name: conv.contactName || `Contacto ${conv.externalId.slice(0, 6)}`,
                email: conv.contactEmail,
                lastContact: conv.lastMessageAt || conv.createdAt,
            })
        }
    })

    const prospects = Array.from(prospectsMap.values()).slice(0, 5)

    // Search team members
    const teamMembers = await prisma.workspaceMember.findMany({
        where: {
            workspaceId: workspace.id,
            user: {
                OR: [
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { email: { contains: searchTerm, mode: 'insensitive' } }
                ]
            }
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true
                }
            }
        },
        take: 5
    })

    return {
        agents: agents.map(agent => ({
            id: agent.id,
            name: agent.name,
            avatarUrl: agent.avatarUrl,
            type: 'agent' as const,
        })),
        conversations: conversations.map(conv => ({
            id: conv.id,
            contactName: conv.contactName || `Contacto ${conv.externalId.slice(0, 6)}`,
            agentName: conv.agent.name,
            channelType: conv.channel?.type || 'UNKNOWN',
            channelName: conv.channel?.displayName || 'Sin canal',
            lastMessageAt: conv.lastMessageAt || conv.createdAt,
            type: 'conversation' as const,
        })),
        prospects: prospects.map(prospect => ({
            id: prospect.id,
            name: prospect.name,
            email: prospect.email,
            lastContact: prospect.lastContact,
            type: 'prospect' as const,
        })),
        team: teamMembers.map(member => ({
            id: member.user.id,
            name: member.user.name || 'Sin nombre',
            email: member.user.email,
            avatarUrl: member.user.image,
            role: member.role,
            type: 'member' as const
        }))
    }
}

