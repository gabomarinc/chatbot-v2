'use server'

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const META_API_VERSION = 'v21.0';

/**
 * Exchanges the temporary code for a long-lived user access token,
 * fetches WABA and Phone Number info, and registers it.
 */
export async function handleEmbeddedSignup(data: {
    code: string;
    agentId: string;
}) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        // 1. Get Meta App Secret from env
        const appSecret = process.env.META_APP_SECRET;
        const appId = await getMetaAppId();

        if (!appSecret || !appId) {
            throw new Error('Meta App Configuration missing (ID or Secret)');
        }

        // 2. Exchange code for Access Token
        // Para Embedded Signup, no necesitamos redirect_uri en el intercambio
        // POST /v21.0/oauth/access_token?client_id={app-id}&client_secret={app-secret}&code={code}
        const tokenRes = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${data.code}&redirect_uri=`
        );
        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) throw new Error(tokenData.error?.message || 'Token exchange failed');
        const userAccessToken = tokenData.access_token;

        // 3. Get WABA ID (Sharing permissions)
        // Since we used Embedded Signup, the user granted permissions to their WABA.
        // We can find the WABA associated with this token.
        const debugRes = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/debug_token?input_token=${userAccessToken}&access_token=${appId}|${appSecret}`
        );
        const debugData = await debugRes.json();

        // Find the WABA ID in granular_scopes or metadata if available, 
        // or fetch from /me/whatsapp_business_accounts
        const wabaRes = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/me/whatsapp_business_accounts?access_token=${userAccessToken}`
        );
        const wabaData = await wabaRes.json();
        const wabaId = wabaData.data?.[0]?.id;

        if (!wabaId) throw new Error('No WhatsApp Business Account found for this user');

        // 4. Get Phone Number ID
        const phoneRes = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/phone_numbers?access_token=${userAccessToken}`
        );
        const phoneData = await phoneRes.json();
        const phoneNumberId = phoneData.data?.[0]?.id;

        if (!phoneNumberId) throw new Error('No verified phone number found in the WABA');

        // 5. Register the phone number (Required for Cloud API)
        await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/register`,
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userAccessToken}` },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    pin: '000000' // Default or prompted if needed
                })
            }
        );

        // 6. Save/Update Channel
        const workspace = await prisma.workspace.findFirst({
            where: { ownerId: session.user.id }
        });

        if (!workspace) throw new Error('Workspace not found');

        const existingChannel = await prisma.channel.findFirst({
            where: {
                type: 'WHATSAPP',
                agent: { workspaceId: workspace.id }
            }
        });

        const configJson = {
            accessToken: userAccessToken,
            phoneNumberId,
            wabaId,
            verifyToken: Math.random().toString(36).substring(7)
        };

        if (existingChannel) {
            await prisma.channel.update({
                where: { id: existingChannel.id },
                data: {
                    agentId: data.agentId,
                    configJson: configJson as any,
                    isActive: true
                }
            });
        } else {
            await prisma.channel.create({
                data: {
                    agent: { connect: { id: data.agentId } },
                    type: 'WHATSAPP',
                    displayName: 'WhatsApp Business',
                    configJson: configJson as any,
                    isActive: true
                }
            });
        }

        revalidatePath('/channels');
        return { success: true };

    } catch (error: any) {
        console.error('Embedded Signup Error:', error);
        return { error: error.message || 'Error al procesar el registro de WhatsApp' };
    }
}

async function getMetaAppId() {
    const config = await prisma.globalConfig.findUnique({
        where: { key: 'META_APP_ID' }
    });
    return config?.value;
}
