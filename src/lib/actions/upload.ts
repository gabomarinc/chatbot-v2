'use server'

import { auth } from '@/auth';
import { getPresignedUploadUrl } from '@/lib/r2';

export async function getDocsUploadUrl(fileName: string, contentType: string) {
    const session = await auth();
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    // Optional: Add more specific permission checks here if needed
    // For now, any authenticated user can upload docs for their agents

    try {
        const result = await getPresignedUploadUrl(fileName, contentType);
        return { success: true, ...result };
    } catch (error) {
        console.error('Error generating upload URL:', error);
        return { success: false, error: 'Failed to generate upload URL' };
    }
}
