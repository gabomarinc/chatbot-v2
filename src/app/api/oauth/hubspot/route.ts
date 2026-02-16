
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const HUBSPOT_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/hubspot/callback`
    : 'https://agentes.konsul.digital/api/oauth/hubspot/callback';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
        return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
    }

    if (!HUBSPOT_CLIENT_ID) {
        return NextResponse.json({ error: 'HubSpot Client ID not configured' }, { status: 500 });
    }

    // Check if agent exists
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // HubSpot Scopes
    const scopes = [
        'crm.objects.contacts.read',
        'crm.objects.contacts.write',
        'crm.objects.deals.read',
        'crm.objects.deals.write',
        'crm.objects.notes.read',
        'crm.objects.notes.write'
    ].join(' ');

    const params = new URLSearchParams({
        client_id: HUBSPOT_CLIENT_ID,
        redirect_uri: HUBSPOT_REDIRECT_URI,
        scope: scopes,
        state: agentId // Pass agent ID in state
    });

    const authUrl = `https://app.hubspot.com/oauth/authorize?${params.toString()}`;

    return NextResponse.redirect(authUrl);
}
