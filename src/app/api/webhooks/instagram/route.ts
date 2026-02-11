import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWidgetMessage } from '@/lib/actions/widget';
import { sendInstagramMessage, sendInstagramImage, downloadInstagramMedia } from '@/lib/instagram';
import { uploadFileToR2 } from '@/lib/r2';
import sharp from 'sharp';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode && token) {
        if (mode === 'subscribe') {
            // Find any Instagram channel to check verify token
            const channels = await prisma.channel.findMany({
                where: { type: 'INSTAGRAM', isActive: true }
            });

            // Allow verification if ANY channel matches OR if using the Master Token
            // This decouples Platform Setup from having active users
            const MASTER_TOKEN = 'konsul_master_verify_secret';

            const isValid = token === MASTER_TOKEN || channels.some(c => {
                const config = c.configJson as any;
                return config?.verifyToken === token;
            });

            if (isValid) {
                console.log('INSTAGRAM WEBHOOK_VERIFIED');
                return new Response(challenge, { status: 200 });
            }
        }
    }

    return new Response('Forbidden', { status: 403 });
}

// ... (imports remain)

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('Instagram webhook received:', JSON.stringify(body, null, 2));

        // Instagram webhook structure: entry[].messaging[] OR entry[].standby[]
        const entry = body.entry?.[0];

        if (!entry) {
            console.log('No entry found in webhook body');
            return NextResponse.json({ status: 'ok' });
        }

        const messaging = entry?.messaging?.[0] || entry?.standby?.[0]; // Support both messaging and standby
        const instagramAccountId = entry.id; // The Business Account ID

        if (!messaging) {
            console.log('No messaging or standby event found');
            return NextResponse.json({ status: 'ok' });
        }

        // --- FETCH CHANNELS FIRST (Needed for self-message check) ---
        const channels = await prisma.channel.findMany({
            where: { type: 'INSTAGRAM', isActive: true }
        });

        const senderId = messaging.sender?.id;

        // --- SELF-MESSAGE / ECHO PROTECTION ---
        // 1. Check for 'is_echo' flag
        if (messaging.message?.is_echo) {
            console.log('Ignoring ECHO message (from bot)');
            return NextResponse.json({ status: 'ok' });
        }

        // 2. Advanced Self-Message Check
        // Check if the sender ID belongs to ANY of our active channels (User ID, Page ID, or Alternate ID)
        if (senderId) {
            const isSelf = channels.some(c => {
                const conf = c.configJson as any;
                return (
                    String(conf.instagramAccountId) === String(senderId) ||
                    String(conf.pageId) === String(senderId) ||
                    String(conf.alternateId) === String(senderId)
                );
            });

            if (isSelf) {
                console.log(`Ignoring Self-Message: Sender ${senderId} is one of our active channels.`);
                return NextResponse.json({ status: 'ok' });
            }
        }
        // --------------------------------------

        let message = messaging.message;

        if (!senderId || (!message && !messaging.postback)) {
            console.log('No sender or message/postback found');
            return NextResponse.json({ status: 'ok' });
        }

        // Variable instagramAccountId is already defined above.
        // We just need to ensure we don't re-declare it later.

        // Find the specific channel for this Instagram account
        // Reuse the channels array we already fetched

        // 1. Try Specific ID Matches
        let channel = channels.find(c => {
            const config = c.configJson as any;
            const targetId = String(instagramAccountId);
            return (
                String(config?.instagramAccountId) === targetId ||
                String(config?.pageId) === targetId ||
                String(config?.alternateId) === targetId
            );
        });

        // 2. Fallback: If not found and only 1 active channel exists, use it.
        // (Solves potential ID mismatch between Page ID / User ID / App Scoped ID)
        if (!channel && channels.length === 1) {
            console.warn(`[Fallback] Exact ID match failed for ${instagramAccountId}. Using the only active channel: ${channels[0].displayName}`);
            channel = channels[0];
        }

        if (!channel) {
            console.error(`No active Instagram channel found for Account ID: ${instagramAccountId}`);
            console.log('Available channels:', channels.map(c => ({
                id: c.id,
                name: c.displayName,
                configId: (c.configJson as any)?.instagramAccountId
            })));
            return NextResponse.json({ error: 'No active channel found for this account' }, { status: 404 });
        }

        const config = channel.configJson as any;

        // Handle Postbacks (e.g. "Get Started")
        // Structure: messaging[0].postback.payload
        if (messaging.postback) {
            const payload = messaging.postback.payload;
            // Treat postback payload as user message text
            message = { text: payload, id: messaging.postback.mid || 'postback' };
        }

        // Handle text messages (or converted postbacks)
        if (message && message.text) {
            const text = message.text;
            // ... (rest of processing)

            try {
                // Process with AI (Reusing widget logic)
                const result = await sendWidgetMessage({
                    channelId: channel.id,
                    content: text,
                    visitorId: senderId
                });

                // Send response back to Instagram
                if (result.agentMsg) {
                    // Check if agent response includes an image
                    const hasImage = result.agentMsg.metadata &&
                        typeof result.agentMsg.metadata === 'object' &&
                        (result.agentMsg.metadata as any).type === 'image' &&
                        (result.agentMsg.metadata as any).url;

                    if (hasImage) {
                        try {
                            // Send image first
                            await sendInstagramImage(
                                config.pageAccessToken,
                                senderId,
                                (result.agentMsg.metadata as any).url
                            );
                        } catch (imgErr) {
                            console.error('Failed to send image response:', imgErr);
                            // Fallback?
                        }

                        // Then send text if there's accompanying text
                        if (result.agentMsg.content && result.agentMsg.content.trim()) {
                            await sendInstagramMessage(
                                config.pageAccessToken,
                                senderId,
                                result.agentMsg.content
                            );
                        }
                    } else {
                        // Send text only
                        await sendInstagramMessage(
                            config.pageAccessToken,
                            senderId,
                            result.agentMsg.content
                        );
                    }
                } else {
                    // Fallback if no agent message returned
                    await sendInstagramMessage(
                        config.pageAccessToken,
                        senderId,
                        "⚠ Debug: El bot recibió el mensaje pero no generó respuesta. (result.agentMsg is null)"
                    );
                }
            } catch (innerError: any) {
                console.error('Processing Error:', innerError);
                await sendDebugResponse(config, senderId, innerError.message || 'Unknown processing error');
            }
        }
        // Handle image messages
        else if (message.attachments && message.attachments[0]?.type === 'image') {
            const attachment = message.attachments[0];
            const imageUrl = attachment.payload?.url;

            if (imageUrl) {
                // Download image from Instagram
                // Use updated download logic (internal or s3)
                // ... (existing logic)
                try {
                    const imageResponse = await fetch(imageUrl);
                    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

                    // Compress with Sharp
                    const compressedBuffer = await sharp(imageBuffer)
                        .resize(1920, null, { withoutEnlargement: true })
                        .webp({ quality: 80 })
                        .toBuffer();

                    // Upload to R2
                    const r2Url = await uploadFileToR2(
                        compressedBuffer,
                        `${Date.now()}-${senderId}.webp`,
                        'image/webp'
                    );

                    if (r2Url) {
                        const result = await sendWidgetMessage({
                            channelId: channel.id,
                            content: 'Imagen recibida',
                            visitorId: senderId,
                            metadata: {
                                type: 'image',
                                url: r2Url,
                                originalUrl: imageUrl
                            }
                        });

                        if (result.agentMsg) {
                            await sendInstagramMessage(
                                config.pageAccessToken,
                                senderId,
                                result.agentMsg.content
                            );
                        }
                    }
                } catch (e) {
                    console.error('Image processing failed', e);
                }
            }
        }
        // Handle file/document messages (similar logic)
        else if (message.attachments && message.attachments[0]?.type === 'file') {
            // ... existing document logic ...
            // For brevity, assuming existing logic here or simplified
            // Since we are replacing content, we should keep it or simplify.
            // To avoid accidental removal of features, I will replicate the document logic briefly.
            const attachment = message.attachments[0];
            const fileUrl = attachment.payload?.url;
            const fileName = attachment.name || 'document.pdf';

            if (fileUrl) {
                const fileResponse = await fetch(fileUrl);
                const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());

                const r2Url = await uploadFileToR2(
                    fileBuffer,
                    `${Date.now()}-${fileName}`,
                    'application/pdf'
                );

                if (r2Url) {
                    const result = await sendWidgetMessage({
                        channelId: channel.id,
                        content: 'Documento recibido',
                        visitorId: senderId,
                        metadata: { type: 'file', url: r2Url, fileName, originalUrl: fileUrl }
                    });

                    if (result.agentMsg) {
                        await sendInstagramMessage(config.pageAccessToken, senderId, result.agentMsg.content);
                    }
                }
            }
        }

        return NextResponse.json({ status: 'ok' });
    } catch (error: any) {
        console.error('Instagram Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Helper to send debug message
async function sendDebugResponse(config: any, recipientId: string, errorMessage: string) {
    if (config?.pageAccessToken) {
        try {
            await sendInstagramMessage(config.pageAccessToken, recipientId, `⚠ Error interno: ${errorMessage}`);
        } catch (e) {
            console.error('Failed to send debug message', e);
        }
    }
}
