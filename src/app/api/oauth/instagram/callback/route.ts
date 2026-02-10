import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const META_API_VERSION = 'v19.0';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');
    const errorReason = searchParams.get('error_reason');
    const errorDescription = searchParams.get('error_description');

    // Handle user cancellation or errors
    if (error) {
        console.error('Instagram OAuth Error:', { error, errorReason, errorDescription });
        const redirectUrl = stateParam
            ? `/agents?error=instagram_auth_failed&reason=${encodeURIComponent(errorDescription || error)}`
            : `/agents?error=instagram_auth_failed`;
        return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    if (!code || !stateParam) {
        return NextResponse.redirect(new URL('/agents?error=missing_oauth_params', req.url));
    }

    let state: { agentId?: string; channelId?: string } = {};
    try {
        state = JSON.parse(stateParam);
    } catch (e) {
        console.error('Failed to parse state:', e);
        return NextResponse.redirect(new URL('/agents?error=invalid_state', req.url));
    }

    const { agentId } = state;
    if (!agentId) {
        return NextResponse.redirect(new URL('/agents?error=missing_agent_id', req.url));
    }

    try {
        // Get Meta App credentials
        const appSecret = process.env.META_APP_SECRET;
        const config = await prisma.globalConfig.findUnique({ where: { key: 'META_APP_ID' } });
        const appId = config?.value;

        if (!appSecret || !appId) {
            throw new Error('Server configuration missing (Meta App ID or Secret)');
        }

        // Exchange authorization code for access token
        const redirectUri = `${req.nextUrl.origin}/api/oauth/instagram/callback`;
        const tokenUrl = `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`;

        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
            console.error('Token exchange failed:', tokenData);
            throw new Error(tokenData.error?.message || 'Failed to exchange code for token');
        }

        const shortLivedToken = tokenData.access_token;

        // Exchange for long-lived token
        const longLivedTokenUrl = `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;

        const longLivedRes = await fetch(longLivedTokenUrl);
        const longLivedData = await longLivedRes.json();

        if (!longLivedRes.ok) {
            console.error('Long-lived token exchange failed:', longLivedData);
            throw new Error(longLivedData.error?.message || 'Failed to get long-lived token');
        }

        const accessToken = longLivedData.access_token;

        // Store the access token temporarily in the session or pass it via URL
        // For simplicity, we'll redirect to a page that will handle account selection
        const successUrl = `/agents/${agentId}/channels?instagram_token=${encodeURIComponent(accessToken)}&instagram_auth=success`;

        return NextResponse.redirect(new URL(successUrl, req.url));

    } catch (error: any) {
        console.error('Instagram OAuth Callback Error:', error);
        return NextResponse.redirect(
            new URL(`/agents/${agentId}/channels?error=instagram_oauth_failed&message=${encodeURIComponent(error.message)}`, req.url)
        );
    }
}
