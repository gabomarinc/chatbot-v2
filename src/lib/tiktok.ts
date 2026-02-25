/**
 * TikTok Messaging Library
 * Handles sending messages and interacting with the TikTok Business Messaging API.
 */

export async function sendTikTokMessage(
    accessToken: string,
    openId: string, // This is the user's unique ID for the TikTok account
    text: string
) {
    // Note: This is a placeholder based on TikTok Business Messaging API documentation.
    // The actual endpoint and payload structure will be refined once the developer app is live.
    const url = `https://business-api.tiktok.com/open_api/v1.3/business/message/send/`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Access-Token': accessToken,
            },
            body: JSON.stringify({
                recipient_openid: openId,
                message_type: 'TEXT',
                content: JSON.stringify({ text }),
            }),
        });

        const data = await response.json();

        if (data.code !== 0) {
            console.error('[TikTok API Error]', data);
            return { success: false, error: data.message };
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('[TikTok API Exception]', error);
        return { success: false, error: error.message };
    }
}
