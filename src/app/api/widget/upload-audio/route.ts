import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToR2 } from '@/lib/r2';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        // Validate file type (audio)
        if (!file.type.startsWith('audio/')) {
            return NextResponse.json({ error: 'File must be an audio recording' }, { status: 400 });
        }

        // Load OpenAI API Key
        let apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            const config = await (prisma as any).config.findUnique({
                where: { key: 'OPENAI_API_KEY' }
            });
            apiKey = config?.value;
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'AI transcription is not configured.' }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey });

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 1. Upload to R2 for storage/playback
        const fileUrl = await uploadFileToR2(buffer, `voice-note-${Date.now()}.webm`, file.type);

        // 2. Transcribe using Whisper
        const transcriptionResponse = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
        });

        const transcription = transcriptionResponse.text;

        return NextResponse.json({
            url: fileUrl,
            transcription: transcription,
            type: 'audio',
            mimeType: file.type
        });

    } catch (error: any) {
        console.error('[UPLOAD_AUDIO] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
