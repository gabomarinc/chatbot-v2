import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWidgetMessage } from '@/lib/actions/widget';
import { sendTikTokMessage } from '@/lib/tiktok';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    // TikTok verification usually involves a specific challenge or code
    // similar to Meta, but the exact params depend on the API version.
    const challenge = searchParams.get('challenge');

    if (challenge) {
        return new Response(challenge, { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('Incoming TikTok Webhook:', JSON.stringify(body, null, 2));

        // 1. Identify valid TikTok event (message)
        const event = body.event;
        if (event === 'message' || body.message) {
            const senderOpenId = body.sender_openid || body.message?.sender_openid;
            const messageText = body.content?.text || body.message?.content?.text;
            const businessId = body.business_id;

            if (senderOpenId && messageText) {
                // 2. Find the TikTok channel linked to this businessId
                const channel = await prisma.channel.findFirst({
                    where: {
                        type: 'TIKTOK',
                        isActive: true,
                        configJson: {
                            path: ['businessId'],
                            equals: businessId
                        }
                    },
                    include: { agent: true }
                });

                if (channel) {
                    const config = channel.configJson as any;

                    // 3. Process with AI
                    const result = await sendWidgetMessage({
                        channelId: channel.id,
                        content: messageText,
                        visitorId: senderOpenId,
                        metadata: {
                            source: 'tiktok',
                            businessId
                        }
                    });

                    // 4. Send response back to TikTok
                    if (result.agentMsg && config.accessToken) {
                        await sendTikTokMessage(
                            config.accessToken,
                            senderOpenId,
                            result.agentMsg.content
                        );
                    }
                }
            }
        }

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('TikTok Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
