import { prisma } from '@/lib/prisma';

interface OdooConfig {
    url: string;
    db: string;
    username: string;
    apiKey: string;
}

/**
 * Generic Odoo JSON-RPC caller with better error reporting
 */
async function odooCall(config: OdooConfig, service: string, method: string, args: any[], kwargs: any = {}) {
    // 1. Sanitize URL
    let baseUrl = config.url.trim().replace(/\/$/, '');
    if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
    }
    const endpoint = `${baseUrl}/jsonrpc`;

    console.log(`[ODOO] ${service}.${method} -> ${endpoint}`);

    // 2. Authenticate
    const authParams = {
        service: "common",
        method: "authenticate",
        args: [config.db.trim(), config.username.trim(), config.apiKey.trim(), {}]
    };

    try {
        const authRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params: authParams,
                id: Math.floor(Math.random() * 1000)
            }),
            cache: 'no-store'
        });

        if (!authRes.ok) throw new Error(`Conexión fallida (HTTP ${authRes.status})`);

        const authJson = await authRes.json();
        if (authJson.error) {
            throw new Error(`Error de Autenticación Odoo: ${authJson.error.data?.message || authJson.error.message}`);
        }

        const uid = authJson.result;
        if (uid === false || uid === null) {
            throw new Error("Credenciales de Odoo inválidas. Revisa URL, DB, Usuario y API Key.");
        }

        // 3. Execute
        const execParams = {
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
        };

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params: execParams,
                id: Math.floor(Math.random() * 1000) + 1000
            }),
            cache: 'no-store'
        });

        const json = await res.json();
        if (json.error) {
            throw new Error(`Error de API Odoo: ${json.error.data?.message || json.error.message}`);
        }

        return json.result;
    } catch (e: any) {
        console.error(`[ODOO_CRITICAL]`, e.message);
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
            throw new Error('Integración de Odoo no configurada en este agente.');
        }

        const config = integration.configJson as any as OdooConfig;

        if (odooLeadId) {
            // Update
            const updateProps: any = {};
            if (leadData.name) {
                updateProps.name = `Oportunidad: ${leadData.name}`;
                updateProps.contact_name = leadData.name;
            }
            if (leadData.email) updateProps.email_from = leadData.email;
            if (leadData.phone) updateProps.phone = leadData.phone;
            if (leadData.description) updateProps.description = leadData.description;

            await odooCall(config, 'crm.lead', 'write', [[parseInt(odooLeadId)], updateProps]);
            return { success: true, id: odooLeadId };
        } else {
            // Create - Using only essential fields to avoid validation errors
            const createProps = {
                name: `Oportunidad: ${leadData.name || 'Nuevo Prospecto'}`,
                contact_name: leadData.name || 'Cliente Chatbot',
                email_from: leadData.email,
                phone: leadData.phone,
                description: leadData.description || 'Lead generado automáticamente por Kônsul AI',
                type: 'opportunity' // 'opportunity' ensures it appears in the CRM Pipeline
            };

            const newId = await odooCall(config, 'crm.lead', 'create', [createProps]);

            if (!newId) throw new Error("Odoo no devolvió un ID para el nuevo lead.");

            return { success: true, id: newId.toString() };
        }
    } catch (err: any) {
        console.error('[ODOO_ACTION_ERROR]', err.message);
        throw err;
    }
}

export async function addOdooNote(agentId: string, leadId: string, noteContent: string) {
    try {
        const integration = await prisma.agentIntegration.findFirst({
            where: { agentId, provider: 'ODOO' }
        });

        if (!integration || !integration.configJson) throw new Error('Odoo desconectado');
        const config = integration.configJson as any as OdooConfig;

        // In Odoo, notes go to mail.message
        const noteProps = {
            body: noteContent,
            model: 'crm.lead',
            res_id: parseInt(leadId),
            message_type: 'comment'
        };

        const res = await odooCall(config, 'mail.message', 'create', [noteProps]);
        return { success: true, id: res.toString() };
    } catch (err: any) {
        console.error('[ODOO_NOTE_ERROR]', err.message);
        throw err;
    }
}
