const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { OpenAI } = require('openai');
const { CohereClient } = require('cohere-ai');
require('dotenv').config();

async function run() {
  const query = "Que propiedades tienen en Panama Pacifico?";
  const agentName = "PAU";
  
  const agent = await prisma.agent.findFirst({ where: { name: { contains: agentName } } });
  if (!agent) {
    console.log("Agent not found");
    return;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const resp = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query.replace(/\n/g, ' '),
  });
  const queryEmbed = resp.data[0].embedding;

  const chunks = await prisma.documentChunk.findMany({
    where: {
      knowledgeSource: {
        knowledgeBase: { agentId: agent.id },
        status: 'READY'
      }
    },
    include: {
      knowledgeSource: true
    }
  });

  console.log("Total chunks:", chunks.length);

  const scored = chunks.map(c => {
    const vecA = queryEmbed;
    const vecB = c.embedding;
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    const sim = dotProduct / (magA * magB);
    return {
      source: c.knowledgeSource.fileUrl || c.knowledgeSource.url,
      content: c.content,
      score: sim
    };
  });

  scored.sort((a, b) => b.score - a.score);
  console.log("Top 10 Vector Search:");
  console.table(scored.slice(0, 10).map(s => ({ ...s, content: s.content.slice(0, 50) })));

  const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
  const rerank = await cohere.rerank({
    query: query,
    documents: scored.slice(0, 50).map(s => s.content),
    topN: 10,
    model: 'rerank-multilingual-v3.0'
  });

  console.log("Top 10 Re-ranker:");
  const final = rerank.results.map(res => ({
    source: scored[res.index].source,
    content: scored[res.index].content.slice(0, 50),
    relevanceScore: res.relevanceScore
  }));
  console.table(final);
}

run().catch(console.error).finally(() => prisma.$disconnect());
