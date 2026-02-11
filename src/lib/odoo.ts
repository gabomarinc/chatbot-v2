
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface OdooConfig {
    url: string;
    db: string;
    username: string;
    apiKey: string;
}

async function odooCall(config: OdooConfig, service: string, method: string, args: any[]) {
    // Note: Odoo standard external API usually uses XML-RPC. 
    // However, some versions/hosting support JSON-RPC on /jsonrpc.
    // Given the environment, we'll implement a clean JSON-RPC caller if possible, 
    // or use a simple fetch-based XML-RPC structure.

    // For now, let's stick to the Odoo XML-RPC standard via fetch (manual XML construction)
    // or a JSON-RPC bridge if the user's Odoo supports it.
    // Most modern Odoo (v14+) supports JSON-RPC.

    const endpoint = `${config.url}/jsonrpc`;

    // 1. Authenticate (Get UID)
    const authBody = {
        jsonrpc: "2.0",
        method: "call",
        params: {
            service: "common",
            method: "authenticate",
            args: [config.db, config.username, config.apiKey, {}]
        },
        id: Date.now()
    };

    const authRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authBody)
    });

    const authJson = await authRes.json();
    if (authJson.error) {
        throw new Error(`Odoo Auth Error: ${authJson.error.data?.message || authJson.error.message}`);
    }

    const uid = authJson.result;
    if (!uid) throw new Error("Odoo Authentication failed - Invalid credentials.");

    // 2. Execute Method
    const execBody = {
        jsonrpc: "2.0",
        method: "call",
        params: {
            service: "object",
            method: "execute_kw",
            args: [
                config.db,
                uid,
                config.apiKey,
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
        // Update existing Lead
        const updateData: any = {};
        if (leadData.name) updateData.name = leadData.name;
        if (leadData.email) updateData.email_from = leadData.email;
        if (leadData.phone) updateData.phone = leadData.phone;
        if (leadData.description) updateData.description = leadData.description;

        await odooCall(config, 'crm.lead', 'write', [[parseInt(odooLeadId)], updateData]);
        return { success: true, id: odooLeadId };
    } else {
        // Create new Lead
        const createData = {
            name: leadData.name || 'Lead desde Chatbot',
            email_from: leadData.email,
            phone: leadData.phone,
            description: leadData.description,
            type: 'lead'
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

    // In Odoo, notes are typically added to 'mail.message' linked to the record
    const noteData = {
        body: noteContent,
        model: 'crm.lead',
        res_id: parseInt(leadId),
        message_type: 'comment',
        subtype_id: 1 // Discusión / Nota interna
    };

    const res = await odooCall(config, 'mail.message', 'create', [noteData]);
    return { success: true, result: res };
}
