
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking Agent...");

    const agentId = 'cmjj10f9l0010lw65unx0aun1';
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: { customFieldDefinitions: true }
    });

    if (agent) {
        console.log(`Agent ${agent.id} found.`);
        console.log(`Agent Name: ${agent.name}`);
        console.log(`Agent Workspace ID: ${agent.workspaceId}`);
        console.log(`Agent Custom Fields:`, agent.customFieldDefinitions.map(f => f.key));
    } else {
        console.log("Agent not found.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
