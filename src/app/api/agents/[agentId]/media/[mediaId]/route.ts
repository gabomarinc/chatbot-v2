import { NextRequest, NextResponse } from 'next/server';
import { deleteAgentMedia } from '@/lib/actions/agent-media';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ agentId: string; mediaId: string }> }
) {
    try {
        const { mediaId } = await params;
        
        await deleteAgentMedia(mediaId);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error deleting agent media:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

