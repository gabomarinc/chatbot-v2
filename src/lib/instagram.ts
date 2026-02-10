/**
 * Instagram Messaging API Helper Functions
 * Mirrors WhatsApp implementation for consistency
 * Updated to use Instagram Graph API (graph.instagram.com)
 */

// Helper to split text into chunks
function splitMessage(text: string, maxLength: number = 980): string[] {
    const chunks: string[] = [];
    let currentText = text;

    while (currentText.length > 0) {
        if (currentText.length <= maxLength) {
            chunks.push(currentText);
            break;
        }

        // Find last space before maxLength to avoid splitting words
        let splitIndex = currentText.lastIndexOf(' ', maxLength);

        // If no space found (very long word), force split at maxLength
        if (splitIndex === -1) {
            splitIndex = maxLength;
        }

        chunks.push(currentText.substring(0, splitIndex));
        currentText = currentText.substring(splitIndex).trim();
    }
    return chunks;
}

export async function sendInstagramMessage(
    pageAccessToken: string,
    recipientId: string,
    text: string
) {
    // For Instagram Graph API with Instagram Login, we use /me/messages 
    // or /{ig-user-id}/messages. Since the token is user-scoped, /me/messages works.
    const url = `https://graph.instagram.com/v21.0/me/messages`;

    // 1. Split message if it's too long
    const chunks = splitMessage(text);

    // 2. Send chunks sequentially
    for (const chunk of chunks) {
        if (!chunk.trim()) continue;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${pageAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipient: {
                    id: recipientId,
                },
                message: {
                    text: chunk,
                },
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Instagram Send Error:', data);
            throw new Error(data.error?.message || 'Failed to send Instagram message');
        }
    }

    return { success: true, chunksSent: chunks.length };
}

/**
 * Send image via Instagram
 */
export async function sendInstagramImage(
    pageAccessToken: string,
    recipientId: string,
    imageUrl: string
) {
    const url = `https://graph.instagram.com/v21.0/me/messages`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${pageAccessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            recipient: {
                id: recipientId, // IGSID
            },
            message: {
                attachment: {
                    type: 'image',
                    payload: {
                        url: imageUrl,
                        is_reusable: true
                    }
                }
            },
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Instagram Send Image Error:', data);
        throw new Error(data.error?.message || 'Failed to send Instagram image');
    }

    return data;
}

/**
 * Download media file from Instagram
 */
export async function downloadInstagramMedia(
    mediaId: string,
    accessToken: string
): Promise<Buffer | null> {
    try {
        // Step 1: Get media URL via Graph API
        const mediaInfoUrl = `https://graph.instagram.com/v21.0/${mediaId}?fields=id,media_type,media_url`;
        const infoResponse = await fetch(mediaInfoUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!infoResponse.ok) {
            console.error('Failed to get Instagram media info');
            return null;
        }

        const mediaInfo = await infoResponse.json();
        const mediaUrl = mediaInfo.media_url;

        if (!mediaUrl) {
            console.error('No media_url found for media ID:', mediaId);
            return null;
        }

        // Step 2: Download the actual file
        const fileResponse = await fetch(mediaUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!fileResponse.ok) {
            console.error('Failed to download Instagram media');
            return null;
        }

        const arrayBuffer = await fileResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        console.error('Error downloading Instagram media:', error);
        return null;
    }
}
