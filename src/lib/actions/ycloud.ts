'use server';

import { getYcloudWABAs, getYcloudPhoneNumbers, YcloudWABA, YcloudPhoneNumber } from '@/lib/channels/ycloud';

export async function fetchYcloudWABAsAction(apiKey: string) {
    return await getYcloudWABAs(apiKey);
}

export async function fetchYcloudPhoneNumbersAction(apiKey: string, wabaId: string) {
    return await getYcloudPhoneNumbers(apiKey, wabaId);
}
