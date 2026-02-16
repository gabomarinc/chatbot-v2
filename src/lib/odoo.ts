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
    // 1. Sanitize URL
    let baseUrl = config.url.trim().replace(/\/$/, '');
    if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
    }
    const endpoint = `${baseUrl}/jsonrpc`;

    console.log(`[ODOO] Calling ${service}.${method} at ${endpoint}`);

    // 2. Authenticate
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authBody),
            cache: 'no-store'
        });

        if (!authRes.ok) throw new Error(`HTTP ${authRes.status} connecting to Odoo`);

        const authJson = await authRes.json();
        if (authJson.error) {
            throw new Error(`Odoo Auth Error: ${authJson.error.data?.message || authJson.error.message}`);
        }

        const uid = authJson.result;
        if (uid === false || uid === null) {
            throw new Error("Autenticación fallida. Revisa que el nombre de la Base de Datos, Usuario y API Key sean correctos.");
        }

        // 3. Execute with execute_kw
        // Odoo 14+ expects positional args then kwargs
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(execBody),
            cache: 'no-store'
        });

        const json = await res.json();
        if (json.error) {
            throw new Error(`Odoo API Error: ${json.error.data?.message || json.error.message}`);
        }

        return json.result;
    } catch (e: any) {
        console.error(`[ODOO] Error en odooCall:`, e.message);
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
        throw new Error('Integración de Odoo no encontrada o no configurada.');
    }

    const config = integration.configJson as any as OdooConfig;

    try {
        if (odooLeadId) {
            // Update
            const updateData: any = {};
            if (leadData.name) {
                updateData.name = `Oportunidad: ${leadData.name}`;
                updateData.contact_name = leadData.name;
            }
            if (leadData.email) updateData.email_from = leadData.email;
            if (leadData.phone) updateData.phone = leadData.phone;
            if (leadData.description) updateData.description = leadData.description;

            await odooCall(config, 'crm.lead', 'write', [[parseInt(odooLeadId)], updateData]);
            return { success: true, id: odooLeadId, action: 'updated' };
        } else {
            // Create
            // We use a dictionary inside a list for 'create'
            const createData = {
                name: `Oportunidad ${leadData.name || 'de Cliente'}`,
                contact_name: leadData.name || 'Visitante Chatbot',
                email_from: leadData.email,
                phone: leadData.phone,
                description: leadData.description || 'Interés captado por Chatbot AI',
                type: 'opportunity',
                priority: '2' // 2 stars
            };

            const newId = await odooCall(config, 'crm.lead', 'create', [createData]);
            return { success: true, id: newId.toString(), action: 'created' };
        }
    } catch (err: any) {
        console.error('[ODOO] createOdooLead error:', err.message);
        throw err;
    }
}

export async function addOdooNote(agentId: string, leadId: string, noteContent: string) {
    const integration = await prisma.agentIntegration.findFirst({
        where: { agentId, provider: 'ODOO' }
    });

    if (!integration || !integration.configJson) throw new Error('Odoo not configured');
    const config = integration.configJson as any as OdooConfig;

    try {
        const noteData = {
            body: noteContent,
            model: 'crm.lead',
            res_id: parseInt(leadId),
            message_type: 'comment',
            subtype_id: 1 // Discusión / Nota interna
        };

        const res = await odooCall(config, 'mail.message', 'create', [noteData]);
        return { success: true, id: res.toString() };
    } catch (err: any) {
        console.error('[ODOO] addOdooNote error:', err.message);
        throw err;
    }
}
