
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking CustomFieldDefinitions...");

    // Check all Agents in workspace-1
    const agents = await prisma.agent.findMany({
        where: { workspaceId: 'workspace-1' },
        include: { customFieldDefinitions: true }
    });

    console.log(`Found ${agents.length} agents in workspace-1`);

    agents.forEach(a => {
        console.log(`Agent ${a.id} (${a.name}):`);
        console.log(`  Custom Fields:`, a.customFieldDefinitions);
    });

    // Also check if there are orphan definitions or definitions on other agents
    const allDefs = await prisma.customFieldDefinition.findMany();
    console.log(`Total CustomFieldDefinitions in DB: ${allDefs.length}`);
    if (allDefs.length > 0) {
        console.log("Sample Defs:", allDefs.slice(0, 3));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
