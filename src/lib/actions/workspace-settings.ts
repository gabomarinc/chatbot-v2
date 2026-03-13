'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function updateWorkspaceSettings(workspaceId: string, data: { name?: string }) {
    const session = await auth()
    if (!session?.user?.id) return { error: 'No autorizado' }

    // Check if user is OWNER or MANAGER of the workspace
    const membership = await prisma.workspaceMember.findFirst({
        where: {
            userId: session.user.id,
            workspaceId: workspaceId,
            role: { in: ['OWNER', 'MANAGER'] }
        }
    })

    if (!membership) {
        return { error: 'No tienes permisos para modificar este workspace' }
    }

    try {
        await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
                name: data.name
            }
        })

        revalidatePath('/settings')
        return { success: true }
    } catch (error) {
        console.error('Update workspace settings error:', error)
        return { error: 'Error al actualizar la configuración' }
    }
}
