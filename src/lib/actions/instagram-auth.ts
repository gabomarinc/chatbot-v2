'use server'

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const META_API_VERSION = 'v19.0';

/**
 * 1. Exchanges short-lived token for long-lived one
 * 2. Fetches Pages and their linked Instagram Accounts
 */
export async function getInstagramAccounts(shortLivedToken: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    let debugLog: string[] = [];

    try {
        const appSecret = process.env.META_APP_SECRET;
        const config = await prisma.globalConfig.findUnique({ where: { key: 'META_APP_ID' } });
        const appId = config?.value;

        if (!appSecret || !appId) {
            throw new Error('Server configuration missing (Meta App ID or Secret)');
        }

        // 1. Exchange for Long-Lived User Access Token
        debugLog.push('Exchanging token...');
        const tokenRes = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
        );
        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
            debugLog.push(`Token error: ${JSON.stringify(tokenData)}`);
            throw new Error(tokenData.error?.message || 'Failed to exchange token');
        }

        const longLivedToken = tokenData.access_token;
        debugLog.push('Token exchanged.');

        // 2. Fetch Pages with Instagram Business Accounts
        // Trying fields specifically for discovery
        const fields = 'name,access_token,instagram_business_account,connected_instagram_account';
        const pagesUrl = `https://graph.facebook.com/${META_API_VERSION}/me/accounts?fields=${fields}&access_token=${longLivedToken}`;

        debugLog.push(`Fetching pages via: ${pagesUrl.replace(longLivedToken, '***')}`);

        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();

        if (!pagesRes.ok) {
            debugLog.push(`Pages fetch error: ${JSON.stringify(pagesData)}`);
            throw new Error(pagesData.error?.message || 'Failed to fetch pages');
        }

        debugLog.push(`Found ${pagesData.data?.length || 0} pages`);

        // Filter pages that have a connected Instagram account
        let connectedAccounts = (pagesData.data || [])
            .filter((page: any) => {
                const hasIg = !!page.instagram_business_account;
                if (!hasIg) {
                    debugLog.push(`Page "${page.name}" has no linked IG Business Account.`);
                } else {
                    debugLog.push(`Page "${page.name}" HAS IG: ${page.instagram_business_account.id}`);
                }
                return hasIg;
            })
            .map((page: any) => ({
                id: page.instagram_business_account.id, // Instagram ID
                name: page.name, // Page Name (usually matches)
                pageId: page.id,
                pageAccessToken: page.access_token || longLivedToken // Fallback to User Token if Page Token missing
            }));

        // FALLBACK: If no accounts found via standard /me/accounts (due to missing pages_show_list), try via Businesses
        if (connectedAccounts.length === 0) {
            debugLog.push('Standard page fetch empty. Attempting Business Manager Fallback...');

            try {
                // 1. Get User's Businesses
                const bizRes = await fetch(
                    `https://graph.facebook.com/${META_API_VERSION}/me/businesses?access_token=${longLivedToken}`
                );
                const bizData = await bizRes.json();

                if (bizData.data && bizData.data.length > 0) {
                    debugLog.push(`Found ${bizData.data.length} Businesses. Scanning pages inside...`);

                    for (const biz of bizData.data) {
                        try {
                            // 2. Get Pages owned by Business (needs business_management)
                            // We ask for the same fields: instagram_business_account + access_token
                            const bizPagesUrl = `https://graph.facebook.com/${META_API_VERSION}/${biz.id}/owned_pages?fields=name,access_token,instagram_business_account&access_token=${longLivedToken}`;
                            const bizPagesRes = await fetch(bizPagesUrl);
                            const bizPagesData = await bizPagesRes.json();

                            if (bizPagesData.data) {
                                debugLog.push(`Business "${biz.name}" has ${bizPagesData.data.length} owned pages.`);

                                const bizAccounts = bizPagesData.data
                                    .filter((page: any) => !!page.instagram_business_account)
                                    .map((page: any) => {
                                        let finalToken = page.access_token;
                                        if (!finalToken) {
                                            debugLog.push(`WARNING: Page "${page.name}" missing Page Token. Using User Token as fallback.`);
                                            finalToken = longLivedToken;
                                        }
                                        return {
                                            id: page.instagram_business_account.id,
                                            name: page.name,
                                            pageId: page.id,
                                            pageAccessToken: finalToken
                                        };
                                    });

                                if (bizAccounts.length > 0) {
                                    debugLog.push(`Found ${bizAccounts.length} IG accounts in Business "${biz.name}"`);
                                    connectedAccounts = [...connectedAccounts, ...bizAccounts];
                                }
                            }
                        } catch (e: any) {
                            debugLog.push(`Error scanning Biz "${biz.name}": ${e.message}`);
                        }
                    }
                } else {
                    debugLog.push('No Businesses found.');
                }
            } catch (e: any) {
                debugLog.push(`Business Fallback Error: ${e.message}`);
            }
        }

        // Remove duplicates (by ID)
        connectedAccounts = Array.from(new Map(connectedAccounts.map((item: any) => [item.id, item])).values());

        return {
            success: true,
            accounts: connectedAccounts,
            debug: debugLog // Return debugging info
        };

    } catch (error: any) {
        console.error('Get Instagram Accounts Error:', error);
        return {
            error: error.message || 'Error fetching Instagram accounts',
            debug: debugLog
        };
    }
}

