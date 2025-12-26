import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserWorkspace } from '@/lib/actions/dashboard'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ agentId: string; intentId: string }> }
) {
    try {
        const { agentId, intentId } = await params
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
        const { enabled } = body

        const intent = await prisma.intent.update({
            where: { id: intentId },
            data: { enabled }
        })

        return NextResponse.json(intent)
    } catch (error) {
        console.error('Error toggling intent:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
