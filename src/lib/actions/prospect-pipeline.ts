'use server'

import { prisma } from '@/lib/prisma'
import { getUserWorkspace } from '@/lib/actions/dashboard'
import { revalidatePath } from 'next/cache'

/* ─── Default columns ─────────────────────────────────────────────────── */
export const DEFAULT_COLUMNS = [
    { name: 'Nuevo', color: '#21AC96', order: 0, isDefault: true },
    { name: 'En Proceso', color: '#3B82F6', order: 1, isDefault: true },
    { name: 'Flujo Terminado', color: '#8B5CF6', order: 2, isDefault: true },
]

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

        // Fetch contacts with conversations, agent info, custom fields
        const contacts = await prisma.contact.findMany({
            where: contactWhere,
            include: {
                conversations: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: {
                        agent: {
                            select: { id: true, name: true, avatarUrl: true }
                        },
                        messages: {
                            where: { role: 'user' },
                            orderBy: { createdAt: 'desc' },
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
            const lastMessage = lastConv?.messages[0]
            const agent = lastConv?.agent

            return {
                id: c.id,
                name: c.name || 'Sin nombre',
                email: c.email,
                phone: c.phone,
                prospectStatus: c.prospectStatus || 'Nuevo',
                customData: c.customData as Record<string, any> || {},
                tags: c.tags,
                leadScore: c.leadScore,
                summary: c.summary,
                lastMessage: lastMessage?.content || null,
                lastMessageAt: lastMessage?.createdAt || c.createdAt,
                agentId: agent?.id || null,
                agentName: agent?.name || null,
                createdAt: c.createdAt,
                messagesCount: c.conversations.reduce((acc, conv) => acc + 0, 0)
            }
        })

        return { success: true, columns, prospects }
    } catch (error) {
        console.error('[getProspectPipelineData]', error)
        return { success: false, error: 'Error fetching pipeline data' }
    }
}

/* ─── Update prospect status (move card) ─────────────────────────────── */
export async function updateProspectStatus(contactId: string, newStatus: string) {
    try {
        const workspace = await getUserWorkspace()
        if (!workspace) return { success: false }

        await prisma.contact.update({
            where: { id: contactId },
            data: { prospectStatus: newStatus }
        })

        revalidatePath('/prospects')
        return { success: true }
    } catch (error) {
        console.error('[updateProspectStatus]', error)
        return { success: false }
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
