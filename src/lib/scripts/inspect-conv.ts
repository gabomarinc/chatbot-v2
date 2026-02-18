
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const conv = await prisma.conversation.findFirst({
        where: { externalId: '1498445801990495' },
    });
    console.log('Conversation:', JSON.stringify(conv, null, 2));

    if (conv?.channelId) {
        const channel = await prisma.channel.findUnique({
            where: { id: conv.channelId }
        });
        console.log('Channel:', JSON.stringify(channel, null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
