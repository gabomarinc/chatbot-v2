import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const agents = await prisma.agent.findMany({
        where: { name: { contains: 'Hopsa', mode: 'insensitive' } },
        include: {
            customFieldDefinitions: true
        }
    })

    console.log(JSON.stringify(agents, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
