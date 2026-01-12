'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function hasSeenAgentTour() {
    const session = await auth()
    if (!session?.user?.id || !session?.user?.email) return false

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { hasSeenAgentTour: true }
    })

    return user?.hasSeenAgentTour || false
}

export async function markAgentTourSeen() {
    const session = await auth()
    if (!session?.user?.email) return

    await prisma.user.update({
        where: { email: session.user.email },
        data: { hasSeenAgentTour: true }
    })

    revalidatePath('/agents/[agentId]')
}
