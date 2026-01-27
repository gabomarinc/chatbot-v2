'use server'

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const META_API_VERSION = 'v20.0';

/**
 * Exchanges the temporary code for a long-lived user access token,
 * fetches WABA and Phone Number info, and registers it.
 */
export async function handleEmbeddedSignupV2(data: {
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
        let wabaList: any[] = [];
        let debugLog: string[] = [];

        // Attempt 1: Inspect Token for Granular Scopes (The "Precise Cut")
        // When users select specific accounts in the new Meta UI, they are hidden from "me/businesses"
        // and only appear in the token's "granular_scopes".
        try {
            debugLog.push('Inspecting Token Granular Scopes...');
            // App Access Token is just AppID|AppSecret
            const appAccessToken = `${appId}|${appSecret}`;
            const debugRes = await fetch(
                `https://graph.facebook.com/${META_API_VERSION}/debug_token?input_token=${userAccessToken}&access_token=${appAccessToken}`
            );
            const debugData = await debugRes.json();

            if (debugData.data && debugData.data.granular_scopes) {
                const scopes = debugData.data.granular_scopes;
                debugLog.push(`Granular Scopes found: ${scopes.length}`);

                const waScope = scopes.find((s: any) => s.scope === 'whatsapp_business_management');
                if (waScope && waScope.target_ids) {
                    debugLog.push(`Target IDs for WA: ${waScope.target_ids.join(', ')}`);

                    for (const id of waScope.target_ids) {
                        try {
                            const wabaDetailsRes = await fetch(
                                `https://graph.facebook.com/${META_API_VERSION}/${id}?fields=id,name,currency,timezone_id&access_token=${userAccessToken}`
                            );
                            const wabaDetails = await wabaDetailsRes.json();
                            if (wabaDetails.id) {
                                wabaList.push({ ...wabaDetails, _sourceBiz: 'Granular' });
                                debugLog.push(`Granular WABA found: ${wabaDetails.name} (${wabaDetails.id})`);
                            }
                        } catch (err: any) {
                            debugLog.push(`Failed to fetch Granular WABA ${id}: ${err.message}`);
                        }
                    }
                } else {
                    debugLog.push('No target_ids in whatsapp_business_management scope');
                }
            } else {
                debugLog.push('No granular_scopes found in token (Profile+ or Legacy)');
            }
        } catch (e: any) {
            debugLog.push(`Token Inspection Error: ${e.message}`);
        }

        // Attempt 2: Comprehensive Business Manager Scan (The "Big Net")
        try {
            debugLog.push('Scanning Businesses for WABAs...');
            const bizRes = await fetch(
                `https://graph.facebook.com/${META_API_VERSION}/me/businesses?access_token=${userAccessToken}`
            );

            debugLog.push(`Biz Scan Status: ${bizRes.status} ${bizRes.statusText}`);
            const bizData = await bizRes.json();

            if (bizData.error) {
                debugLog.push(`Biz Scan Error: ${JSON.stringify(bizData.error)}`);
            }

            if (bizData.data) {
                debugLog.push(`Found ${bizData.data.length} Businesses`);

                for (const biz of bizData.data) {
                    try {
                        debugLog.push(`Processing Business: ${biz.id} - ${biz.name}`);

                        let clientCount = 0;
                        // Strategy A: "Client" WABAs (Agencies usually see this)
                        const bizWabaRes = await fetch(
                            `https://graph.facebook.com/${META_API_VERSION}/${biz.id}/client_whatsapp_business_accounts?access_token=${userAccessToken}`
                        );
                        const bizWabaData = await bizWabaRes.json();
                        clientCount = bizWabaData.data?.length || 0;
                        if (clientCount > 0) {
                            const tagged = bizWabaData.data.map((w: any) => ({ ...w, _sourceBiz: biz.name }));
                            wabaList = [...wabaList, ...tagged];
                        }

                        let ownedCount = 0;
                        // Strategy B: "Owned" WABAs (Direct owners see this)
                        // This often finds WABAs that are neither strictly "client" nor "owned" in the graph API's eyes
                        const ownedWabaRes = await fetch(
                            `https://graph.facebook.com/${META_API_VERSION}/${biz.id}/owned_whatsapp_business_accounts?access_token=${userAccessToken}`
                        );
                        const ownedWabaData = await ownedWabaRes.json();
                        ownedCount = ownedWabaData.data?.length || 0;
                        if (ownedCount > 0) {
                            const tagged = ownedWabaData.data.map((w: any) => ({ ...w, _sourceBiz: biz.name }));
                            wabaList = [...wabaList, ...tagged];
                        }

                        let genericCount = 0;
                        // Strategy C: Generic Edge (Catch-all for Admins/legacy)
                        // This often finds WABAs that are neither strictly "client" nor "owned" in the graph API's eyes
                        const genericWabaRes = await fetch(
                            `https://graph.facebook.com/${META_API_VERSION}/${biz.id}/whatsapp_business_accounts?access_token=${userAccessToken}`
                        );
                        const genericWabaData = await genericWabaRes.json();
                        genericCount = genericWabaData.data?.length || 0;
                        if (genericCount > 0) {
                            const tagged = genericWabaData.data.map((w: any) => ({ ...w, _sourceBiz: biz.name }));
                            wabaList = [...wabaList, ...tagged];
                        }

                        debugLog.push(`Biz [${biz.name}]: C=${clientCount} O=${ownedCount} G=${genericCount}`);

                    } catch (e: any) {
                        debugLog.push(`Biz [${biz.name}] Error: ${e.message}`);
                    }
                }
            } else {
                debugLog.push(`No Businesses found. BizData keys: ${Object.keys(bizData).join(', ')}`);
            }
        } catch (e: any) {
            debugLog.push(`Fallback scan crashed: ${e.message}`);
        }

        // Deduplicate WABAs by ID (Last Write Wins to prefer Business-linked entries over Direct)
        const wabaMap = new Map();
        for (const w of wabaList) {
            wabaMap.set(w.id, w);
        }
        wabaList = Array.from(wabaMap.values());

        if (wabaList.length === 0) {
            console.error('Debug Log for User Support:', debugLog);
            // DUMP THE FULL LOG so we can see what happened
            throw new Error(`Siguiendo sin encontrar cuentas... Log: ${debugLog.join(' | ')}`);
        }

        // Collect all potential phone numbers
        const availableAccounts: any[] = [];
        const phoneDebugLog: string[] = [];

        for (const waba of wabaList) {
            try {
                const phoneRes = await fetch(
                    `https://graph.facebook.com/${META_API_VERSION}/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,name_status&access_token=${userAccessToken}`
                );
                const phoneData = await phoneRes.json();

                // Also Fetch WABA Details explicitly to get the correct Name (Avoids "unknown" and #100 errors on list fetch)
                let resolvedWabaName = waba.name;
                try {
                    const wabaDetailRes = await fetch(
                        `https://graph.facebook.com/${META_API_VERSION}/${waba.id}?fields=name,currency,timezone_id&access_token=${userAccessToken}`
                    );
                    const wabaDetailData = await wabaDetailRes.json();
                    if (wabaDetailData.name) {
                        resolvedWabaName = wabaDetailData.name;
                    }
                } catch (ignore) { }

                if (phoneData.data && phoneData.data.length > 0) {
                    for (const phone of phoneData.data) {

                        // Helper to ignore "unknown" garbage from Meta
                        const clean = (val: string) => {
                            if (!val) return null;
                            const s = String(val).trim();
                            if (s.toLowerCase() === 'unknown') return null;
                            if (s.toLowerCase().includes('unknown')) return null; // Aggressive check
                            return s;
                        };

                        const bizPrefix = waba._sourceBiz && waba._sourceBiz !== 'Direct' ? `[${waba._sourceBiz}] ` : '';

                        // Priority: Verified Name -> WABA Name -> Display Phone -> "Cuenta sin nombre"
                        let rawName = clean(phone.verified_name) || clean(resolvedWabaName);

                        // If we still don't have a name, or it's generic, force usage of the phone number
                        if (!rawName) {
                            rawName = clean(phone.display_phone_number) || 'Cuenta WhatsApp';
                        }

                        // Final safety: if the resulting name SOMEHOW is still "unknown", hard replace it
                        if (rawName.toLowerCase().includes('unknown')) {
                            rawName = phone.display_phone_number || 'Cuenta WhatsApp';
                        }

                        // DEBUG LOGGING
                        console.log(`[DEBUG WA] WABA: ${waba.id} | Name: ${resolvedWabaName} | Phone: ${phone.display_phone_number} | Verified_Name: ${phone.verified_name} | Biz: ${waba._sourceBiz} | -> FINAL: ${bizPrefix}${rawName}`);

                        availableAccounts.push({
                            wabaId: waba.id,
                            wabaName: resolvedWabaName || 'Sin Nombre',
                            phoneNumberId: phone.id,
                            phoneNumber: phone.display_phone_number || phone.verified_name || 'Unknown Number',
                            displayName: `${bizPrefix}${rawName}`
                        });
                    }
                } else {
                    phoneDebugLog.push(`WABA [${resolvedWabaName}]: 0 numbers.`);
                }
            } catch (e: any) {
                phoneDebugLog.push(`WABA [${waba.id}] Error: ${e.message}`);
            }
        }

        if (availableAccounts.length === 0) {
            console.error('Phone Fetch Debug:', phoneDebugLog);
            throw new Error(`No se encontraron números verificados en ninguna de las ${wabaList.length} cuentas de negocio detectadas.\nLogs: ${phoneDebugLog.join('\n')}`);
        }

        // 4. Decision Time
        if (availableAccounts.length === 1) {
            // Only one option, proceed automatically
            return await finishWhatsAppSetup({
                accessToken: userAccessToken,
                wabaId: availableAccounts[0].wabaId,
                phoneNumberId: availableAccounts[0].phoneNumberId,
                agentId: data.agentId,
                displayName: availableAccounts[0].displayName,
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
    displayName: string;
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

        // 5.1. Subscribe App to WABA Webhooks (Crucial for receiving messages)
        const subRes = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/${data.wabaId}/subscribed_apps`,
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${data.accessToken}` }
            }
        );
        if (!subRes.ok) {
            console.error('Webhook Subscription Failed:', await subRes.json());
        }

        // 6. Save/Update Channel
        const workspace = await prisma.workspace.findFirst({
            where: { ownerId: sessionUserId }
        });

        if (!workspace) throw new Error('Workspace not found');

        const existingChannel = await prisma.channel.findFirst({
            where: {
                type: 'WHATSAPP',
                agent: { workspaceId: workspace.id }
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
                    displayName: data.displayName
                }
            });
        } else {
            await prisma.channel.create({
                data: {
                    agent: { connect: { id: data.agentId } },
                    type: 'WHATSAPP',
                    displayName: data.displayName,
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
