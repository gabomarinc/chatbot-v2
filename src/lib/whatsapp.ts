
/**
 * Helper to convert Markdown to WhatsApp formatting
 */
export function formatForWhatsApp(text: string): string {
    return text
        // Replace double asterisks **bold** with single *bold*
        .replace(/\*\*(.*?)\*\*/g, '*$1*')
        // Replace markdown headers ### Header with *Header*
        .replace(/^#{1,6}\s+(.*)$/gm, '*$1*')
        // Replace markdown links [text](url) with text (url)
        .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)')
        // Replace bullet points - Item with • Item
        .replace(/^\s*-\s/gm, '• ');
}

export async function sendWhatsAppMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    text: string
) {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    // Apply formatting
    const formattedText = formatForWhatsApp(text);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'text',
            text: {
                preview_url: false,
                body: formattedText,
            },
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('WhatsApp Send Error:', data);
        throw new Error(data.error?.message || 'Failed to send WhatsApp message');
    }

    return data;
}

/**
 * Useful for future template-based notifications
 */
export async function sendWhatsAppTemplate(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    templateName: string,
    languageCode: string = 'es'
) {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to,
            type: 'template',
            template: {
                name: templateName,
                language: {
                    code: languageCode,
                },
            },
        }),
    });

    return await response.json();
}

/**
 * Download media file from WhatsApp
 */
export async function downloadWhatsAppMedia(
    mediaId: string,
    accessToken: string
): Promise<Buffer | null> {
    try {
        // Step 1: Get media URL
        const mediaInfoUrl = `https://graph.facebook.com/v21.0/${mediaId}`;
        const infoResponse = await fetch(mediaInfoUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!infoResponse.ok) {
            console.error('Failed to get media info');
            return null;
        }

        const mediaInfo = await infoResponse.json();
        const mediaUrl = mediaInfo.url;

        // Step 2: Download the actual file
        const fileResponse = await fetch(mediaUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!fileResponse.ok) {
            console.error('Failed to download media');
            return null;
        }

        const arrayBuffer = await fileResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        console.error('Error downloading WhatsApp media:', error);
        return null;
    }
}
