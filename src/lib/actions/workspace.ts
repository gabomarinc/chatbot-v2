'use server'

import { prisma } from '@/lib/prisma'
import { getUserWorkspace } from './dashboard'
import { auth } from '@/auth'
import { cache } from 'react'

export async function getWorkspaceInfo() {
    const session = await auth()
    if (!session?.user?.id) return null

    const workspace = await getUserWorkspace()
    if (!workspace) return null

    // Get user membership info
    const membership = await prisma.workspaceMember.findFirst({
        where: {
            userId: session.user.id,
            workspaceId: workspace.id
        },
        select: {
            role: true
        }
    })

    // Get subscription and plan info
    const subscription = await prisma.subscription.findUnique({
        where: { workspaceId: workspace.id },
        include: {
            plan: {
                select: {
                    name: true,
                    type: true,
                    monthlyPrice: true,
                    creditsPerMonth: true,
                    maxAgents: true,
                    maxMembers: true
                }
            }
        }
    })

    // Count members
    const membersCount = await prisma.workspaceMember.count({
        where: { workspaceId: workspace.id }
    })

    // Count agents
    const agentsCount = await prisma.agent.count({
        where: { workspaceId: workspace.id }
    })

    return {
        id: workspace.id,
        name: workspace.name,
        createdAt: workspace.createdAt,
        role: membership?.role || 'AGENT',
        plan: subscription?.plan ? {
            name: subscription.plan.name,
            type: subscription.plan.type,
            price: subscription.plan.monthlyPrice,
            creditsPerMonth: subscription.plan.creditsPerMonth,
            maxAgents: subscription.plan.maxAgents,
            maxMembers: subscription.plan.maxMembers
        } : null,
        membersCount,
        agentsCount,
    }
}

// Get current user's workspace role (cached)
export const getUserWorkspaceRole = cache(async (): Promise<'OWNER' | 'MANAGER' | 'AGENT' | null> => {
    const session = await auth()
    if (!session?.user?.id) return null

    const workspace = await getUserWorkspace()
    if (!workspace) return null

    const membership = await prisma.workspaceMember.findFirst({
        where: {
            userId: session.user.id,
            workspaceId: workspace.id
        },
        select: {
            role: true
        }
    })

    return membership?.role || null
})

