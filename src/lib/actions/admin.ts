'use server'

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function saveGlobalSettings(data: {
    openaiKey: string;
    googleKey: string;
    metaAppId?: string;
    instagramAppId?: string;
}) {
    const session = await auth();

    if (session?.user?.role !== 'SUPER_ADMIN') {
        throw new Error('Unauthorized');
    }

    try {
        await prisma.$transaction([
            prisma.globalConfig.upsert({
                where: { key: 'OPENAI_API_KEY' },
                update: { value: data.openaiKey },
                create: { key: 'OPENAI_API_KEY', value: data.openaiKey }
            }),
            prisma.globalConfig.upsert({
                where: { key: 'GOOGLE_API_KEY' },
                update: { value: data.googleKey },
                create: { key: 'GOOGLE_API_KEY', value: data.googleKey }
            }),
            prisma.globalConfig.upsert({
                where: { key: 'META_APP_ID' },
                update: { value: data.metaAppId || '' },
                create: { key: 'META_APP_ID', value: data.metaAppId || '' }
            }),
            prisma.globalConfig.upsert({
                where: { key: 'INSTAGRAM_APP_ID' },
                update: { value: data.instagramAppId || '' },
                create: { key: 'INSTAGRAM_APP_ID', value: data.instagramAppId || '' }
            })
        ]);

        revalidatePath('/admin/settings');
        return { success: true };
    } catch (error) {
        console.error('Error saving settings:', error);
        return { error: 'Failed to save settings' };
    }
}

export async function getGlobalSettings() {
    const session = await auth();

    if (session?.user?.role !== 'SUPER_ADMIN') {
        return null;
    }


    const configs = await prisma.globalConfig.findMany({
        where: {
            key: { in: ['OPENAI_API_KEY', 'GOOGLE_API_KEY', 'META_APP_ID', 'INSTAGRAM_APP_ID'] }
        }
    });

    const settings = {
        openaiKey: configs.find(c => c.key === 'OPENAI_API_KEY')?.value || '',
        googleKey: configs.find(c => c.key === 'GOOGLE_API_KEY')?.value || '',
        metaAppId: configs.find(c => c.key === 'META_APP_ID')?.value || '',
        instagramAppId: configs.find(c => c.key === 'INSTAGRAM_APP_ID')?.value || ''
    };

    return settings;
}

export async function getWorkspacesData() {
    const session = await auth();

    if (session?.user?.role !== 'SUPER_ADMIN') {
        throw new Error('Unauthorized');
    }

    const workspaces = await prisma.workspace.findMany({
        include: {
            owner: {
                select: {
                    name: true,
                    email: true
                }
            },
            creditBalance: true,
            _count: {
                select: {
                    agents: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return workspaces;
}

export async function getGlobalAgents() {
    const session = await auth();

    if (session?.user?.role !== 'SUPER_ADMIN') {
        throw new Error('Unauthorized');
    }

    const agents = await prisma.agent.findMany({
        include: {
            workspace: {
                select: {
                    name: true,
                    owner: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                }
            },
            channels: {
                select: {
                    type: true,
                    isActive: true
                }
            },
            _count: {
                select: {
                    conversations: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return agents;
}

export async function getGlobalUsageStats() {
    const session = await auth();

    if (session?.user?.role !== 'SUPER_ADMIN') {
        throw new Error('Unauthorized');
    }

    const usageLogs: any[] = await prisma.$queryRaw`
        SELECT * FROM "UsageLog" ORDER BY "createdAt" DESC
    `;

    return usageLogs;
}
