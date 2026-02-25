import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Get encryption key from environment
// It should be 32 bytes for AES-256
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

function getMasterKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('ENCRYPTION_KEY is missing in production environment');
        }
        // Fallback for development only
        return scryptSync('dev-secret-do-not-use-in-prod', 'salt', 32);
    }

    // If key is provided as hex string, convert to buffer
    if (key.length === 64) {
        return Buffer.from(key, 'hex');
    }

    // Otherwise derive a 32-byte key from whatever string is provided
    return scryptSync(key, 'konsul-salt-v1', 32);
}

/**
 * Encrypts a string using AES-256-GCM
 * Returns a string in format: iv:authTag:encryptedContent
 */
export function encrypt(text: string): string {
    const iv = randomBytes(IV_LENGTH);
    const key = getMasterKey();
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted string 
 * Input format: iv:authTag:encryptedContent
 */
export function decrypt(encryptedText: string): string {
    try {
        const [ivHex, authTagHex, content] = encryptedText.split(':');

        if (!ivHex || !authTagHex || !content) {
            // Not in encrypted format, return as is (useful for transition period)
            return encryptedText;
        }

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = getMasterKey();

        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(content, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('[CRYPTO] Decryption failed:', error);
        // Fallback: if it fails, maybe it wasn't encrypted? 
        // During migration this helps avoid crashes
        return encryptedText;
    }
}

/**
 * Helper to encrypt/decrypt sensitive fields in an object
 */
export function encryptFields(obj: any, fields: string[]): any {
    const newObj = { ...obj };
    for (const field of fields) {
        if (newObj[field] && typeof newObj[field] === 'string' && !newObj[field].includes(':')) {
            newObj[field] = encrypt(newObj[field]);
        }
    }
    return newObj;
}

export function decryptFields(obj: any, fields: string[]): any {
    const newObj = { ...obj };
    for (const field of fields) {
        if (newObj[field] && typeof newObj[field] === 'string') {
            newObj[field] = decrypt(newObj[field]);
        }
    }
    return newObj;
}
