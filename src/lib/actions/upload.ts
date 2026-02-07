'use server'

import { auth } from '@/auth';
import { uploadFileToR2 } from '@/lib/r2';

import { getPresignedUploadUrl } from '@/lib/r2';

export async function getDocsUploadUrl(fileName: string, contentType: string) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    try {
        const result = await getPresignedUploadUrl(fileName, contentType);
        return { success: true, ...result };
    } catch (error: any) {
        console.error('Error generating upload URL:', error);
        return { success: false, error: 'Failed to generate upload URL' };
    }
}
