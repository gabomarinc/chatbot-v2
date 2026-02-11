'use server'

import { getGoogleAuthUrl } from '@/lib/google';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function initiateGoogleAuth(agentId: string) {
    const url = getGoogleAuthUrl(agentId);
    return { url };
}

export async function getAgentIntegrations(agentId: string) {
    return prisma.agentIntegration.findMany({
        where: { agentId }
    });
}

export async function toggleIntegration(integrationId: string, enabled: boolean) {
    const integration = await prisma.agentIntegration.update({
        where: { id: integrationId },
        data: { enabled }
    });

    revalidatePath(`/agents/${integration.agentId}/settings`);
    return integration;
}

export async function deleteIntegration(integrationId: string) {
    const integration = await prisma.agentIntegration.delete({
        where: { id: integrationId }
    });
    revalidatePath(`/agents/${integration.agentId}/settings`);
    return integration;
}

export async function saveOdooIntegration(agentId: string, config: { url: string; db: string; username: string; apiKey: string }) {
    const integration = await prisma.agentIntegration.upsert({
        where: {
            agentId_provider: {
                agentId,
                provider: 'ODOO'
            }
        },
        update: {
            configJson: config as any,
            enabled: true
        },
        create: {
            agentId,
            provider: 'ODOO',
            configJson: config as any,
            enabled: true
        }
    });

    revalidatePath(`/agents/${agentId}/settings`);
    return integration;
}
