'use server'

import { getGoogleAuthUrl } from '@/lib/google';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { encryptFields, decryptFields } from '@/lib/crypto';

const SENSITIVE_INTEGRATION_FIELDS = ['apiKey', 'connectionString', 'apiSecret', 'password', 'token'];

export async function initiateGoogleAuth(agentId: string) {
    const url = getGoogleAuthUrl(agentId);
    return { url };
}

export async function getAgentIntegrations(agentId: string) {
    const integrations = await prisma.agentIntegration.findMany({
        where: { agentId }
    });

    return integrations.map(integ => ({
        ...integ,
        configJson: decryptFields(integ.configJson as any, SENSITIVE_INTEGRATION_FIELDS)
    }));
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
    // Encrypt sensitive fields
    const encryptedConfig = encryptFields(config, SENSITIVE_INTEGRATION_FIELDS);

    const integration = await prisma.agentIntegration.upsert({
        where: {
            agentId_provider: {
                agentId,
                provider: 'ODOO'
            }
        },
        update: {
            configJson: encryptedConfig as any,
            enabled: true
        },
        create: {
            agentId,
            provider: 'ODOO',
            configJson: encryptedConfig as any,
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

export async function saveNeonCatalogIntegration(
    agentId: string,
    config: { connectionString: string; tableName: string; description?: string }
) {
    try {
        console.log(`[INTEGRATIONS] Saving Neon Catalog for agent ${agentId}`);

        // Encrypt sensitive fields
        const encryptedConfig = encryptFields(config, SENSITIVE_INTEGRATION_FIELDS);

        const integration = await prisma.agentIntegration.upsert({
            where: {
                agentId_provider: {
                    agentId,
                    provider: 'NEON_CATALOG'
                }
            },
            update: {
                configJson: encryptedConfig as any,
                enabled: true
            },
            create: {
                agentId,
                provider: 'NEON_CATALOG',
                configJson: encryptedConfig as any,
                enabled: true
            }
        });

        revalidatePath(`/agents/${agentId}/settings`);
        return integration;
    } catch (error: any) {
        console.error('[INTEGRATIONS] Error saving Neon Catalog:', error);
        throw error;
    }
}

export async function testNeonCatalogConnection(
    connectionString: string,
    tableName: string
): Promise<{ ok: boolean; columns?: string[]; preview?: any[]; error?: string }> {
    try {
        const { testNeonConnection } = await import('@/lib/neon-catalog');
        return await testNeonConnection(connectionString, tableName);
    } catch (err: any) {
        return { ok: false, error: err.message };
    }
}

export async function getIntegrationStats(agentId: string, provider: 'ZOHO' | 'ODOO' | 'HUBSPOT' | 'ALTAPLAZA' | 'GOOGLE_CALENDAR' | 'NEON_CATALOG') {
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

export async function saveEmailIMAPIntegration(
    agentId: string,
    config: { host: string; port: number; secure: boolean; user: string; password?: string }
) {
    try {
        // Encrypt sensitive fields (especially password)
        const encryptedConfig = encryptFields(config, SENSITIVE_INTEGRATION_FIELDS);

        const integration = await prisma.agentIntegration.upsert({
            where: {
                agentId_provider: {
                    agentId,
                    provider: 'EMAIL_IMAP'
                }
            },
            update: {
                configJson: encryptedConfig as any,
                enabled: true
            },
            create: {
                agentId,
                provider: 'EMAIL_IMAP',
                configJson: encryptedConfig as any,
                enabled: true
            }
        });

        revalidatePath(`/agents/${agentId}/settings`);
        return { success: true, integration };
    } catch (error: any) {
        console.error('[INTEGRATIONS] Error saving Email IMAP:', error);
        return { success: false, error: error.message };
    }
}

export async function testEmailIMAPConnection(config: any) {
    try {
        const { ImapFlow } = await import('imapflow');

        // Decrypt password if it's already encrypted
        const decryptedConfig = decryptFields(config, SENSITIVE_INTEGRATION_FIELDS);

        const client = new ImapFlow({
            host: decryptedConfig.host,
            port: parseInt(decryptedConfig.port),
            secure: decryptedConfig.secure,
            auth: {
                user: decryptedConfig.user,
                pass: decryptedConfig.password
            },
            logger: false,
            // Low timeout for testing
            connectionTimeout: 10000,
            greetingTimeout: 5000
        });

        await client.connect();
        await client.logout();

        return { ok: true };
    } catch (err: any) {
        console.error('[IMAP_TEST] Connection failed:', err);
        return { ok: false, error: err.message };
    }
}
