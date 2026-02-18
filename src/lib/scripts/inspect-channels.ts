
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const channels = await prisma.channel.findMany();
    console.log('All Channels:', JSON.stringify(channels.map(c => ({ id: c.id, type: c.type, name: c.displayName })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
