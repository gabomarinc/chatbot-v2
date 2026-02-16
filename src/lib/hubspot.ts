import { prisma } from '@/lib/prisma';
import { IntegrationProvider } from '@prisma/client';

interface HubSpotConfig {
    access_token: string;
    refresh_token: string;
    expires_at: number;
}

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;

async function getHubSpotToken(agentId: string) {
    const integration = await prisma.agentIntegration.findFirst({
        where: { agentId, provider: IntegrationProvider.HUBSPOT }
    });

    if (!integration || !integration.configJson) {
        throw new Error('HubSpot integration not found');
    }

    let config = integration.configJson as any as HubSpotConfig;

    // Refresh token if expired (or about to expire in 5 mins)
    if (Date.now() > (config.expires_at - 300000)) {
        console.log('[HUBSPOT] Token expired, refreshing...');
        const res = await fetch('https://api.hubapi.com/oauth/v1/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: HUBSPOT_CLIENT_ID!,
                client_secret: HUBSPOT_CLIENT_SECRET!,
                refresh_token: config.refresh_token
            })
        });

        const data = await res.json();
        if (data.error) {
            throw new Error(`Failed to refresh HubSpot token: ${data.message || data.error}`);
        }

        config = {
            ...config,
            access_token: data.access_token,
            refresh_token: data.refresh_token || config.refresh_token,
            expires_at: Date.now() + (data.expires_in * 1000)
        };

        await prisma.agentIntegration.update({
            where: { id: integration.id },
            data: { configJson: config as any }
        });
    }

    return config.access_token;
}

export async function createHubSpotContact(agentId: string, contactData: {
    name: string;
    email?: string;
    phone?: string;
    description?: string;
}, hubspotContactId?: string) {
    const accessToken = await getHubSpotToken(agentId);

    let contactIdToUse = hubspotContactId;

    // 1. If no ID provided, try to search by Email or Phone to avoid conflicts
    if (!contactIdToUse && (contactData.email || contactData.phone)) {
        try {
            const searchUrl = 'https://api.hubapi.com/crm/v3/objects/contacts/search';
            const filterGroups = [];

            if (contactData.email) {
                filterGroups.push({
                    filters: [{ propertyName: 'email', operator: 'EQ', value: contactData.email }]
                });
            }
            if (contactData.phone) {
                filterGroups.push({
                    filters: [{ propertyName: 'phone', operator: 'EQ', value: contactData.phone }]
                });
            }

            const searchRes = await fetch(searchUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filterGroups })
            });
            const searchData = await searchRes.json();
            if (searchData.results && searchData.results.length > 0) {
                contactIdToUse = searchData.results[0].id;
                console.log(`[HUBSPOT] Contact found by search: ${contactIdToUse}`);
            }
        } catch (e) {
            console.error('[HUBSPOT] Search error:', e);
        }
    }

    const [firstname, ...lastnameParts] = contactData.name.split(' ');
    const lastname = lastnameParts.join(' ');

    const properties: any = {
        firstname,
        lastname: lastname || ' (Chatbot)',
        email: contactData.email,
        phone: contactData.phone,
    };

    let resultId = contactIdToUse;

    if (contactIdToUse) {
        // Update
        const res = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactIdToUse}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ properties })
        });

        const data = await res.json();
        if (data.status === 'error') {
            throw new Error(`HubSpot Contact Update Error: ${data.message}`);
        }
    } else {
        // Create
        const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ properties })
        });

        const data = await res.json();
        if (data.status === 'error') {
            // Fallback for unexpected conflict if search failed
            if (data.category === 'CONFLICT' && data.message.includes('id:')) {
                const match = data.message.match(/id:\s*(\d+)/);
                if (match) {
                    resultId = match[1];
                } else {
                    throw new Error(`HubSpot Conflict: ${data.message}`);
                }
            } else {
                throw new Error(`HubSpot Contact Create Error: ${data.message}`);
            }
        } else {
            resultId = data.id;
        }
    }

    // 2. If description provided, add it as a Note automatically
    if (resultId && contactData.description) {
        try {
            await addHubSpotNote(agentId, resultId, contactData.description);
        } catch (noteErr) {
            console.error('[HUBSPOT] Auto-note error:', noteErr);
            // Don't fail the whole contact creation if only the note fails
        }
    }

    return { success: true, id: resultId };
}

export async function addHubSpotNote(agentId: string, contactId: string, noteContent: string) {
    const accessToken = await getHubSpotToken(agentId);

    // In HubSpot, notes are "Engagements" or "Notes" objects
    // Using associations in the create call is more reliable
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            properties: {
                hs_note_body: noteContent,
                hs_timestamp: Date.now()
            },
            associations: [
                {
                    to: { id: contactId },
                    types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }]
                }
            ]
        })
    });

    const note = await res.json();
    if (note.status === 'error') {
        throw new Error(`HubSpot Note Error: ${note.message}`);
    }

    return { success: true, id: note.id };
}

export async function createHubSpotDeal(agentId: string, contactId: string, dealData: {
    name: string;
    amount?: number;
}) {
    const accessToken = await getHubSpotToken(agentId);

    const properties = {
        dealname: `Trato: ${dealData.name}`,
        dealstage: 'appointmentscheduled', // Default stage
        pipeline: 'default',
        amount: dealData.amount?.toString() || '0'
    };

    // Create Deal
    const dealRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ properties })
    });

    const deal = await dealRes.json();
    if (deal.status === 'error') {
        throw new Error(`HubSpot Deal Error: ${deal.message}`);
    }

    // Associate with Contact
    await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${deal.id}/associations/contact/${contactId}/3`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    return { success: true, id: deal.id };
}
