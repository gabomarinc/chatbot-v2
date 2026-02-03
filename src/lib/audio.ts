
import OpenAI, { toFile } from 'openai';

function getOpenAIClient() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    return new OpenAI({ apiKey });
}

/**
 * Transcribes an audio buffer using OpenAI Whisper.
 * @param audioBuffer The audio file buffer
 * @param fileName The filename (e.g., 'audio.ogg') - Extension matters for MIME type detection
 * @returns The transcribed text
 */
export async function transcribeAudio(audioBuffer: Buffer, fileName: string = 'audio.ogg'): Promise<string> {
    try {
        const openai = getOpenAIClient();

        // Convert Buffer to File-like object that OpenAI SDK accepts
        const file = await toFile(audioBuffer, fileName);

        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
            language: 'es', // Default to Spanish as per user context
        });

        return transcription.text;
    } catch (error) {
        console.error('Error transcribing audio:', error);
        throw new Error('Failed to transcribe audio');
    }
}
