import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const EMAIL = 'demos@konsul.cloud'
    console.log(`--- Iniciando configuración para ${EMAIL} ---`)

    // 1. Crear el Plan Ilimitado (Invisible)
    let unlimitedPlan = await prisma.subscriptionPlan.findFirst({
        where: { name: 'Unlimited Demo' }
    })

    if (!unlimitedPlan) {
        console.log('Creando Plan Unlimited Demo...')
        unlimitedPlan = await prisma.subscriptionPlan.create({
            data: {
                name: 'Unlimited Demo',
                type: 'CUSTOM',
                monthlyPrice: 0,
                creditsPerMonth: 10000,
                maxAgents: 999,
                maxMembers: 99,
                isActive: false // Invisible para el público
            }
        })
        console.log('Plan creado con ID:', unlimitedPlan.id)
    } else {
        console.log('El Plan Unlimited Demo ya existe.')
    }

    // 2. Buscar al Usuario
    const user = await prisma.user.findUnique({
        where: { email: EMAIL },
        include: { workspaces: { include: { subscription: true } } }
    })

    if (!user) {
        console.log(`AVISO: El usuario ${EMAIL} aún no existe. El plan ya está creado y listo para cuando se registre.`)
        return
    }

    // 3. Asignar el plan al workspace del usuario
    const workspace = user.workspaces[0]
    if (!workspace) {
        console.log(`AVISO: El usuario existe pero no tiene un workspace creado.`)
        return
    }

    console.log(`Asignando plan al workspace: ${workspace.name} (${workspace.id})`)

    if (workspace.subscription) {
        await prisma.subscription.update({
            where: { id: workspace.subscription.id },
            data: {
                planId: unlimitedPlan.id,
                currentPeriodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 10)) // 10 años de duración
            }
        })
    } else {
        await prisma.subscription.create({
            data: {
                workspaceId: workspace.id,
                planId: unlimitedPlan.id,
                status: 'active',
                currentPeriodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 10))
            }
        })
    }

    console.log(`--- ÉXITO: Plan asignado correctamente a ${EMAIL} ---`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
