import { MediaClient } from '@/components/agents/MediaClient'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function AgentMediaPage({ params }: { params: Promise<{ agentId: string }> }) {
    const { agentId } = await params

    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
            media: {
                orderBy: { createdAt: 'desc' }
            }
        }
    })

    if (!agent) {
        notFound()
    }

    // Serialize dates for client component
    const serializedMedia = agent.media.map(media => ({
        ...media,
        createdAt: media.createdAt,
        updatedAt: media.updatedAt
    }))

    return <MediaClient agentId={agent.id} media={serializedMedia} />
}

