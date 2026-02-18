
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const messages = await prisma.message.findMany({
        where: { conversationId: 'cmljsycs90001ks04bh0166yt' },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
    console.log('Messages:', JSON.stringify(messages, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
