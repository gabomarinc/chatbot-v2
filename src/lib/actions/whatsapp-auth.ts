'use server'

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const META_API_VERSION = 'v21.0';

/**
 * Exchanges the temporary code for a long-lived user access token,
 * fetches WABA and Phone Number info, and registers it.
 */
/**
 * Exchanges the temporary code for a long-lived user access token,
 * fetches WABA and Phone Number info.
 * If multiple accounts are found, returns them for selection.
 * If single account found, registers it immediately.
 */
export async function handleEmbeddedSignup(data: {
    accessToken: string;
    agentId: string;
}) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');

    try {
        // 1. Get Meta App Secret and ID
        const appSecret = await getMetaAppSecret();
        const appId = await getMetaAppId();

        if (!appId) {
            throw new Error('Meta App ID missing (Check .env or GlobalConfig)');
        }
        if (!appSecret) {
            throw new Error('Meta App Secret missing (Check .env or GlobalConfig)');
        }

        // 2. Exchange Short-Lived Token for Long-Lived User Access Token
        const tokenRes = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${data.accessToken}`
        );
        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) throw new Error(tokenData.error?.message || 'Token exchange failed');
        const userAccessToken = tokenData.access_token;

        // 3. Get WABA ID (Sharing permissions)
        const wabaRes = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/me/whatsapp_business_accounts?access_token=${userAccessToken}`
        );
        const wabaData = await wabaRes.json();

        if (!wabaData.data || wabaData.data.length === 0) {
            console.error('Meta API Response (WABAs):', JSON.stringify(wabaData, null, 2));
            throw new Error(`No se encontró ninguna Cuenta de WhatsApp. Respuesta de Meta: ${JSON.stringify(wabaData)}`);
        }

        // Collect all potential phone numbers
        const availableAccounts: any[] = [];

        for (const waba of wabaData.data) {
            const phoneRes = await fetch(
                `https://graph.facebook.com/${META_API_VERSION}/${waba.id}/phone_numbers?access_token=${userAccessToken}`
            );
            const phoneData = await phoneRes.json();

            if (phoneData.data && phoneData.data.length > 0) {
                // Determine the "best" name for the WABA
                // Sometimes waba.name is "WhatsApp Business Account", so we might want to check other fields
                // But for now waba.name is the best we have.

                for (const phone of phoneData.data) {
                    availableAccounts.push({
                        wabaId: waba.id,
                        wabaName: waba.name,
                        phoneNumberId: phone.id,
                        phoneNumber: phone.display_phone_number || phone.verified_name || 'Unknown Number',
                        displayName: phone.verified_name || phone.display_phone_number || waba.name
                    });
                }
            }
        }

        if (availableAccounts.length === 0) {
            throw new Error('No verified phone number found in the connected WABA(s)');
        }

        // 4. Decision Time
        if (availableAccounts.length === 1) {
            // Only one option, proceed automatically
            return await finishWhatsAppSetup({
                accessToken: userAccessToken,
                wabaId: availableAccounts[0].wabaId,
                phoneNumberId: availableAccounts[0].phoneNumberId,
                agentId: data.agentId,
                sessionUserId: session.user.id
            });
        } else {
            // Multiple options, return to client for selection
            return {
                success: false,
                requiresSelection: true,
                accounts: availableAccounts,
                accessToken: userAccessToken // Pass back the LONG-LIVED token
            };
        }

    } catch (error: any) {
        console.error('Embedded Signup Error:', error);
        return { error: error.message || 'Error al procesar el registro de WhatsApp' };
    }
}

/**
 * Finalizes the setup with a selected account
 */
export async function finishWhatsAppSetup(data: {
    accessToken: string;
    wabaId: string;
    phoneNumberId: string;
    agentId: string;
    sessionUserId?: string;
}) {
    const sessionUserId = data.sessionUserId || (await auth())?.user?.id;
    if (!sessionUserId) throw new Error('Unauthorized');

    try {
        // 5. Register the phone number (Required for Cloud API)
        await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/${data.phoneNumberId}/register`,
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${data.accessToken}` },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    pin: '000000'
                })
            }
        );

        // 6. Save/Update Channel
        const workspace = await prisma.workspace.findFirst({
            where: { ownerId: sessionUserId }
        });

        if (!workspace) throw new Error('Workspace not found');

        const existingChannel = await prisma.channel.findFirst({
            where: {
                type: 'WHATSAPP',
                agent: { workspaceId: workspace.id } // Scoped to workspace, not just agent? Check logic.
            }
        });

        const configJson = {
            accessToken: data.accessToken,
            phoneNumberId: data.phoneNumberId,
            wabaId: data.wabaId,
            verifyToken: Math.random().toString(36).substring(7)
        };

        if (existingChannel) {
            await prisma.channel.update({
                where: { id: existingChannel.id },
                data: {
                    agentId: data.agentId,
                    configJson: configJson as any,
                    isActive: true,
                    displayName: 'WhatsApp Business' // Could update name here if we had it
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
        console.error('Finish Setup Error:', error);
        return { error: error.message || 'Error al guardar la configuración' };
    }
}

async function getMetaAppId() {
    if (process.env.NEXT_PUBLIC_FACEBOOK_APP_ID) return process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

    // Fallback to Global Config
    const config = await prisma.globalConfig.findUnique({
        where: { key: 'META_APP_ID' }
    });
    return config?.value;
}

async function getMetaAppSecret() {
    if (process.env.META_APP_SECRET) return process.env.META_APP_SECRET;

    // Fallback to Global Config
    const config = await prisma.globalConfig.findUnique({
        where: { key: 'META_APP_SECRET' }
    });
    return config?.value;
}
