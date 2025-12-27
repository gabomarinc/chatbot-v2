'use server'

import { prisma } from '@/lib/prisma'
import { getUserWorkspace } from './dashboard'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { sendTeamInvitationEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'

// Get user's role in workspace
async function getUserWorkspaceRole(workspaceId: string) {
    const session = await auth()
    if (!session?.user?.id) return null

    const membership = await prisma.workspaceMember.findFirst({
        where: {
            userId: session.user.id,
            workspaceId
        },
        select: {
            role: true
        }
    })

    return membership?.role || null
}

// Check if user can invite members (OWNER or MANAGER)
async function canInviteMembers(workspaceId: string): Promise<boolean> {
    const role = await getUserWorkspaceRole(workspaceId)
    return role === 'OWNER' || role === 'MANAGER'
}

// Check if user can create agents
export async function canCreateAgents(): Promise<boolean> {
    const workspace = await getUserWorkspace()
    if (!workspace) return false

    const role = await getUserWorkspaceRole(workspace.id)
    return role === 'OWNER' || role === 'MANAGER'
}

// Check if user can manage agents (edit/delete)
export async function canManageAgents(): Promise<boolean> {
    const workspace = await getUserWorkspace()
    if (!workspace) return false

    const role = await getUserWorkspaceRole(workspace.id)
    return role === 'OWNER' || role === 'MANAGER'
}

// Check if user can assume conversations
export async function canAssumeConversations(): Promise<boolean> {
    // All members can assume conversations
    const workspace = await getUserWorkspace()
    return workspace !== null
}

// Invite team member
export async function inviteTeamMember(email: string, role: 'MANAGER' | 'AGENT') {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: 'No autorizado' }
        }

        const workspace = await getUserWorkspace()
        if (!workspace) {
            return { error: 'Workspace no encontrado' }
        }

        // Check permissions
        const canInvite = await canInviteMembers(workspace.id)
        if (!canInvite) {
            return { error: 'No tienes permisos para invitar miembros' }
        }

        // Get subscription and plan
        const subscription = await prisma.subscription.findUnique({
            where: { workspaceId: workspace.id },
            include: { plan: true }
        })

        if (!subscription?.plan) {
            return { error: 'No se encontró el plan de suscripción' }
        }

        // Check current member count
        const currentMemberCount = await prisma.workspaceMember.count({
            where: { workspaceId: workspace.id }
        })

        // Check if we're at the limit
        if (currentMemberCount >= subscription.plan.maxMembers) {
            return { 
                error: `Has alcanzado el límite de miembros para tu plan (${subscription.plan.maxMembers} miembros). Por favor, actualiza tu plan para invitar más miembros.`
            }
        }

        // Get inviter info
        const inviter = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, email: true }
        })

        // Check if user already exists
        let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        })

        let isNewUser = false
        if (!user) {
            // Create new user with temporary password
            const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)
            const hashedPassword = await bcrypt.hash(tempPassword, 10)

            user = await prisma.user.create({
                data: {
                    email: email.toLowerCase().trim(),
                    passwordHash: hashedPassword,
                    // User will need to set password on first login
                }
            })
            isNewUser = true
        }

        // Check if user is already a member
        const existingMember = await prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId: user.id,
                    workspaceId: workspace.id
                }
            }
        })

        if (existingMember) {
            return { error: 'Este usuario ya es miembro del workspace' }
        }

        // Add user to workspace
        await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId: workspace.id,
                role
            }
        })

        // Send invitation email (don't block on error)
        try {
            await sendTeamInvitationEmail(
                email,
                workspace.name,
                inviter?.name || inviter?.email || 'Un administrador',
                role,
                isNewUser
            )
        } catch (emailError) {
            console.error('Error sending invitation email:', emailError)
            // Continue even if email fails - user is already added
        }

        revalidatePath('/team')
        return { success: true }
    } catch (error: any) {
        console.error('Error inviting team member:', error)
        return { error: error.message || 'Error al invitar miembro' }
    }
}

// Remove team member
export async function removeTeamMember(memberId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: 'No autorizado' }
        }

        const workspace = await getUserWorkspace()
        if (!workspace) {
            return { error: 'Workspace no encontrado' }
        }

        // Check permissions
        const canInvite = await canInviteMembers(workspace.id)
        if (!canInvite) {
            return { error: 'No tienes permisos para eliminar miembros' }
        }

        // Get member to remove
        const member = await prisma.workspaceMember.findFirst({
            where: {
                id: memberId,
                workspaceId: workspace.id
            },
            include: {
                user: {
                    select: { id: true }
                }
            }
        })

        if (!member) {
            return { error: 'Miembro no encontrado' }
        }

        // Cannot remove workspace owner
        if (workspace.ownerId === member.user.id) {
            return { error: 'No puedes eliminar al propietario del workspace' }
        }

        // Cannot remove yourself
        if (member.user.id === session.user.id) {
            return { error: 'No puedes eliminar tu propia cuenta. Contacta a otro administrador.' }
        }

        // Remove member
        await prisma.workspaceMember.delete({
            where: { id: memberId }
        })

        revalidatePath('/team')
        return { success: true }
    } catch (error: any) {
        console.error('Error removing team member:', error)
        return { error: error.message || 'Error al eliminar miembro' }
    }
}

// Update team member role
export async function updateTeamMemberRole(memberId: string, newRole: 'OWNER' | 'MANAGER' | 'AGENT') {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: 'No autorizado' }
        }

        const workspace = await getUserWorkspace()
        if (!workspace) {
            return { error: 'Workspace no encontrado' }
        }

        // Check permissions (only OWNER can change roles)
        const role = await getUserWorkspaceRole(workspace.id)
        if (role !== 'OWNER') {
            return { error: 'Solo el propietario puede cambiar roles' }
        }

        // Get member to update
        const member = await prisma.workspaceMember.findFirst({
            where: {
                id: memberId,
                workspaceId: workspace.id
            },
            include: {
                user: {
                    select: { id: true }
                }
            }
        })

        if (!member) {
            return { error: 'Miembro no encontrado' }
        }

        // Cannot change owner role
        if (workspace.ownerId === member.user.id && newRole !== 'OWNER') {
            return { error: 'No puedes cambiar el rol del propietario del workspace' }
        }

        // Update role
        await prisma.workspaceMember.update({
            where: { id: memberId },
            data: { role: newRole }
        })

        revalidatePath('/team')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating team member role:', error)
        return { error: error.message || 'Error al actualizar rol' }
    }
}

