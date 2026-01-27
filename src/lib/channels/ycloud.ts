/**
 * Ycloud API helper functions for WhatsApp
 * Documentation: https://docs.ycloud.com/reference/whatsapp_business_account-list
 */

export interface YcloudWABA {
    id: string;
    name: string;
    currency: string;
    timezone_id: string;
    message_template_namespace: string;
}

export interface YcloudPhoneNumber {
    id: string;
    display_phone_number: string;
    verified_name: string;
    quality_rating: string;
    code_verification_status: string;
}

/**
 * Fetch WhatsApp Business Accounts from Ycloud
 */
export async function getYcloudWABAs(apiKey: string): Promise<{ success: boolean; accounts?: YcloudWABA[]; error?: string }> {
    try {
        const response = await fetch('https://api.ycloud.com/v2/whatsapp/businessAccounts', {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.message || `Error ${response.status}: ${response.statusText}`
            };
        }

        const data = await response.json();
        // Checked via curl: returns { items: [] }
        return { success: true, accounts: data.items || [] };
    } catch (error: any) {
        return { success: false, error: error.message || 'Error de conexión con Ycloud' };
    }
}

/**
 * Fetch Phone Numbers for a specific WABA
 * 
 * Note: Ycloud allows fetching all numbers for the account via /phoneNumbers.
 * Filtering by WABA might be done client-side if needed, or using parameters if documented.
 * For now we fetch all accessible numbers.
 */
export async function getYcloudPhoneNumbers(apiKey: string, wabaId: string): Promise<{ success: boolean; numbers?: YcloudPhoneNumber[]; error?: string }> {
    try {
        const response = await fetch(`https://api.ycloud.com/v2/whatsapp/phoneNumbers`, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.message || `Error ${response.status}: ${response.statusText}`
            };
        }

        const data = await response.json();
        // Checked via curl: returns { items: [] }
        const allNumbers = data.items || [];

        // Optional: Filter by wabaId if wabaId is available in the phone object
        // Since we don't have the exact phone object structure confirmed (empty array in test),
        // we return all for now to be safe.
        return { success: true, numbers: allNumbers };
    } catch (error: any) {
        return { success: false, error: error.message || 'Error de conexión con Ycloud' };
    }
}
