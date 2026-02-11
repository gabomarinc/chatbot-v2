
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const ZOHO_REDIRECT_URI = 'https://agentes.konsul.digital/api/oauth/zoho/callback';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // agentId encoded in state
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.json({ error: `Zoho Auth Error: ${error}` }, { status: 400 });
    }

    if (!code || !state) {
        return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    const agentId = state;

    try {
        // Multi-Region Support
        // We try multiple Zoho DCs because the code might have been issued by .eu, .in, etc.
        const dcs = [
            'https://accounts.zoho.com',
            'https://accounts.zoho.eu',
            'https://accounts.zoho.in',
            'https://accounts.zoho.com.au',
            'https://accounts.zoho.jp'
        ];

        let tokens: any = null;
        let successfulDc = '';

        // Try each DC until one works
        for (const dc of dcs) {
            try {
                console.log(`Attempting Zoho Token Exchange on ${dc}...`);
                const tokenRes = await fetch(`${dc}/oauth/v2/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'authorization_code',
                        client_id: ZOHO_CLIENT_ID!,
                        client_secret: ZOHO_CLIENT_SECRET!,
                        redirect_uri: ZOHO_REDIRECT_URI,
                        code: code
                    })
                });

                const data = await tokenRes.json();

                if (!data.error) {
                    tokens = data;
                    successfulDc = dc;
                    console.log(`Success on ${dc}!`);
                    break;
                } else {
                    console.log(`Failed on ${dc}:`, data.error);
                }
            } catch (e) {
                console.error(`Error connecting to ${dc}`, e);
            }
        }

        if (!tokens || tokens.error) {
            console.error('Zoho Token Exchange Failed on all DCs');
            return NextResponse.json({
                error: 'Failed to authenticate with Zoho. Please ensure the region matches.'
            }, { status: 400 });
        }

        // Store Tokens in AgentIntegration
        // Check if integration exists, update or create
        const existingIntegration = await prisma.agentIntegration.findFirst({
            where: {
                agentId: agentId,
                provider: 'ZOHO'
            }
        });

        const configJson = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in,
            api_domain: tokens.api_domain,
            token_type: tokens.token_type,
            expires_at: Date.now() + (tokens.expires_in * 1000),
            accounts_server: successfulDc // Critical for refreshing tokens later
        };

        if (existingIntegration) {
            await prisma.agentIntegration.update({
                where: { id: existingIntegration.id },
                data: {
                    configJson,
                    enabled: true
                }
            });
        } else {
            await prisma.agentIntegration.create({
                data: {
                    agentId: agentId,
                    provider: 'ZOHO',
                    configJson,
                    enabled: true
                }
            });
        }

        // Redirect back to agent dashboard
        return NextResponse.redirect(new URL(`/agents/${agentId}/integrations?success=zoho_connected`, request.url));

    } catch (error: any) {
        console.error('Zoho Callback Exception:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
