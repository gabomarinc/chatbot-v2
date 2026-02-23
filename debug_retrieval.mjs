import { PrismaClient } from '@prisma/client';
import { generateEmbedding, cosineSimilarity } from './src/lib/ai.ts';
import { CohereClient } from 'cohere-ai';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function run() {
  const query = "Que propiedades tienen en Panama Pacifico?";
  console.log("Query:", query);

  const agent = await prisma.agent.findFirst({ where: { name: { contains: 'PAU' } } });
  if (!agent) {
    console.log("Agent PAU not found");
    return;
  }
  const agentId = agent.id;
  console.log("Agent ID:", agentId);

  const queryEmbed = await generateEmbedding(query);
  console.log("Query Embed Dim:", queryEmbed.length);

  const chunks = await prisma.documentChunk.findMany({
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

  console.log("Total chunks found in DB:", chunks.length);

  const scoredChunks = chunks.map((chunk) => {
    const chunkEmbedding = chunk.embedding;
    const querySim = cosineSimilarity(queryEmbed, chunkEmbedding);
    return {
      source: chunk.knowledgeSource.fileUrl || chunk.knowledgeSource.url,
      content: chunk.content.slice(0, 100),
      score: querySim
    };
  });

  scoredChunks.sort((a, b) => b.score - a.score);

  console.log("Top 10 Vector Search Results:");
  console.table(scoredChunks.slice(0, 10));

  const topCandidates = scoredChunks.slice(0, 50);
  
  const cohereKey = process.env.COHERE_API_KEY;
  if (cohereKey) {
    const cohere = new CohereClient({ token: cohereKey });
    const rerank = await cohere.rerank({
      query: query,
      documents: topCandidates.map(c => c.content),
      topN: 10,
      model: 'rerank-multilingual-v3.0'
    });

    console.log("Top 10 Re-ranker Results:");
    const finalResults = rerank.results.map(res => ({
      source: topCandidates[res.index].source,
      content: topCandidates[res.index].content,
      relevanceScore: res.relevanceScore
    }));
    console.table(finalResults);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
