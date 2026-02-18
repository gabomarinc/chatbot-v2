
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const agents = await prisma.agent.findMany();
    console.log('Agents:', JSON.stringify(agents.map(a => ({ id: a.id, name: a.name, workspaceId: a.workspaceId })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
