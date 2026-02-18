
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const channels = await prisma.channel.findMany({
        where: { agentId: 'cml9nobjx0003l404k5jfbc5n' }
    });
    console.log('Channels for Omar:', JSON.stringify(channels, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
