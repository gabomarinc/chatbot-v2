/**
 * Instagram Messaging API Helper Functions
 * Mirrors WhatsApp implementation for consistency
 */

export async function sendInstagramMessage(
    pageAccessToken: string,
    recipientId: string,
    text: string
) {
    const url = `https://graph.facebook.com/v19.0/me/messages`;

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
                text: text,
            },
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Instagram Send Error:', data);
        throw new Error(data.error?.message || 'Failed to send Instagram message');
    }

    return data;
}

/**
 * Send image via Instagram
 */
export async function sendInstagramImage(
    pageAccessToken: string,
    recipientId: string,
    imageUrl: string
) {
    const url = `https://graph.facebook.com/v19.0/me/messages`;

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
        // Step 1: Get media URL
        const mediaInfoUrl = `https://graph.facebook.com/v19.0/${mediaId}`;
        const infoResponse = await fetch(mediaInfoUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!infoResponse.ok) {
            console.error('Failed to get Instagram media info');
            return null;
        }

        const mediaInfo = await infoResponse.json();
        const mediaUrl = mediaInfo.url;

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
