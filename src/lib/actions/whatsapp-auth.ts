'use server'

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const META_API_VERSION = 'v19.0';

/**
 * Exchanges the temporary code for a long-lived user access token,
 * fetches WABA and Phone Number info, and registers it.
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

        // DEBUG: Verify Permissions
        const permRes = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/me/permissions?access_token=${userAccessToken}`
        );
        const permData = await permRes.json();
        const hasBizMgmt = permData.data?.some((p: any) => p.permission === 'whatsapp_business_management' && p.status === 'granted');

        if (!hasBizMgmt) {
            console.error('Missing Permissions:', JSON.stringify(permData, null, 2));
            throw new Error(`Falta el permiso 'whatsapp_business_management'. Permisos actuales: ${permData.data?.map((p: any) => p.permission).join(', ')}`);
        }

        // 3. Get WABA ID (Sharing permissions)
        // 3. Get WABA ID (Sharing permissions)
        let wabaList: any[] = [];
        let debugLog: string[] = [];

        // Attempt 1: Direct Fetch (me/whatsapp_business_accounts)
        // Note: This often fails for System Users or new scopes, so we swallow the error intentionally.
        try {
            debugLog.push('Attempting direct WABA fetch...');
            const wabaRes = await fetch(
                `https://graph.facebook.com/${META_API_VERSION}/me/whatsapp_business_accounts?access_token=${userAccessToken}`
            );
            const wabaData = await wabaRes.json();

            if (wabaData.data && wabaData.data.length > 0) {
                wabaList = wabaData.data;
                debugLog.push(`Direct fetch found ${wabaData.data.length} WABAs`);
            } else if (wabaData.error) {
                debugLog.push(`Direct fetch skipped (API Error): ${wabaData.error.message}`);
            } else {
                debugLog.push('Direct fetch returned empty list');
            }
        } catch (error: any) {
            debugLog.push(`Direct fetch crashed: ${error.message}`);
        }

        // Attempt 2: Comprehensive Business Manager Scan (The "Big Net")
        try {
            debugLog.push('Scanning Businesses for WABAs...');
            const bizRes = await fetch(
                `https://graph.facebook.com/${META_API_VERSION}/me/businesses?access_token=${userAccessToken}`
            );
            const bizData = await bizRes.json();

            if (bizData.data) {
                debugLog.push(`Found ${bizData.data.length} Businesses connected to user`);

                for (const biz of bizData.data) {
                    try {
                        // Strategy A: "Client" WABAs (Agencies usually see this)
                        const bizWabaRes = await fetch(
                            `https://graph.facebook.com/${META_API_VERSION}/${biz.id}/client_whatsapp_business_accounts?access_token=${userAccessToken}`
                        );
                        const bizWabaData = await bizWabaRes.json();
                        if (bizWabaData.data && bizWabaData.data.length > 0) {
                            wabaList = [...wabaList, ...bizWabaData.data];
                            debugLog.push(`Business [${biz.name}] (Client): Found ${bizWabaData.data.length}`);
                        }

                        // Strategy B: "Owned" WABAs (Direct owners see this)
                        // This is often the most important one for end-businesses.
                        const ownedWabaRes = await fetch(
                            `https://graph.facebook.com/${META_API_VERSION}/${biz.id}/owned_whatsapp_business_accounts?access_token=${userAccessToken}`
                        );
                        const ownedWabaData = await ownedWabaRes.json();
                        if (ownedWabaData.data && ownedWabaData.data.length > 0) {
                            wabaList = [...wabaList, ...ownedWabaData.data];
                            debugLog.push(`Business [${biz.name}] (Owned): Found ${ownedWabaData.data.length}`);
                        }
                    } catch (e: any) {
                        // Silent fail for individual business scan
                    }
                }
            } else {
                debugLog.push(`No Businesses found. BizData keys: ${Object.keys(bizData).join(', ')}`);
            }
        } catch (e: any) {
            debugLog.push(`Fallback scan crashed: ${e.message}`);
        }

        // Deduplicate WABAs by ID
        wabaList = Array.from(new Map(wabaList.map(item => [item.id, item])).values());

        if (wabaList.length === 0) {
            console.error('Debug Log for User Support:', debugLog);
            // Construct a friendly error message
            throw new Error(`No se encontraron cuentas de WhatsApp.\nDetalles técnicos: ${debugLog.slice(0, 3).join(' | ')}... (Ver consola para más)`);
        }

        // Collect all potential phone numbers
        const availableAccounts: any[] = [];

        for (const waba of wabaList) {
            const phoneRes = await fetch(
                `https://graph.facebook.com/${META_API_VERSION}/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating&access_token=${userAccessToken}`
            );
            const phoneData = await phoneRes.json();

            if (phoneData.data && phoneData.data.length > 0) {
                for (const phone of phoneData.data) {
                    availableAccounts.push({
                        wabaId: waba.id,
                        wabaName: waba.name,
                        phoneNumberId: phone.id,
                        phoneNumber: phone.display_phone_number || phone.verified_name || 'Unknown Number',
                        displayName: phone.verified_name || waba.name || phone.display_phone_number
                    });
                }
            } else {
                debugLog.push(`WABA ${waba.name} has 0 numbers`);
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
/**
 * Fetches message templates from Meta for a given WABA
 */
export async function getWhatsAppTemplates(wabaId: string, accessToken: string) {
    try {
        const response = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/message_templates?access_token=${accessToken}`
        );
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to fetch templates');
        }

        return { success: true, templates: data.data || [] };
    } catch (error: any) {
        console.error('Error fetching templates:', error);
        return { error: error.message || 'Error al obtener las plantillas' };
    }
}

/**
 * Sends a test template message
 */
export async function sendWhatsAppTemplateAction(data: {
    phoneNumberId: string;
    accessToken: string;
    to: string;
    templateName: string;
    languageCode: string;
}) {
    try {
        const url = `https://graph.facebook.com/${META_API_VERSION}/${data.phoneNumberId}/messages`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${data.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: data.to,
                type: 'template',
                template: {
                    name: data.templateName,
                    language: {
                        code: data.languageCode,
                    },
                },
            }),
        });

        const resData = await response.json();

        if (!response.ok) {
            throw new Error(resData.error?.message || 'Failed to send template');
        }

        return { success: true, data: resData };
    } catch (error: any) {
        console.error('Error sending template:', error);
        return { error: error.message || 'Error al enviar la plantilla' };
    }
}