/**
 * Connects the selected Instagram account to the Agent
 */
export async function connectInstagramAccount(data: {
    agentId: string;
    accountId: string;
    pageId: string;
    pageAccessToken: string;
    name: string;
}) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        console.log('Connect Instagram Account called with:', JSON.stringify(data, null, 2));

        // 1. Get Workspace
        // 1. Get Workspace (Robust lookup via membership)
        const membership = await prisma.workspaceMember.findFirst({
            where: { userId: session.user.id },
            include: { workspace: true }
        });
        const workspace = membership?.workspace;

        if (!workspace) {
            console.error('Workspace not found for user:', session.user.id);
            throw new Error('Workspace not found');
        }

        // 2. Verify Token (Double check it works)
        // We can do a quick call to get the account info to ensure permissions are active
        const verifyRes = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/${data.accountId}?fields=username&access_token=${data.pageAccessToken}`
        );

        if (!verifyRes.ok) {
            const errData = await verifyRes.json();
            console.error('Verify Token Failed:', JSON.stringify(errData));
            throw new Error(`Meta validation failed: ${errData.error?.message || 'Invalid token'}`);
        }

        // 3. Save/Update Channel
        // Logic Update: Search based on INSTAGRAM ACCOUNT ID to allow multiple accounts (one per channel)
        const allChannels = await prisma.channel.findMany({
            where: {
                type: 'INSTAGRAM',
                agent: { workspaceId: workspace.id }
            }
        });

        const existingChannel = allChannels.find(c => (c.configJson as any)?.instagramAccountId === data.accountId);

        const configJson = {
            pageAccessToken: data.pageAccessToken,
            instagramAccountId: data.accountId,
            pageId: data.pageId,
            verifyToken: Math.random().toString(36).substring(7)
        };

        if (existingChannel) {
            await prisma.channel.update({
                where: { id: existingChannel.id },
                data: {
                    agentId: data.agentId, // Allow switching agent
                    displayName: `IG: ${data.name}`,
                    configJson: configJson as any,
                    isActive: true
                }
            });
        } else {
            await prisma.channel.create({
                data: {
                    agent: { connect: { id: data.agentId } },
                    type: 'INSTAGRAM',
                    displayName: `IG: ${data.name}`,
                    configJson: configJson as any,
                    isActive: true
                }
            });
            console.log('Channel created successfully');
        }

        revalidatePath('/channels');
        revalidatePath(`/agents/${data.agentId}`);
        return { success: true };

    } catch (error: any) {
        console.error('Connect Instagram Error:', error);
        // Add detailed error logging
        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
        }
        return { error: error.message || 'Error connecting Instagram account' };
    }
}

export async function testInstagramConnection(pageAccessToken: string) {
    try {
        const res = await fetch(`https://graph.facebook.com/${META_API_VERSION}/me?fields=id,name&access_token=${pageAccessToken}`);
        const data = await res.json();

        if (!res.ok) {
            return { success: false, error: data.error?.message || 'Token invalido' };
        }

        return { success: true, name: data.name };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
