'use server';

import { prisma } from '@/lib/prisma';
import { getUserWorkspace } from './workspace';

export async function updateAgentSettings(agentId: string, data: {
    smartRetrieval?: boolean;
    temperature?: number;
    transferToHuman?: boolean;
}) {
    const workspace = await getUserWorkspace();
    if (!workspace) throw new Error('Unauthorized');

    // Verify agent belongs to workspace
    const agent = await prisma.agent.findFirst({
        where: {
            id: agentId,
            workspaceId: workspace.id
        }
    });

    if (!agent) throw new Error('Agent not found or unauthorized');

    return await prisma.agent.update({
        where: { id: agentId },
        data: {
            smartRetrieval: data.smartRetrieval,
            temperature: data.temperature,
            transferToHuman: data.transferToHuman
        }
    });
}
