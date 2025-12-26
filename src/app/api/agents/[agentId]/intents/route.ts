import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserWorkspace } from '@/lib/actions/dashboard'

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
            where: {
                id: agentId,
                workspaceId: workspace.id
            },
            include: {
                intents: {
                    orderBy: { createdAt: 'desc' }
                }
            }
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
            where: {
                id: agentId,
                workspaceId: workspace.id
            }
        })

        if (!agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
        }

        const body = await request.json()
        const { name, description, trigger, actionType, actionUrl, enabled } = body

        const intent = await prisma.intent.create({
            data: {
                agentId: agent.id,
                name,
                description: description || null,
                trigger,
                actionType: actionType || 'WEBHOOK',
                actionUrl: actionUrl || null,
                enabled: enabled ?? true
            }
        })

        return NextResponse.json(intent, { status: 201 })
    } catch (error) {
        console.error('Error creating intent:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
