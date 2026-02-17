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

export async function saveAltaplazaIntegration(agentId: string) {
    const integration = await prisma.agentIntegration.upsert({
        where: {
            agentId_provider: {
                agentId,
                provider: 'ALTAPLAZA'
            }
        },
        update: {
            configJson: {},
            enabled: true
        },
        create: {
            agentId,
            provider: 'ALTAPLAZA',
            configJson: {},
            enabled: true
        }
    });

    revalidatePath(`/agents/${agentId}/settings`);
    return integration;
}

export async function getIntegrationStats(agentId: string, provider: 'ZOHO' | 'ODOO' | 'HUBSPOT' | 'ALTAPLAZA' | 'GOOGLE_CALENDAR') {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    last7Days.setHours(0, 0, 0, 0);

    const integration = await prisma.agentIntegration.findFirst({
        where: { agentId, provider }
    });

    if (!integration) return null;

    const [eventsWeekly, lastEvent] = await Promise.all([
        prisma.integrationEvent.count({
            where: {
                agentId,
                provider: provider as any,
                createdAt: { gte: last7Days },
                status: 'SUCCESS'
            }
        }),
        prisma.integrationEvent.findFirst({
            where: { agentId, provider: provider as any },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    // Health is excellent if no errors in last 24h
    const errorsLast24h = await prisma.integrationEvent.count({
        where: {
            agentId,
            provider,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            status: 'ERROR'
        }
    });

    return {
        enabled: integration.enabled,
        lastSync: integration.updatedAt,
        eventsWeekly,
        lastEventAt: lastEvent?.createdAt || null,
        health: errorsLast24h > 0 ? 'WARNING' : 'EXCELLENT'
    };
}
