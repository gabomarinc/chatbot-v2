import { prisma } from '@/lib/prisma';

interface OdooConfig {
    url: string;
    db: string;
    username: string;
    apiKey: string;
}

async function odooCall(config: OdooConfig, service: string, method: string, args: any[]) {
    // Basic sanitization: remove trailing slash and whitespace
    const baseUrl = config.url.trim().replace(/\/$/, '');
    const endpoint = `${baseUrl}/jsonrpc`;

    console.log(`[ODOO] Calling ${service}.${method} at ${endpoint}`);

    // 1. Authenticate (Get UID)
    const authBody = {
        jsonrpc: "2.0",
        method: "call",
        params: {
            service: "common",
            method: "authenticate",
            args: [config.db.trim(), config.username.trim(), config.apiKey.trim(), {}]
        },
        id: Date.now()
    };

    try {
        const authRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authBody)
        });

        if (!authRes.ok) {
            throw new Error(`HTTP Error ${authRes.status}: ${authRes.statusText}`);
        }

        const authJson = await authRes.json();
        console.log(`[ODOO] Auth response status: ${authRes.status}`);

        if (authJson.error) {
            throw new Error(`Odoo Auth Error: ${authJson.error.data?.message || authJson.error.message}`);
        }

        const uid = authJson.result;
        // Odoo returns false for failed authentication
        if (uid === false || uid === null || uid === undefined) {
            throw new Error("Odoo Authentication failed - Invalid credentials (check DB name, username, and API Key).");
        }

        // 2. Execute Method
        const execBody = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "object",
                method: "execute_kw",
                args: [
                    config.db.trim(),
                    uid,
                    config.apiKey.trim(),
                    service,
                    method,
                    args
                ]
            },
            id: Date.now() + 1
        };

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(execBody)
        });

        const json = await res.json();
        if (json.error) {
            throw new Error(`Odoo API Error: ${json.error.data?.message || json.error.message}`);
        }

        return json.result;
    } catch (e: any) {
        console.error(`[ODOO] Error in odooCall:`, e.message);
        throw e;
    }
}

export async function createOdooLead(agentId: string, leadData: {
    name: string;
    email?: string;
    phone?: string;
    description?: string;
}, odooLeadId?: string) {
    const integration = await prisma.agentIntegration.findFirst({
        where: { agentId, provider: 'ODOO' }
    });

    if (!integration || !integration.configJson) {
        throw new Error('Odoo integration not found.');
    }

    const config = integration.configJson as any as OdooConfig;

    if (odooLeadId) {
        console.log(`[ODOO] Updating lead ${odooLeadId}`);
        // Update existing Lead
        const updateData: any = {};
        if (leadData.name) updateData.name = leadData.name;
        if (leadData.email) updateData.email_from = leadData.email;
        if (leadData.phone) updateData.phone = leadData.phone;
        if (leadData.description) updateData.description = leadData.description;

        await odooCall(config, 'crm.lead', 'write', [[parseInt(odooLeadId)], updateData]);
        return { success: true, id: odooLeadId };
    } else {
        console.log(`[ODOO] Creating new lead for ${leadData.name}`);
        // Create new Lead
        const createData = {
            name: leadData.name || 'Lead desde Chatbot',
            email_from: leadData.email,
            phone: leadData.phone,
            description: leadData.description,
            type: 'opportunity' // Using opportunity to ensure it shows in the pipeline (Flujo)
        };

        const newId = await odooCall(config, 'crm.lead', 'create', [createData]);
        return { success: true, id: newId.toString() };
    }
}

export async function addOdooNote(agentId: string, leadId: string, noteContent: string) {
    const integration = await prisma.agentIntegration.findFirst({
        where: { agentId, provider: 'ODOO' }
    });

    if (!integration || !integration.configJson) {
        throw new Error('Odoo integration not found.');
    }

    const config = integration.configJson as any as OdooConfig;

    console.log(`[ODOO] Adding note to lead ${leadId}`);

    // In Odoo, notes are typically added to 'mail.message' linked to the record
    const noteData = {
        body: noteContent,
        model: 'crm.lead',
        res_id: parseInt(leadId),
        message_type: 'comment',
        subtype_id: 1 // Internal Note
    };

    const res = await odooCall(config, 'mail.message', 'create', [noteData]);
    return { success: true, result: res };
}
