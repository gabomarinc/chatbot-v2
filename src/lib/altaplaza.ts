export const ALTAPLAZA_CONFIG = {
    baseUrl: 'https://altaplaza-web.vercel.app',
    apiKey: 'sk_altaplaza_chatbot_dev',
};

/**
 * Interface for Altaplaza user data
 */
export interface AltaplazaUser {
    firstName: string;
    lastName: string;
    email: string;
    idCard: string;
    birthDate: string;
    phone?: string;
    neighborhood?: string;
}

/**
 * Interface for Altaplaza invoice data
 */
export interface AltaplazaInvoice {
    idCard: string;
    invoiceNumber: string;
    amount: number;
    storeName: string;
    imageUrl?: string;
    date?: string;
}

/**
 * 1. Verification of User (Check User)
 */
export async function checkUser(idCard: string) {
    const response = await fetch(`${ALTAPLAZA_CONFIG.baseUrl}/api/v1/external/check-user?idCard=${idCard}`, {
        headers: {
            'x-api-key': ALTAPLAZA_CONFIG.apiKey,
        },
    });

    if (response.status === 404) {
        return { exists: false };
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error checking user');
    }

    return response.json();
}

/**
 * 2. Register User
 */
export async function registerUser(userData: AltaplazaUser) {
    const response = await fetch(`${ALTAPLAZA_CONFIG.baseUrl}/api/v1/external/register-user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ALTAPLAZA_CONFIG.apiKey,
        },
        body: JSON.stringify(userData),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error registering user');
    }

    return response.json();
}

/**
 * 3. Register Invoice
 */
export async function registerInvoice(invoiceData: AltaplazaInvoice) {
    const response = await fetch(`${ALTAPLAZA_CONFIG.baseUrl}/api/v1/external/register-invoice`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ALTAPLAZA_CONFIG.apiKey,
        },
        body: JSON.stringify(invoiceData),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error registering invoice');
    }

    return response.json();
}
