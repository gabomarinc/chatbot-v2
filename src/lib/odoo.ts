import { prisma } from '@/lib/prisma';

interface OdooConfig {
    url: string;
    db: string;
    username: string;
    apiKey: string;
}

/**
 * Generic Odoo JSON-RPC caller
 */
async function odooCall(config: OdooConfig, service: string, method: string, args: any[], kwargs: any = {}) {
    // Basic sanitization: remove trailing slash and whitespace
    let baseUrl = config.url.trim().replace(/\/$/, '');

    // Ensure protocol is present
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `https://${baseUrl}`;
    }

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
        id: Math.floor(Math.random() * 1000000)
    };

    try {
        const authRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(authBody),
            cache: 'no-store'
        });

        if (!authRes.ok) {
            throw new Error(`HTTP Error ${authRes.status}: ${authRes.statusText}`);
        }

        const authJson = await authRes.json();

        if (authJson.error) {
            throw new Error(`Odoo Auth Error: ${authJson.error.data?.message || authJson.error.message}`);
        }

        const uid = authJson.result;
        // Odoo returns false for failed authentication
        if (uid === false || uid === null || uid === undefined) {
            throw new Error("Odoo Authentication failed - Las credenciales son incorrectas (revisa Base de Datos, Usuario y Clave API).");
        }

        // 2. Execute Method using execute_kw
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
                    args,
                    kwargs
                ]
            },
            id: Math.floor(Math.random() * 1000000)
        };

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(execBody),
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error(`Execution HTTP Error ${res.status}`);
        }

        const json = await res.json();
        if (json.error) {
            throw new Error(`Odoo API Error: ${json.error.data?.message || json.error.message}`);
        }

        return json.result;
    } catch (e: any) {
        console.error(`[ODOO] Call failed:`, e.message);
        throw e;
    }
}

export async function createOdooLead(agentId: string, leadData: {
    name: string;
    email?: string;
    phone?: string;
    description?: string;
}, odooLeadId?: string) {
    try {
        const integration = await prisma.agentIntegration.findFirst({
            where: { agentId, provider: 'ODOO' }
        });

        if (!integration || !integration.configJson) {
            throw new Error('Integración de Odoo no configurada.');
        }

        const config = integration.configJson as any as OdooConfig;

        if (odooLeadId) {
            console.log(`[ODOO] Updating lead ${odooLeadId}`);
            // Update existing Lead/Opportunity
            const updateData: any = {};
            if (leadData.name) {
                updateData.name = `Oportunidad: ${leadData.name}`;
                updateData.contact_name = leadData.name;
            }
            if (leadData.email) updateData.email_from = leadData.email;
            if (leadData.phone) updateData.phone = leadData.phone;
            if (leadData.description) updateData.description = leadData.description;

            await odooCall(config, 'crm.lead', 'write', [[parseInt(odooLeadId)], updateData]);
            return { success: true, id: odooLeadId };
        } else {
            console.log(`[ODOO] Creating new lead for ${leadData.name}`);
            // Create new Lead as an Opportunity to show in the pipeline
            const createData = {
                name: `Oportunidad: ${leadData.name || 'Nuevo Cliente'}`,
                contact_name: leadData.name || 'Visitante',
                email_from: leadData.email,
                phone: leadData.phone,
                description: leadData.description || 'Interés captado desde Chatbot AI',
                type: 'opportunity', // Ensure it appears as an opportunity in the pipeline
                priority: '1' // 1 star by default
            };

            const newId = await odooCall(config, 'crm.lead', 'create', [createData]);
            return { success: true, id: newId.toString() };
        }
    } catch (err: any) {
        console.error('[ODOO] createOdooLead error:', err.message);
        throw err;
    }
}

export async function addOdooNote(agentId: string, leadId: string, noteContent: string) {
    try {
        const integration = await prisma.agentIntegration.findFirst({
            where: { agentId, provider: 'ODOO' }
        });

        if (!integration || !integration.configJson) {
            throw new Error('Integración de Odoo no configurada.');
        }

        const config = integration.configJson as any as OdooConfig;

        console.log(`[ODOO] Adding note to lead ${leadId}`);

        // In Odoo, notes are typically added to 'mail.message' linked to the record
        // We use 'message_post' method if available, or create mail.message
        const noteData = {
            body: noteContent,
            model: 'crm.lead',
            res_id: parseInt(leadId),
            message_type: 'comment',
            subtype_id: 1 // Internal Note ID (usually 1)
        };

        const res = await odooCall(config, 'mail.message', 'create', [noteData]);
        return { success: true, result: res };
    } catch (err: any) {
        console.error('[ODOO] addOdooNote error:', err.message);
        throw err;
    }
}
