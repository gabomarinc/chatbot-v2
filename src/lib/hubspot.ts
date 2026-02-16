
import { prisma } from '@/lib/prisma';

interface HubSpotConfig {
    access_token: string;
    refresh_token: string;
    expires_at: number;
}

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;

async function getHubSpotToken(agentId: string) {
    const integration = await prisma.agentIntegration.findFirst({
        where: { agentId, provider: 'HUBSPOT' }
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

    const [firstname, ...lastnameParts] = contactData.name.split(' ');
    const lastname = lastnameParts.join(' ');

    const properties: any = {
        firstname,
        lastname: lastname || ' (Chatbot)',
        email: contactData.email,
        phone: contactData.phone,
        description: contactData.description,
    };

    if (hubspotContactId) {
        // Update
        const res = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${hubspotContactId}`, {
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

        return { success: true, id: hubspotContactId };
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
            // Check if contact already exists by email
            if (data.category === 'CONFLICT' && contactData.email) {
                // We should ideally search and update, but for now we throw
                throw new Error(`HubSpot: Contacto con email ${contactData.email} ya existe.`);
            }
            throw new Error(`HubSpot Contact Create Error: ${data.message}`);
        }

        return { success: true, id: data.id };
    }
}

export async function addHubSpotNote(agentId: string, contactId: string, noteContent: string) {
    const accessToken = await getHubSpotToken(agentId);

    // In HubSpot, notes are "Engagements" or "Notes" objects
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
            }
        })
    });

    const note = await res.json();
    if (note.status === 'error') {
        throw new Error(`HubSpot Note Error: ${note.message}`);
    }

    // Associate with Contact
    await fetch(`https://api.hubapi.com/crm/v3/objects/notes/${note.id}/associations/contact/${contactId}/202`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

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
