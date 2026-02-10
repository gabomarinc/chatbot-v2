'use server'

import { prisma } from '@/lib/prisma';

/**
 * Gets Meta App ID with fallback to GlobalConfig
 * This is a server action that can be called from client components
 */
export async function getMetaAppId(): Promise<string> {
    // Priority 1: Environment variable (fastest)
    if (process.env.NEXT_PUBLIC_FACEBOOK_APP_ID) {
        return process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    }

    // Priority 2: Database fallback (for resilience)
    try {
        const config = await prisma.globalConfig.findUnique({
            where: { key: 'META_APP_ID' }
        });

        if (config?.value) {
            return config.value;
        }
    } catch (error) {
        console.error('Error fetching META_APP_ID from database:', error);
    }

    // Priority 3: Throw error if not found anywhere
    throw new Error('META_APP_ID not configured. Please set NEXT_PUBLIC_FACEBOOK_APP_ID environment variable or add META_APP_ID to GlobalConfig.');
}
