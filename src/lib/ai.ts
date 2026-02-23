import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';

/**
 * Generates an embedding for a given text using OpenAI or Gemini.
 * Standardizes on 1536 dimensions (OpenAI) or 768 (Gemini).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    // 0. Resolve API Keys
    let openaiKey = process.env.OPENAI_API_KEY;
    let googleKey = process.env.GOOGLE_API_KEY;

    if (!openaiKey || !googleKey) {
        const configs = await prisma.globalConfig.findMany({
            where: {
                key: { in: ['OPENAI_API_KEY', 'GOOGLE_API_KEY'] }
            }
        });
        if (!openaiKey) openaiKey = configs.find((c: any) => c.key === 'OPENAI_API_KEY')?.value;
        if (!googleKey) googleKey = configs.find((c: any) => c.key === 'GOOGLE_API_KEY')?.value;
    }

    // Try OpenAI first (standard for RAG)
    if (openaiKey) {
        try {
            const openai = new OpenAI({ apiKey: openaiKey });
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: text.replace(/\n/g, ' '),
            });
            return response.data[0].embedding;
        } catch (error) {
            console.error('OpenAI Embedding Error:', error);
        }
    }

    // Fallback to Gemini if OpenAI fails or is missing
    if (googleKey) {
        try {
            const genAI = new GoogleGenerativeAI(googleKey);
            const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
            const result = await model.embedContent(text);
            return Array.from(result.embedding.values);
        } catch (error) {
            console.error('Gemini Embedding Error:', error);
        }
    }

    throw new Error('No AI provider available for embeddings');
}

/**
 * Calculates cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (magA * magB);
}
/**
 * Generates a simple text response using available AI providers.
 */
export async function generateSimpleSafeResponse(prompt: string, systemPrompt?: string): Promise<string> {
    let openaiKey = process.env.OPENAI_API_KEY;
    let googleKey = process.env.GOOGLE_API_KEY;

    if (!openaiKey || !googleKey) {
        const configs = await prisma.globalConfig.findMany({
            where: { key: { in: ['OPENAI_API_KEY', 'GOOGLE_API_KEY'] } }
        });
        if (!openaiKey) openaiKey = configs.find((c: any) => c.key === 'OPENAI_API_KEY')?.value;
        if (!googleKey) googleKey = configs.find((c: any) => c.key === 'GOOGLE_API_KEY')?.value;
    }

    if (openaiKey) {
        try {
            const openai = new OpenAI({ apiKey: openaiKey });
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
                    { role: 'user' as const, content: prompt }
                ],
                temperature: 0.3
            });
            return completion.choices[0].message.content || '';
        } catch (e) {
            console.error('Simple OpenAI Error:', e);
        }
    }

    if (googleKey) {
        try {
            const genAI = new GoogleGenerativeAI(googleKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt);
            return result.response.text();
        } catch (e) {
            console.error('Simple Gemini Error:', e);
        }
    }

    throw new Error('No AI provider available for simple response');
}
