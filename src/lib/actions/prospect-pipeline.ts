'use server'

import { prisma } from '@/lib/prisma'
import { getUserWorkspace } from '@/lib/actions/dashboard'
import { revalidatePath } from 'next/cache'
import { DEFAULT_COLUMNS } from '@/lib/constants/prospect-pipeline'

/* ─── Get last conversationId for a contact (for modal) ──────────────── */
export async function getContactConversationId(contactId: string): Promise<string | null> {
    try {
        const conv = await prisma.conversation.findFirst({
            where: { contactId },
            orderBy: { lastMessageAt: 'desc' },
            select: { id: true }
        })
        return conv?.id ?? null
    } catch {
        return null
    }
}

/* ─── Fetch pipeline data ─────────────────────────────────────────────── */
export async function getProspectPipelineData(agentId?: string) {
    try {
        const workspace = await getUserWorkspace()
        if (!workspace) return { success: false, error: 'No workspace' }

        // Ensure columns exist for this workspace
        const existingColumns = await prisma.prospectStatusColumn.findMany({
            where: { workspaceId: workspace.id },
            orderBy: { order: 'asc' }
        })

        if (existingColumns.length === 0) {
            // Seed default columns
            await prisma.prospectStatusColumn.createMany({
                data: DEFAULT_COLUMNS.map(c => ({ ...c, workspaceId: workspace.id }))
            })
        }

        const columns = await prisma.prospectStatusColumn.findMany({
            where: { workspaceId: workspace.id },
            orderBy: { order: 'asc' }
        })

        // Build contact query
        const contactWhere: any = { workspaceId: workspace.id }

        // Fetch contacts with conversations, agent info, channel, first message (intent), activities
        const contacts = await prisma.contact.findMany({
            where: contactWhere,
            include: {
                activities: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: {
                        user: { select: { name: true, image: true } }
                    }
                },
                conversations: {
                    orderBy: { lastMessageAt: 'desc' },
                    take: 1,
                    include: {
                        agent: {
                            select: { id: true, name: true, avatarUrl: true }
                        },
                        channel: {
                            select: { type: true }
                        },
                        messages: {
                            where: { role: 'USER' },
                            orderBy: { createdAt: 'asc' },
                            take: 1,
                            select: { content: true, createdAt: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Filter by agentId if provided
        const filtered = agentId && agentId !== 'all'
            ? contacts.filter(c => c.conversations.some(conv => conv.agent?.id === agentId))
            : contacts

        // Map to a clean prospect shape
        const prospects = filtered.map(c => {
            const lastConv = c.conversations[0]
            const firstUserMsg = lastConv?.messages[0]   // first USER msg = intent
            const agent = lastConv?.agent
            const channelType = lastConv?.channel?.type ?? null
            const aiInsights = c.aiInsights as Record<string, any> | null

            return {
                id: c.id,
                name: c.name || 'Sin nombre',
                email: c.email,
                phone: c.phone,
                prospectStatus: (c as any).prospectStatus || 'Nuevo',
                customData: c.customData as Record<string, any> || {},
                tags: c.tags,
                leadScore: c.leadScore,
                summary: c.summary,
                aiInsights,
                // First user message = the user's original intent
                intent: firstUserMsg?.content || null,
                channelType,
                agentId: agent?.id || null,
                agentName: agent?.name || null,
                createdAt: c.createdAt,
                activities: c.activities.map(a => ({
                    id: a.id,
                    type: a.type,
                    content: a.content,
                    createdAt: a.createdAt,
                    userName: a.user?.name || null
                }))
            }
        })

        return { success: true, columns, prospects }
    } catch (error) {
        console.error('[getProspectPipelineData]', error)
        return { success: false, error: 'Error fetching pipeline data' }
    }
}

/* ─── Update prospect status + log activity ──────────────────────────── */
export async function updateProspectStatus(contactId: string, newStatus: string, prevStatus?: string) {
    try {
        const workspace = await getUserWorkspace()
        if (!workspace) return { success: false }

        await prisma.contact.update({
            where: { id: contactId },
            data: { prospectStatus: newStatus } as any
        })

        // Log the status change as a SYSTEM activity
        await prisma.contactActivity.create({
            data: {
                contactId,
                type: 'SYSTEM',
                content: prevStatus
                    ? `Movido de "${prevStatus}" → "${newStatus}"`
                    : `Estado actualizado a "${newStatus}"`,
                metadata: { prevStatus, newStatus }
            }
        })

        revalidatePath('/prospects')
        return { success: true }
    } catch (error) {
        console.error('[updateProspectStatus]', error)
        return { success: false }
    }
}

/* ─── Add a manual note to a contact ─────────────────────────────────── */
export async function addProspectNote(contactId: string, content: string) {
    try {
        const workspace = await getUserWorkspace()
        if (!workspace) return { success: false, error: 'No workspace' }

        // Verify contact belongs to this workspace
        const contact = await prisma.contact.findFirst({
            where: { id: contactId, workspaceId: workspace.id }
        })
        if (!contact) return { success: false, error: 'Contact not found' }

        const activity = await prisma.contactActivity.create({
            data: {
                contactId,
                type: 'NOTE',
                content: content.trim()
            },
            include: {
                user: { select: { name: true, image: true } }
            }
        })

        revalidatePath('/prospects')
        return {
            success: true,
            activity: {
                id: activity.id,
                type: activity.type,
                content: activity.content,
                createdAt: activity.createdAt,
                userName: activity.user?.name || null
            }
        }
    } catch (error) {
        console.error('[addProspectNote]', error)
        return { success: false, error: 'Error creating note' }
    }
}

/* ─── Create custom column ────────────────────────────────────────────── */
export async function createProspectColumn(name: string, color: string) {
    try {
        const workspace = await getUserWorkspace()
        if (!workspace) return { success: false }

        const lastCol = await prisma.prospectStatusColumn.findFirst({
            where: { workspaceId: workspace.id },
            orderBy: { order: 'desc' }
        })

        const column = await prisma.prospectStatusColumn.create({
            data: {
                workspaceId: workspace.id,
                name: name.trim(),
                color,
                order: (lastCol?.order ?? -1) + 1,
                isDefault: false
            }
        })

        revalidatePath('/prospects')
        return { success: true, column }
    } catch (error) {
        console.error('[createProspectColumn]', error)
        return { success: false }
    }
}

/* ─── Delete column ────────────────────────────────────────────────────── */
export async function deleteProspectColumn(columnId: string) {
    try {
        const workspace = await getUserWorkspace()
        if (!workspace) return { success: false }

        const col = await prisma.prospectStatusColumn.findUnique({ where: { id: columnId } })
        if (!col || col.workspaceId !== workspace.id) return { success: false }
        if (col.isDefault) return { success: false, error: 'No se pueden eliminar columnas predeterminadas' }

        // Move contacts in this column to "Nuevo"
        await prisma.contact.updateMany({
            where: { workspaceId: workspace.id, prospectStatus: col.name },
            data: { prospectStatus: 'Nuevo' }
        })

        await prisma.prospectStatusColumn.delete({ where: { id: columnId } })
        revalidatePath('/prospects')
        return { success: true }
    } catch (error) {
        console.error('[deleteProspectColumn]', error)
        return { success: false }
    }
}

/* ─── Fetch agents for filter ─────────────────────────────────────────── */
export async function getWorkspaceAgents() {
    try {
        const workspace = await getUserWorkspace()
        if (!workspace) return []

        const agents = await prisma.agent.findMany({
            where: { workspaceId: workspace.id },
            select: { id: true, name: true, avatarUrl: true }
        })
        return agents
    } catch {
        return []
    }
}

/* ─── Fetch custom field definitions (all agents) ─────────────────────── */
export async function getWorkspaceCustomFields() {
    try {
        const workspace = await getUserWorkspace()
        if (!workspace) return []

        const fields = await prisma.customFieldDefinition.findMany({
            where: { agent: { workspaceId: workspace.id } },
            select: { id: true, key: true, label: true, type: true, agentId: true }
        })
        return fields
    } catch {
        return []
    }
}
