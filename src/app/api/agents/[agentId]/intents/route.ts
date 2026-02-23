import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserWorkspace } from '@/lib/actions/dashboard'

// Helper: map UI type string → CustomFieldType enum
function toFieldType(type: string): 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT' {
    switch (type?.toLowerCase()) {
        case 'número':
        case 'number': return 'NUMBER'
        case 'booleano':
        case 'sí/no':
        case 'boolean': return 'BOOLEAN'
        case 'fecha':
        case 'date': return 'DATE'
        default: return 'TEXT'
    }
}

// Helper: turn a human label into a snake_case key
function toKey(label: string): string {
    return label
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        || 'campo'
}

// Upsert collected fields as CustomFieldDefinitions for this agent
async function syncCustomFields(agentId: string, collectedFields: any[]) {
    if (!Array.isArray(collectedFields) || collectedFields.length === 0) return

    for (const field of collectedFields) {
        if (!field.name?.trim()) continue

        const key = toKey(field.name)
        const type = toFieldType(field.type)

        await prisma.customFieldDefinition.upsert({
            where: { agentId_key: { agentId, key } },
            update: {
                label: field.name,
                description: field.description || null,
                type,
            },
            create: {
                agentId,
                key,
                label: field.name,
                description: field.description || null,
                type,
                options: [],
            }
        })
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const { agentId } = await params
        const workspace = await getUserWorkspace()
        if (!workspace) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const agent = await prisma.agent.findFirst({
            where: { id: agentId, workspaceId: workspace.id },
            include: { intents: { orderBy: { createdAt: 'desc' } } }
        })

        if (!agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
        }

        return NextResponse.json(agent.intents)
    } catch (error) {
        console.error('Error fetching intents:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const { agentId } = await params
        const workspace = await getUserWorkspace()
        if (!workspace) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const agent = await prisma.agent.findFirst({
            where: { id: agentId, workspaceId: workspace.id }
        })

        if (!agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
        }

        const body = await request.json()
        const { name, description, trigger, actionType, actionUrl, enabled, payloadJson } = body

        // 1. Create the intent
        const intent = await prisma.intent.create({
            data: {
                agentId: agent.id,
                name,
                description: description || null,
                trigger: trigger || 'LLM',
                actionType: actionType || 'INTERNAL',
                actionUrl: actionUrl || null,
                enabled: enabled ?? true,
                payloadJson: payloadJson || null
            }
        })

        // 2. Sync collected fields → CustomFieldDefinitions
        if (payloadJson?.collectedFields) {
            await syncCustomFields(agent.id, payloadJson.collectedFields)
        }

        return NextResponse.json(intent, { status: 201 })
    } catch (error) {
        console.error('Error creating intent:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
