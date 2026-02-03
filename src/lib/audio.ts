
import OpenAI, { toFile } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';

async function getOpenAIClient() {
    let apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        const config = await prisma.globalConfig.findUnique({ where: { key: 'OPENAI_API_KEY' } });
        apiKey = config?.value;
    }
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    return new OpenAI({ apiKey });
}

async function getGoogleClient() {
    let apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        const config = await prisma.globalConfig.findUnique({ where: { key: 'GOOGLE_API_KEY' } });
        apiKey = config?.value;
    }
    if (!apiKey) {
        throw new Error('GOOGLE_API_KEY environment variable is not set');
    }
    return new GoogleGenerativeAI(apiKey);
}

/**
 * Transcribes an audio buffer using OpenAI Whisper or Google Gemini.
 */
export async function transcribeAudio(
    audioBuffer: Buffer,
    fileName: string = 'audio.ogg',
    provider: 'openai' | 'google' = 'openai'
): Promise<string> {
    try {
        if (provider === 'google') {
            return await transcribeWithGemini(audioBuffer, fileName);
        } else {
            return await transcribeWithOpenAI(audioBuffer, fileName);
        }
    } catch (error) {
        console.error(`Error transcribing audio with ${provider}:`, error);
        // Fallback?
        if (provider === 'google') {
            console.warn('Falling back to OpenAI for transcription...');
            return await transcribeWithOpenAI(audioBuffer, fileName);
        }
        throw error;
    }
}

async function transcribeWithOpenAI(audioBuffer: Buffer, fileName: string): Promise<string> {
    const openai = await getOpenAIClient();

    const file = await toFile(audioBuffer, fileName);

    const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'es',
    });

    return transcription.text;
}

async function transcribeWithGemini(audioBuffer: Buffer, fileName: string): Promise<string> {
    const genAI = await getGoogleClient();
    // Use Flash 1.5 for fast, cost-effective transcription
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Determine mime type
    let mimeType = 'audio/ogg';
    if (fileName.endsWith('.mp3')) mimeType = 'audio/mp3';
    if (fileName.endsWith('.wav')) mimeType = 'audio/wav';
    if (fileName.endsWith('.m4a')) mimeType = 'audio/mp4';
    if (fileName.endsWith('.mp4')) mimeType = 'audio/mp4';

    const audioPart = {
        inlineData: {
            data: audioBuffer.toString('base64'),
            mimeType: mimeType
        }
    };

    const result = await model.generateContent([
        "Transcribe the following audio file verbatim. Do not add any commentary. Return only the text.",
        audioPart
    ]);
    const response = await result.response;
    return response.text();
}
