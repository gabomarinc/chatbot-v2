import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWidgetMessage } from '@/lib/actions/widget';
import { sendWhatsAppMessage, downloadWhatsAppMedia } from '@/lib/whatsapp';
import { uploadFileToR2 } from '@/lib/r2';
import sharp from 'sharp';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe') {
      // Find any WhatsApp channel to check verify token
      // In a multi-tenant system, we might need a better way to verify tokens, 
      // but usually Meta app-level verify token is what matters.
      // Allow verification if ANY channel matches OR if using the Master Token
      // This decouples Platform Setup from having active users
      const MASTER_TOKEN = 'konsul_master_verify_secret';

      // For simplicity, let's assume a global env var for verification, 
      // or find it in the first active whatsapp channel.
      const channels = await prisma.channel.findMany({
        where: { type: 'WHATSAPP', isActive: true }
      });

      const isValid = token === MASTER_TOKEN || channels.some(c => (c.configJson as any).verifyToken === token) || token === process.env.WHATSAPP_VERIFY_TOKEN;

      if (isValid) {
        console.log('WEBHOOK_VERIFIED');
        return new Response(challenge, { status: 200 });
      }
    }
  }

  return new Response('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Incoming WhatsApp Webhook:', JSON.stringify(body, null, 2));

    // Check if it's a message event
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value && value.messages?.[0]) {
      const message = value.messages[0];
      const phoneNumberId = value.metadata.phone_number_id;
      const senderNumber = message.from;
      const messageType = message.type;

      // Find the channel
      const channels = await prisma.channel.findMany({
        where: { type: 'WHATSAPP', isActive: true },
        include: { agent: true }
      });

      const channel = channels.find(c => (c.configJson as any).phoneNumberId === phoneNumberId);

      if (!channel) {
        console.error('Channel not found for ID:', phoneNumberId);
        return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
      }

      const config = channel.configJson as any;

      // Handle text messages
      if (messageType === 'text') {
        const text = message.text?.body;

        if (text) {
          // Process with AI (Reusing widget logic)
          const result = await sendWidgetMessage({
            channelId: channel.id,
            content: text,
            visitorId: senderNumber
          });

          // Send response back to WhatsApp
          await sendWhatsAppMessage(
            phoneNumberId,
            config.accessToken,
            senderNumber,
            result.agentMsg.content
          );
        }
      }
      // Handle image messages
      else if (messageType === 'image') {
        const mediaId = message.image?.id;
        const caption = message.image?.caption || 'Imagen recibida';

        if (mediaId) {
          // Download image from WhatsApp
          const imageBuffer = await downloadWhatsAppMedia(mediaId, config.accessToken);

          if (imageBuffer) {
            // Compress with Sharp (convert to WebP, max 1920px width, 80% quality)
            const compressedBuffer = await sharp(imageBuffer)
              .resize(1920, null, { withoutEnlargement: true })
              .webp({ quality: 80 })
              .toBuffer();

            // Upload to R2
            const r2Url = await uploadFileToR2(
              compressedBuffer,
              `${Date.now()}-${senderNumber}.webp`,
              'image/webp'
            );

            if (r2Url) {
              // Save to database with metadata
              const result = await sendWidgetMessage({
                channelId: channel.id,
                content: caption || 'Imagen recibida',
                visitorId: senderNumber,
                imageUrl: r2Url,
                metadata: {
                  type: 'image',
                  url: r2Url,
                  originalMediaId: mediaId
                }
              });

              // Acknowledge receipt
              await sendWhatsAppMessage(
                phoneNumberId,
                config.accessToken,
                senderNumber,
                result.agentMsg.content
              );
            }
          }
        }
      }
      // Handle document messages (PDFs, etc.)
      else if (messageType === 'document') {
        const mediaId = message.document?.id;
        const fileName = message.document?.filename || 'document.pdf';
        const mimeType = message.document?.mime_type || 'application/pdf';
        const caption = message.document?.caption || 'Documento recibido';

        if (mediaId) {
          // Download document from WhatsApp
          const docBuffer = await downloadWhatsAppMedia(mediaId, config.accessToken);

          if (docBuffer) {
            // Upload to R2 (no compression for documents)
            const r2Url = await uploadFileToR2(
              docBuffer,
              `${Date.now()}-${fileName}`,
              mimeType
            );

            if (r2Url) {
              // Save to database with metadata
              const result = await sendWidgetMessage({
                channelId: channel.id,
                content: caption,
                visitorId: senderNumber,
                metadata: {
                  type: 'file',
                  url: r2Url,
                  fileName: fileName,
                  mimeType: mimeType,
                  originalMediaId: mediaId
                }
              });

              // Acknowledge receipt
              await sendWhatsAppMessage(
                phoneNumberId,
                config.accessToken,
                senderNumber,
                result.agentMsg.content
              );
            }
          }
        }
      }
      // Handle audio messages (Voice Notes)
      else if (messageType === 'audio') {
        const mediaId = message.audio?.id;
        const mimeType = message.audio?.mime_type || 'audio/ogg'; // WhatsApp usually sends OGG
        // extension mapping
        const ext = mimeType.split('/')[1]?.split(';')[0] || 'ogg';
        const fileName = `${Date.now()}-${senderNumber}.${ext}`;

        if (mediaId) {
          // 1. Download audio from WhatsApp
          const audioBuffer = await downloadWhatsAppMedia(mediaId, config.accessToken);

          if (audioBuffer) {
            // 2. Upload to R2 (Store original audio)
            const r2Url = await uploadFileToR2(
              audioBuffer,
              fileName,
              mimeType
            );

            // 3. Transcribe with Whisper or Gemini depending on Agent Model
            const agentModel = (channel as any).agent?.model || '';
            const transcriptionProvider = agentModel.toLowerCase().includes('gemini') ? 'google' : 'openai';

            console.log(`[WhatsApp Audio] Using provider: ${transcriptionProvider} for model: ${agentModel}`);

            const { transcribeAudio } = await import('@/lib/audio');
            const transcription = await transcribeAudio(audioBuffer, fileName, transcriptionProvider);

            if (transcription) {
              console.log(`[WhatsApp Audio] Transcribed: "${transcription}"`);

              // 4. Process as if it were a text message from the user
              // pass original R2 URL in metadata so we can show audio player in UI eventually
              const result = await sendWidgetMessage({
                channelId: channel.id,
                content: transcription, // The AI reads the text
                visitorId: senderNumber,
                metadata: {
                  type: 'audio',
                  url: r2Url || '',
                  originalMediaId: mediaId,
                  transcription: transcription
                }
              });

              // 5. Send AI Response back to WhatsApp
              await sendWhatsAppMessage(
                phoneNumberId,
                config.accessToken,
                senderNumber,
                result.agentMsg.content
              );
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('WhatsApp Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
