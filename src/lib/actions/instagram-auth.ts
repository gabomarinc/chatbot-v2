'use server'

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const META_API_VERSION = 'v19.0';

/**
 * 1. Exchanges short-lived token for long-lived one
 * 2. Fetches Pages and their linked Instagram Accounts
 */
/**
 * 1. Exchanges short-lived IG User Token for long-lived one
 * 2. Fetches the Instagram User Profile (Business)
 */
export async function getInstagramAccounts(shortLivedToken: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    let debugLog: string[] = [];

    try {
        // Use INSTAGRAM App Secret
        const appSecret = process.env.INSTAGRAM_APP_SECRET;
        const config = await prisma.globalConfig.findUnique({ where: { key: 'INSTAGRAM_APP_ID' } });
        const appId = config?.value;

        if (!appSecret || !appId) {
            throw new Error('Server configuration missing (Instagram App ID or Secret)');
        }

        // 1. Exchange for Long-Lived Instagram User Access Token
        // Endpoint: https://graph.instagram.com/access_token
        debugLog.push('Exchanging token via graph.instagram.com...');

        const tokenUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`;

        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
            debugLog.push(`Token error: ${JSON.stringify(tokenData)}`);
            throw new Error(tokenData.error?.message || 'Failed to exchange token');
        }

        const longLivedToken = tokenData.access_token;
        debugLog.push('Long-lived token exchanged.');

        // 2. Fetch Instagram User Profile
        // We need to confirm this is a Business/Professional account
        // Endpoint: https://graph.instagram.com/me
        const fields = 'id,username,account_type,media_count,followers_count,profile_picture_url';
        const profileUrl = `https://graph.instagram.com/me?fields=${fields}&access_token=${longLivedToken}`;

        debugLog.push(`Fetching profile via: ${profileUrl.replace(longLivedToken, '***')}`);

        const profileRes = await fetch(profileUrl);
        const profileData = await profileRes.json();

        if (!profileRes.ok) {
            debugLog.push(`Profile fetch error: ${JSON.stringify(profileData)}`);
            throw new Error(profileData.error?.message || 'Failed to fetch profile');
        }

        debugLog.push(`Profile fetched: ${profileData.username} (${profileData.account_type})`);

        // We return this as the "Account" to connect
        // Note: account_type should be BUSINESS or CREATOR
        const account = {
            id: profileData.id, // Instagram User ID
            name: profileData.username,
            pageId: profileData.id, // Fallback: Use IG ID as Page ID since we don't have a linked Page ID
            pageAccessToken: longLivedToken,
            accountType: profileData.account_type
        };

        return {
            success: true,
            accounts: [account],
            debug: debugLog
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

        // 2. Verify Token & Fetch Profile Data for Meta Review Display
        // Using Instagram Graph API
        const verifyRes = await fetch(
            `https://graph.instagram.com/me?fields=id,username,media_count,account_type,followers_count,profile_picture_url&access_token=${data.pageAccessToken}`
        );

        if (!verifyRes.ok) {
            const errData = await verifyRes.json();
            console.error('Verify Token Failed:', JSON.stringify(errData));
            throw new Error(`Meta validation failed: ${errData.error?.message || 'Invalid token'}`);
        }

        const profileData = await verifyRes.json();
        console.log('IG Profile Data fetched:', JSON.stringify(profileData));

        // 2.5 Subscribe Page to App (Enable Webhooks)
        // Note: For "Instagram Login" flow, we use the IG User Token to subscribe.
        // We try calling the node's subscribed_apps edge on graph.instagram.com
        try {
            const subscribeUrl = `https://graph.instagram.com/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=${data.pageAccessToken}`;
            console.log('Subscribing to webhooks via:', subscribeUrl.replace(data.pageAccessToken, '***'));

            const subscribeRes = await fetch(subscribeUrl, { method: 'POST' });
            const subscribeData = await subscribeRes.json();

            if (!subscribeRes.ok) {
                console.error('Webhook Subscription Failed:', JSON.stringify(subscribeData));
                // We don't throw, but we LOG explicitly so we know.
            } else {
                console.log('Webhook Subscribed Successfully:', JSON.stringify(subscribeData));
            }
        } catch (e: any) {
            console.log('Webhook subscription exception:', e.message);
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
            verifyToken: Math.random().toString(36).substring(7),
            // Store profile metadata
            username: profileData.username,
            profilePictureUrl: profileData.profile_picture_url || '',
            followersCount: profileData.followers_count || 0,
            biography: '' // biography not always available on 'me'
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
        const res = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${pageAccessToken}`);
        const data = await res.json();

        if (!res.ok) {
            return { success: false, error: data.error?.message || 'Token invalido' };
        }

        return { success: true, name: data.username };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
