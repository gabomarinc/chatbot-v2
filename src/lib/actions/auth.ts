'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export async function registerUser(prevState: any, formData: FormData) {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const validatedFields = registerSchema.safeParse({
        name,
        email,
        password,
    })

    if (!validatedFields.success) {
        return {
            error: validatedFields.error.flatten().fieldErrors,
        }
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return {
                error: { email: ['Este correo ya está registrado'] },
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        // Create user and a default workspace in a transaction
        await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    passwordHash: hashedPassword,
                },
            })

            const workspace = await tx.workspace.create({
                data: {
                    name: `Mi Workspace`,
                    ownerId: user.id,
                },
            })

            await tx.workspaceMember.create({
                data: {
                    userId: user.id,
                    workspaceId: workspace.id,
                    role: 'OWNER',
                },
            })

            // Create a default credit balance
            await tx.creditBalance.create({
                data: {
                    workspaceId: workspace.id,
                    balance: 5000, // Initial credits from Freshie plan
                },
            })

            // Get the Freshie plan (default for new users)
            const freshiePlan = await tx.subscriptionPlan.findFirst({
                where: { type: 'FRESHIE' }
            });

            if (freshiePlan) {
                // Create a default subscription with Freshie plan
                const nextMonth = new Date()
                nextMonth.setMonth(nextMonth.getMonth() + 1)

                await tx.subscription.create({
                    data: {
                        workspaceId: workspace.id,
                        planId: freshiePlan.id,
                        status: 'active',
                        currentPeriodEnd: nextMonth,
                    }
                })
            }
        })

        return { success: true }
    } catch (err) {
        console.error('Registration error:', err)
        return {
            error: { form: ['Ocurrió un error inesperado. Inténtalo de nuevo.'] },
        }
    }
}

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
})

export async function changePassword(userId: string, currentPassword: string, newPassword: string, confirmPassword: string) {
    try {
        const validatedFields = changePasswordSchema.safeParse({
            currentPassword,
            newPassword,
            confirmPassword,
        })

        if (!validatedFields.success) {
            return {
                error: validatedFields.error.flatten().fieldErrors,
            }
        }

        // Get user with password hash
        const user = await prisma.user.findUnique({
            where: { id: userId },
        })

        if (!user) {
            return {
                error: { form: ['Usuario no encontrado'] },
            }
        }

        // Verify current password
        const passwordsMatch = await bcrypt.compare(currentPassword, user.passwordHash)
        if (!passwordsMatch) {
            return {
                error: { currentPassword: ['La contraseña actual es incorrecta'] },
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: hashedPassword,
            },
        })

        return { success: true }
    } catch (err) {
        console.error('Change password error:', err)
        return {
            error: { form: ['Ocurrió un error inesperado. Inténtalo de nuevo.'] },
        }
    }
}
