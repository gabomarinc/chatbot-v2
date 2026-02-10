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
        // Get Instagram App credentials (specifically for Instagram Login)
        // These must match the App ID used in the frontend (25648355308093184)
        const config = await prisma.globalConfig.findUnique({ where: { key: 'INSTAGRAM_APP_ID' } });
        const appId = config?.value;
        const appSecret = process.env.INSTAGRAM_APP_SECRET;

        console.log('Instagram Callback Debug:', { appId, hasSecret: !!appSecret });

        if (!appSecret || !appId) {
            console.error('Missing configuration: INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET');
            throw new Error('Server configuration missing (Instagram App ID or Secret)');
        }

        // Exchange authorization code for access token
        // For "Instagram Connect" / "Instagram Login" product, the endpoint is api.instagram.com for the initial exchange
        const redirectUri = `${req.nextUrl.origin}/api/oauth/instagram/callback`;
        const tokenUrl = `https://api.instagram.com/oauth/access_token`;

        const formData = new URLSearchParams();
        formData.append('client_id', appId);
        formData.append('client_secret', appSecret);
        formData.append('grant_type', 'authorization_code');
        formData.append('redirect_uri', redirectUri);
        formData.append('code', code);

        console.log('Exchanging code for token at:', tokenUrl);

        const tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            body: formData
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
            console.error('Token exchange failed:', tokenData);
            throw new Error(tokenData.error_message || tokenData.error?.message || 'Failed to exchange code for token');
        }

        console.log('Token exchange success:', { userId: tokenData.user_id, hasToken: !!tokenData.access_token });

        // Note: The token returned here is usually a short-lived Instagram User Token.
        // For Business, we might need to query the Graph API to get the Page/Business accounts.
        // But first, let's pass this token back to the client to handle the "Get Accounts" step.

        const accessToken = tokenData.access_token;
        const userId = tokenData.user_id; // Instagram User ID

        // Redirect to success page with token
        // We pass the token to the frontend so it can use it to list pages/accounts via client-side or another API call
        const successUrl = `/agents/${agentId}/channels?instagram_token=${encodeURIComponent(accessToken)}&instagram_user_id=${userId}&instagram_auth=success`;

        return NextResponse.redirect(new URL(successUrl, req.url));

    } catch (error: any) {
        console.error('Instagram OAuth Callback Error:', error);
        return NextResponse.redirect(
            new URL(`/agents/${agentId}/channels?error=instagram_oauth_failed&message=${encodeURIComponent(error.message)}`, req.url)
        );
    }
}
