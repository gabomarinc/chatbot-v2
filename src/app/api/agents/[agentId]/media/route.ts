import { NextRequest, NextResponse } from 'next/server';
import { uploadAgentMedia } from '@/lib/actions/agent-media';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const { agentId } = await params;
        const formData = await request.formData();
        
        const file = formData.get('file') as File;
        const description = formData.get('description') as string | null;
        const tagsStr = formData.get('tags') as string | null;
        const altText = formData.get('altText') as string | null;
        const prompt = formData.get('prompt') as string | null;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Parse tags (comma-separated string)
        const tags = tagsStr 
            ? tagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0)
            : undefined;

        const media = await uploadAgentMedia(
            agentId,
            file,
            description || undefined,
            tags,
            altText || undefined,
            prompt || undefined
        );

        return NextResponse.json(media, { status: 201 });
    } catch (error) {
        console.error('Error uploading agent media:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

