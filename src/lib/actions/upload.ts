'use server'

import { auth } from '@/auth';
import { uploadFileToR2 } from '@/lib/r2';

export async function uploadFile(base64Content: string, fileName: string, contentType: string) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    try {
        console.log(`[UPLOAD] Starting server-side upload for: ${fileName}`);

        // Convert Base64 to Buffer
        const buffer = Buffer.from(base64Content, 'base64');

        // Upload to R2
        const publicUrl = await uploadFileToR2(buffer, fileName, contentType);

        return { success: true, publicUrl };
    } catch (error: any) {
        console.error('Error uploading file:', error);
        return { success: false, error: error.message || 'Failed to upload file' };
    }
}
