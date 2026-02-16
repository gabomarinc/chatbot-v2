
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const HUBSPOT_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/hubspot/callback`
    : 'https://agentes.konsul.digital/api/oauth/hubspot/callback';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // agentId encoded in state
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.json({ error: `HubSpot Auth Error: ${error}` }, { status: 400 });
    }

    if (!code || !state) {
        return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    const agentId = state;

    try {
        console.log(`[HUBSPOT] Attempting Token Exchange...`);
        const tokenRes = await fetch(`https://api.hubapi.com/oauth/v1/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: HUBSPOT_CLIENT_ID!,
                client_secret: HUBSPOT_CLIENT_SECRET!,
                redirect_uri: HUBSPOT_REDIRECT_URI,
                code: code
            })
        });

        const tokens = await tokenRes.json();

        if (tokens.error) {
            console.error('[HUBSPOT] Token Exchange Failed:', tokens.error);
            return NextResponse.json({
                error: `Failed to authenticate with HubSpot: ${tokens.error_description || tokens.error}`
            }, { status: 400 });
        }

        // Store Tokens in AgentIntegration
        const configJson: any = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in,
            expires_at: Date.now() + (tokens.expires_in * 1000)
        };

        await prisma.agentIntegration.upsert({
            where: {
                agentId_provider: {
                    agentId: agentId,
                    provider: 'HUBSPOT'
                }
            },
            update: {
                configJson,
                enabled: true
            },
            create: {
                agentId: agentId,
                provider: 'HUBSPOT',
                configJson,
                enabled: true
            }
        });

        // Redirect back to agent integrations page
        return NextResponse.redirect(new URL(`/agents/${agentId}/integrations?success=hubspot_connected`, request.url));

    } catch (error: any) {
        console.error('[HUBSPOT] Callback Exception:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
