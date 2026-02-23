import { prisma } from './prisma';
import { generateEmbedding, cosineSimilarity } from './ai';
import { CohereClient } from 'cohere-ai';

export interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
  sourceName?: string;
  sourceType?: string;
}

/**
 * Generates a hypothetical technical answer to improve vector search (HyDE)
 */
async function generateHypotheticalAnswer(query: string): Promise<string> {
  try {
    let openaiKey = process.env.OPENAI_API_KEY;
    let googleKey = process.env.GOOGLE_API_KEY;

    if (!openaiKey || !googleKey) {
      const configs = await prisma.globalConfig.findMany({
        where: { key: { in: ['OPENAI_API_KEY', 'GOOGLE_API_KEY'] } }
      });
      if (!openaiKey) openaiKey = configs.find((c: any) => c.key === 'OPENAI_API_KEY')?.value;
      if (!googleKey) googleKey = configs.find((c: any) => c.key === 'GOOGLE_API_KEY')?.value;
    }

    const prompt = `Actúa como un experto técnico. Genera una respuesta hipotética, detallada y factual a la siguiente pregunta. 
Enfócate en terminología específica y datos que probablemente aparecerían en un manual o catálogo oficial.
Pregunta: ${query}
Respuesta experta (concisa y técnica):`;

    if (openaiKey) {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: openaiKey });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        max_tokens: 300
      });
      return completion.choices[0].message.content || query;
    } else if (googleKey) {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(googleKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      return result.response.text() || query;
    }
    return query;
  } catch (e) {
    console.error('[HYDE] Generation failed:', e);
    return query;
  }
}

/**
 * Retrieve relevant chunks for a query using Weighted Ensemble: Original Query + HyDE + Re-ranking
 */
export async function retrieveRelevantChunks(
  agentId: string,
  query: string,
  limit: number = 5
): Promise<DocumentChunk[]> {
  try {
    console.log(`[RETRIEVAL] Starting Ensemble Retrieval for agent: ${agentId}`);

    // 1. Parallel Generation & Fetching
    const hypotheticalAnswerPromise = generateHypotheticalAnswer(query);
    const chunksPromise = prisma.documentChunk.findMany({
      where: {
        knowledgeSource: {
          knowledgeBase: { agentId },
          status: 'READY'
        }
      },
      include: {
        knowledgeSource: true
      }
    });

    const [hypotheticalAnswer, chunks] = await Promise.all([
      hypotheticalAnswerPromise,
      chunksPromise
    ]);

    if (chunks.length === 0) return [];

    // 2. Dual Search: Embed Original Query and HyDE Context
    const [queryEmbed, hydeEmbed] = await Promise.all([
      generateEmbedding(query),
      generateEmbedding(hypotheticalAnswer)
    ]);

    // 3. Weighted Ensemble Scoring
    // We give 70% weight to original query (precision) and 30% to HyDE (semantic expansion)
    const scoredChunks = chunks.map((chunk) => {
      const chunkEmbedding = chunk.embedding as number[];
      const querySim = cosineSimilarity(queryEmbed, chunkEmbedding);
      const hydeSim = cosineSimilarity(hydeEmbed, chunkEmbedding);

      const combinedScore = (querySim * 0.7) + (hydeSim * 0.3);

      return {
        chunk: {
          id: chunk.id,
          content: chunk.content,
          embedding: chunkEmbedding,
          sourceName: chunk.knowledgeSource.url || chunk.knowledgeSource.fileUrl || 'Texto Manual',
          sourceType: chunk.knowledgeSource.type
        },
        score: combinedScore
      };
    });

    // 4. Sort and take top 20 for potential Re-ranking
    scoredChunks.sort((a, b) => b.score - a.score);
    const topCandidates = scoredChunks.slice(0, 20).map(sc => sc.chunk);

    // 5. Cohere Re-ranking (Final Polish)
    let cohereKey = process.env.COHERE_API_KEY;
    if (!cohereKey) {
      const config = await prisma.globalConfig.findFirst({ where: { key: 'COHERE_API_KEY' } });
      cohereKey = config?.value;
    }

    if (cohereKey && topCandidates.length > 0) {
      try {
        const cohere = new CohereClient({ token: cohereKey });
        const rerank = await cohere.rerank({
          query: query,
          documents: topCandidates.map(c => c.content),
          topN: limit,
          model: 'rerank-multilingual-v3.0'
        });
        return rerank.results.map(res => topCandidates[res.index]);
      } catch (e) {
        console.warn('[RETRIEVAL] Rerank failed, fallback to ensemble top:', e);
      }
    }

    return topCandidates.slice(0, limit);
  } catch (error) {
    console.error('[RETRIEVAL] Critical error:', error);
    return [];
  }
}

/**
 * Legacy stubs and internal ingestion helpers (kept for compatibility)
 */
export async function ingestText(
  agentId: string,
  text: string,
  knowledgeBaseName: string = 'Default'
): Promise<string> {
  const { addKnowledgeSource } = await import('./actions/knowledge');
  const source = await addKnowledgeSource(agentId, {
    type: 'TEXT',
    text: text
  });
  return source.id;
}

export async function ingestWebsite(
  agentId: string,
  url: string,
  crawlSubpages: boolean = false,
  updateInterval: string = 'NEVER'
): Promise<string> {
  const { addKnowledgeSource } = await import('./actions/knowledge');
  const source = await addKnowledgeSource(agentId, {
    type: 'WEBSITE',
    url: url,
    crawlSubpages,
    updateInterval: updateInterval as any
  });
  return source.id;
}

export async function ingestDocument(
  agentId: string,
  fileUrl: string,
  fileName: string
): Promise<string> {
  const { addKnowledgeSource } = await import('./actions/knowledge');
  const source = await addKnowledgeSource(agentId, {
    type: 'DOCUMENT',
    url: fileUrl,
    fileName: fileName
  });
  return source.id;
}
