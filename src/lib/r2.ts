import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getR2Client() {
    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
    const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        throw new Error('R2 credentials not configured');
    }

    return new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
    });
}

export async function uploadFileToR2(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string
): Promise<string> {
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;

    if (!R2_BUCKET_NAME || !R2_ACCOUNT_ID) {
        const errorMsg = 'R2 credentials missing. Please configure R2_BUCKET_NAME and R2_ACCOUNT_ID environment variables.';
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    try {
        const key = `${Date.now()}-${fileName}`;
        const R2 = getR2Client();

        await R2.send(
            new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                Body: fileBuffer,
                ContentType: contentType,
                // ACL: 'public-read', // R2 doesn't support ACLs the same way, usually managed via bucket settings or worker
            })
        );

        // Construct Public URL
        // Use R2_PUBLIC_DOMAIN if configured (e.g., https://pub-xxx.r2.dev)
        const publicDomain = process.env.R2_PUBLIC_DOMAIN;

        let finalUrl: string;
        if (publicDomain) {
            // Remove trailing slash if present
            const cleanDomain = publicDomain.replace(/\/$/, '');
            finalUrl = `${cleanDomain}/${key}`;
        } else {
            // Fallback: Try to construct R2.dev public URL
            // Defaulting to the known public bucket URL if usage is local/missing env
            const fallbackDomain = "https://pub-5e59c87fa6664e4e91ada693f54a5a6c.r2.dev";
            finalUrl = `${fallbackDomain}/${key}`;
        }

        console.log('[R2] Uploaded file, key:', key, 'URL:', finalUrl);
        return finalUrl;
    } catch (error) {
        console.error('Error uploading to R2:', error);
        throw error; // Re-throw to let caller handle it

    }
}

export async function getPresignedUploadUrl(
    fileName: string,
    contentType: string
): Promise<{ signedUrl: string, publicUrl: string }> {
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

    if (!R2_BUCKET_NAME) {
        throw new Error('R2_BUCKET_NAME not configured');
    }

    const key = `${Date.now()}-${fileName}`;
    const R2 = getR2Client();

    const signedUrl = await getSignedUrl(
        R2,
        new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        }),
        { expiresIn: 3600 }
    );

    // Construct Public URL
    const publicDomain = process.env.R2_PUBLIC_DOMAIN;
    let publicUrl: string;

    if (publicDomain) {
        const cleanDomain = publicDomain.replace(/\/$/, '');
        publicUrl = `${cleanDomain}/${key}`;
    } else {
        // Fallback or dev
        const fallbackDomain = "https://pub-5e59c87fa6664e4e91ada693f54a5a6c.r2.dev";
        publicUrl = `${fallbackDomain}/${key}`;
    }

    return { signedUrl, publicUrl };
}

