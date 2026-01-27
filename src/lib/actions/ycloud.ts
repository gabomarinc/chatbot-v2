'use server';

import { getYcloudWABAs, getYcloudPhoneNumbers } from '@/lib/channels/ycloud';

export async function fetchYcloudWABAsAction(apiKey?: string) {
    const key = apiKey || process.env.YCLOUD_API_KEY;
    if (!key) return { success: false, error: "Configuration Error: Ycloud API Key not found." };
    return await getYcloudWABAs(key);
}

export async function fetchYcloudPhoneNumbersAction(apiKey: string | undefined, wabaId: string) {
    const key = apiKey || process.env.YCLOUD_API_KEY;
    if (!key) return { success: false, error: "Configuration Error: Ycloud API Key not found." };
    return await getYcloudPhoneNumbers(key, wabaId);
}
