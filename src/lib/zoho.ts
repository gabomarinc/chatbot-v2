
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Token Refresh Logic
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const ZOHO_REDIRECT_URI = 'https://agentes.konsul.digital/api/oauth/zoho/callback';

export async function getZohoAccessToken(agentId: string) {
    // 1. Fetch current token
    const integration = await prisma.agentIntegration.findFirst({
        where: { agentId, provider: 'ZOHO' }
    });

    if (!integration || !integration.configJson) {
        throw new Error('Zoho integration not found or invalid.');
    }

    const config = integration.configJson as any;
    const now = Date.now();

    // 2. Check Expiry (Buffer 5 mins)
    // If expires_at is missing or close, refresh.
    if (!config.expires_at || config.expires_at < now + 5 * 60 * 1000) {
        console.log('Zoho Token Expired or near expiry. Refreshing...');

        const accountsServer = config.accounts_server || 'https://accounts.zoho.com';

        try {
            const refreshRes = await fetch(`${accountsServer}/oauth/v2/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: ZOHO_CLIENT_ID!,
                    client_secret: ZOHO_CLIENT_SECRET!,
                    refresh_token: config.refresh_token // Must exist from initial offline access
                })
            });

            const newData = await refreshRes.json();

            if (newData.error) {
                console.error('Zoho Refresh Failed:', newData);
                throw new Error('Failed to refresh Zoho token: ' + newData.error);
            }

            // Update DB with new Access Token
            // Note: Refresh token usually stays the same unless rotated
            const newConfig = {
                ...config,
                access_token: newData.access_token,
                expires_in: newData.expires_in,
                expires_at: Date.now() + (newData.expires_in * 1000)
            };

            await prisma.agentIntegration.update({
                where: { id: integration.id },
                data: { configJson: newConfig }
            });

            return newConfig.access_token;
        } catch (error) {
            console.error('Exception refreshing Zoho token:', error);
            throw error;
        }
    }

    // 3. Return valid token
    return config.access_token;
}

export async function createZohoLead(agentId: string, leadData: {
    FirstName: string;
    LastName: string;
    Email: string;
    Phone?: string;
    Description?: string;
}, zohoLeadId?: string) {
    const accessToken = await getZohoAccessToken(agentId);

    // Zoho Leads API: https://www.zoho.com/crm/developer/docs/api/v2/insert-records.html
    // Actually we should use api_domain from config if possible

    // Fetch api_domain from DB to be safe
    const integration = await prisma.agentIntegration.findFirst({ where: { agentId, provider: 'ZOHO' } });
    const config = integration?.configJson as any;

    // Ensure apiDomain has protocol
    let apiDomain = config?.api_domain || 'https://www.zohoapis.com';
    if (!apiDomain.startsWith('http')) {
        apiDomain = `https://${apiDomain}`;
    }

    const endpoint = `${apiDomain}/crm/v2/Leads`;
    let leadIdToUpdate = zohoLeadId;

    // 1. Search Logic if ID is missing
    if (!leadIdToUpdate && leadData.Email) {
        try {
            const searchRes = await fetch(`${endpoint}/search?email=${encodeURIComponent(leadData.Email)}`, {
                headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
            });
            const searchJson = await searchRes.json();
            if (searchJson.data && searchJson.data.length > 0) {
                leadIdToUpdate = searchJson.data[0].id;
                console.log(`[ZOHO] Lead found by Email: ${leadIdToUpdate}`);
            }
        } catch (e) {
            console.error('[ZOHO] Search by Email failed', e);
        }
    }

    if (!leadIdToUpdate && leadData.Phone) {
        try {
            const searchRes = await fetch(`${endpoint}/search?phone=${encodeURIComponent(leadData.Phone)}`, {
                headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
            });
            const searchJson = await searchRes.json();
            if (searchJson.data && searchJson.data.length > 0) {
                leadIdToUpdate = searchJson.data[0].id;
                console.log(`[ZOHO] Lead found by Phone: ${leadIdToUpdate}`);
            }
        } catch (e) {
            console.error('[ZOHO] Search by Phone failed', e);
        }
    }

    // 2. Prepare Payload
    const data: any = {
        Email: leadData.Email,
        Phone: leadData.Phone,
        Description: leadData.Description,
        Lead_Source: 'Konsul Bot'
    };

    // Only set names if provided or creating new
    if (leadData.FirstName) data.First_Name = leadData.FirstName;
    if (leadData.LastName) data.Last_Name = leadData.LastName;

    // For CREATE, enforce defaults
    if (!leadIdToUpdate) {
        if (!data.First_Name) data.First_Name = 'Lead';
        if (!data.Last_Name) data.Last_Name = 'Konsul';
    }

    const body = { data: [data] };
    const method = leadIdToUpdate ? 'PUT' : 'POST';
    const finalUrl = leadIdToUpdate ? `${endpoint}/${leadIdToUpdate}` : endpoint;

    console.log(`[ZOHO] ${method} Lead ${leadIdToUpdate || ''}`);

    const res = await fetch(finalUrl, {
        method: method,
        headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const json = await res.json();

    // Check for Zoho API Errors
    if (json.data && json.data[0].status === 'error') {
        throw new Error(`Zoho Error: ${json.data[0].message} (${json.data[0].code})`);
    }

    if (json.code === 'INVALID_TOKEN') {
        throw new Error('Zoho Token Invalid. Please reconnect integration.');
    }

    return json;
}
