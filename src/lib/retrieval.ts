import { prisma } from './prisma';
import { generateEmbedding, cosineSimilarity } from './ai';
import { CohereClient } from 'cohere-ai';

export interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
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

    const prompt = `Responde a la siguiente pregunta de un usuario de forma técnica y detallada, como si fueras un experto escribiendo un manual oficial. No digas "Hola" ni "Aquí tienes", ve directo al grano.\n\nPregunta: ${query}\n\nRespuesta hipotética:`;

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
 * Retrieve relevant chunks for a query using Vector Search + HyDE + Cohere Re-ranking
 */
export async function retrieveRelevantChunks(
  agentId: string,
  query: string,
  limit: number = 5
): Promise<DocumentChunk[]> {
  try {
    console.log(`[RETRIEVAL] Starting advanced retrieval (HyDE + Vector + Rerank) for agent: ${agentId}`);

    // 1. Generate hypothetical answer (HyDE)
    const hypotheticalAnswer = await generateHypotheticalAnswer(query);
    console.log('[RETRIEVAL] HyDE Answer generated. Length:', hypotheticalAnswer.length);

    // 2. Generate embedding for the enriched context
    // We combine the original query + hypothetical answer to capture both the user intent and technical terminology
    const searchContext = `Pregunta: ${query}\nContexto: ${hypotheticalAnswer}`;
    const queryEmbedding = await generateEmbedding(searchContext);

    // 3. Fetch all ready chunks for this agent
    // Optimization: Directly query document chunks with relation filtering
    const chunks = await prisma.documentChunk.findMany({
      where: {
        knowledgeSource: {
          knowledgeBase: {
            agentId
          },
          status: 'READY'
        }
      }
    });

    if (chunks.length === 0) {
      console.log('[RETRIEVAL] No knowledge found for this agent');
      return [];
    }

    console.log(`[RETRIEVAL] Found ${chunks.length} base chunks. Calculating similarity...`);

    // 3. Calculate Vector Similarity (Cosine Similarity)
    const scoredChunks = chunks.map((chunk) => {
      const chunkEmbedding = chunk.embedding as number[];
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
      return {
        chunk: {
          id: chunk.id,
          content: chunk.content,
          embedding: chunkEmbedding
        },
        score: similarity
      };
    });

    // 4. Sort and take top candidates for re-ranking
    // We take more than the limit (e.g., 20) to give Cohere enough context
    scoredChunks.sort((a, b) => b.score - a.score);
    const topCandidates = scoredChunks.slice(0, 20).map(sc => sc.chunk);

    // 5. Advanced Phase: Cohere Re-ranking
    let cohereKey = process.env.COHERE_API_KEY;
    if (!cohereKey) {
      const config = await prisma.globalConfig.findFirst({
        where: { key: 'COHERE_API_KEY' }
      });
      cohereKey = config?.value;
    }

    if (cohereKey && topCandidates.length > 0) {
      try {
        console.log('[RETRIEVAL] Phase 2: Cohere Re-ranking enabled');
        const cohere = new CohereClient({
          token: cohereKey,
        });

        const rerank = await cohere.rerank({
          query: query,
          documents: topCandidates.map(c => c.content),
          topN: limit,
          model: 'rerank-multilingual-v3.0'
        });

        console.log('[RETRIEVAL] Re-ranking complete.');

        // Map rerank results back to our chunk objects
        return rerank.results.map(res => topCandidates[res.index]);
      } catch (cohereError) {
        console.error('[RETRIEVAL] Cohere Rerank error (falling back to vector search):', cohereError);
        // Fallback to top vector search results if Cohere fails
        return topCandidates.slice(0, limit);
      }
    }

    console.log('[RETRIEVAL] Returning top vector similarity results (no re-ranking)');
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
