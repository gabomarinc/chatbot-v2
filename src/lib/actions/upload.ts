'use server'

import { auth } from '@/auth';
import { uploadFileToR2 } from '@/lib/r2';

export async function uploadFile(formData: FormData) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    try {
        const file = formData.get('file') as File;
        if (!file) {
            throw new Error('No file provided');
        }

        console.log(`[UPLOAD] Starting server-side upload for: ${file.name} (Size: ${file.size})`);

        // Convert File to Buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to R2
        const publicUrl = await uploadFileToR2(buffer, file.name, file.type);

        return { success: true, publicUrl };
    } catch (error: any) {
        console.error('Error uploading file:', error);
        return { success: false, error: error.message || 'Failed to upload file' };
    }
}
