
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_REDIRECT_URI = 'https://agentes.konsul.digital/api/oauth/zoho/callback';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
        return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
    }

    // Check if agent exists and belongs to user (middleware handles auth usually)
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Zoho Scope: What permissions we need
    const scopes = [
        'ZohoCRM.modules.leads.CREATE',
        'ZohoCRM.modules.leads.READ',
        'ZohoCRM.modules.leads.UPDATE',
        'ZohoCRM.modules.contacts.CREATE',
        'ZohoCRM.modules.contacts.READ',
        'ZohoCRM.modules.notes.CREATE'
    ].join(',');

    // Access Type offline to get Refresh Token
    const params = new URLSearchParams({
        scope: scopes,
        client_id: ZOHO_CLIENT_ID!,
        response_type: 'code',
        access_type: 'offline',
        redirect_uri: ZOHO_REDIRECT_URI,
        state: agentId // Pass agent ID in state
    });

    const authUrl = `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`;

    return NextResponse.redirect(authUrl);
}
