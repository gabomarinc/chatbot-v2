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

            const isValid = channels.some(c => (c.configJson as any).verifyToken === token) || token === process.env.INSTAGRAM_VERIFY_TOKEN;

            if (isValid) {
                console.log('INSTAGRAM WEBHOOK_VERIFIED');
                return new Response(challenge, { status: 200 });
            }
        }
    }

    return new Response('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('Instagram webhook received:', JSON.stringify(body, null, 2));

        // Instagram webhook structure: entry[].messaging[]
        const entry = body.entry?.[0];
        const messaging = entry?.messaging?.[0];

        if (!messaging) {
            console.log('No messaging event found');
            return NextResponse.json({ status: 'ok' });
        }

        const senderId = messaging.sender?.id;
        const message = messaging.message;

        if (!senderId || !message) {
            console.log('No sender or message found');
            return NextResponse.json({ status: 'ok' });
        }

        const instagramAccountId = entry.id;

        // Find the specific channel for this Instagram account
        // We fetch all active IG channels to filter in memory (safe for JSON fields compatibility)
        const channels = await prisma.channel.findMany({
            where: { type: 'INSTAGRAM', isActive: true }
        });

        const channel = channels.find(c => (c.configJson as any)?.instagramAccountId === instagramAccountId);

        if (!channel) {
            console.error(`No active Instagram channel found for Account ID: ${instagramAccountId}`);
            return NextResponse.json({ error: 'No active channel found for this account' }, { status: 404 });
        }

        const config = channel.configJson as any;

        // Handle text messages
        if (message.text) {
            const text = message.text;

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
                    // Send image first
                    await sendInstagramImage(
                        config.pageAccessToken,
                        senderId,
                        (result.agentMsg.metadata as any).url
                    );

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
            }
        }
        // Handle image messages
        else if (message.attachments && message.attachments[0]?.type === 'image') {
            const attachment = message.attachments[0];
            const imageUrl = attachment.payload?.url;

            if (imageUrl) {
                // Download image from Instagram
                const imageResponse = await fetch(imageUrl);
                const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

                // Compress with Sharp (convert to WebP, max 1920px width, 80% quality)
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
                    // Save to database with metadata
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

                    // Acknowledge receipt
                    if (result.agentMsg) {
                        await sendInstagramMessage(
                            config.pageAccessToken,
                            senderId,
                            result.agentMsg.content
                        );
                    }
                }
            }
        }
        // Handle file/document messages
        else if (message.attachments && message.attachments[0]?.type === 'file') {
            const attachment = message.attachments[0];
            const fileUrl = attachment.payload?.url;
            const fileName = attachment.name || 'document.pdf';

            if (fileUrl) {
                // Download file from Instagram
                const fileResponse = await fetch(fileUrl);
                const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());

                // Upload to R2 (no compression for documents)
                const r2Url = await uploadFileToR2(
                    fileBuffer,
                    `${Date.now()}-${fileName}`,
                    'application/pdf'
                );

                if (r2Url) {
                    // Save to database with metadata
                    const result = await sendWidgetMessage({
                        channelId: channel.id,
                        content: 'Documento recibido',
                        visitorId: senderId,
                        metadata: {
                            type: 'file',
                            url: r2Url,
                            fileName: fileName,
                            originalUrl: fileUrl
                        }
                    });

                    // Acknowledge receipt
                    if (result.agentMsg) {
                        await sendInstagramMessage(
                            config.pageAccessToken,
                            senderId,
                            result.agentMsg.content
                        );
                    }
                }
            }
        }

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('Instagram Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
