import OpenAI from 'openai';
import { prisma } from './prisma';
import { retrieveRelevantChunks } from './retrieval';

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
}

export interface AgentReplyResult {
  reply: string;
  tokensUsed: number;
  creditsUsed: number;
}

export async function generateAgentReply(
  agentId: string,
  conversationId: string,
  userMessage: string
): Promise<AgentReplyResult> {
  // Load agent configuration
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      knowledgeBases: {
        include: {
          sources: {
            where: { status: 'READY' as const },
            include: {
              chunks: true,
            },
          },
        },
      },
    },
  });

  if (!agent) {
    throw new Error('Agent not found');
  }

  // Retrieve relevant knowledge chunks if smartRetrieval is enabled
  let contextChunks: string[] = [];
  if (agent.smartRetrieval) {
    const chunks = await retrieveRelevantChunks(agentId, userMessage);
    contextChunks = chunks.map((chunk) => chunk.content);
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt(agent, contextChunks);

  // Get conversation history
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 20, // Last 20 messages for context
  });

  // Build messages array for OpenAI
  const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((msg) => ({
      role: msg.role === 'USER' ? 'user' : 'assistant',
      content: msg.content,
    }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
    { role: 'user', content: userMessage },
  ];

  // Call OpenAI API
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: agent.model,
    messages: openaiMessages,
    temperature: agent.temperature,
    max_tokens: 1000,
  });

  const reply = completion.choices[0]?.message?.content || '';
  const tokensUsed = completion.usage?.total_tokens || 0;
  
  // Calculate credits: 1 credit per 100 tokens (adjust as needed)
  const creditsUsed = Math.ceil(tokensUsed / 100);

  // Store agent reply
  await prisma.message.create({
    data: {
      conversationId,
      role: 'AGENT',
      content: reply,
      metadata: {
        tokensUsed,
        model: agent.model,
      },
    },
  });

  // Update conversation last message time
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // Log usage
  if (agent.workspaceId) {
    await prisma.usageLog.create({
      data: {
        workspaceId: agent.workspaceId,
        agentId,
        conversationId,
        tokensUsed,
        creditsUsed,
        model: agent.model,
      },
    });

    // Deduct credits from balance
    await prisma.creditBalance.updateMany({
      where: { workspaceId: agent.workspaceId },
      data: {
        balance: { decrement: creditsUsed },
        totalUsed: { increment: creditsUsed },
      },
    });
  }

  return {
    reply,
    tokensUsed,
    creditsUsed,
  };
}

function buildSystemPrompt(agent: any, contextChunks: string[]): string {
  let prompt = '';

  // Communication style
  const styleInstructions: Record<string, string> = {
    FORMAL: 'Usa un tono formal y profesional en todas tus respuestas.',
    NORMAL: 'Usa un tono amigable y profesional, balanceado.',
    CASUAL: 'Usa un tono casual y relajado, pero siempre respetuoso.',
  };
  prompt += styleInstructions[agent.communicationStyle] + '\n\n';

  // Personality/Behavior
  prompt += `Tu personalidad y comportamiento:\n${agent.personalityPrompt}\n\n`;

  // Job context
  if (agent.jobType === 'SUPPORT') {
    prompt += `Eres un agente de soporte técnico. `;
    if (agent.jobCompany) {
      prompt += `Trabajas para ${agent.jobCompany}. `;
    }
    prompt += 'Tu objetivo es ayudar a los usuarios a resolver sus problemas de manera eficiente y amigable.\n\n';
  } else if (agent.jobType === 'SALES') {
    prompt += `Eres un agente de ventas. `;
    if (agent.jobCompany) {
      prompt += `Trabajas para ${agent.jobCompany}. `;
    }
    prompt += 'Tu objetivo es ayudar a los clientes a encontrar productos o servicios que se ajusten a sus necesidades y cerrar ventas de manera ética.\n\n';
  } else if (agent.jobType === 'PERSONAL') {
    prompt += 'Eres un asistente personal. Tu objetivo es ayudar al usuario con sus tareas y preguntas.\n\n';
  }

  if (agent.jobDescription) {
    prompt += `Información adicional sobre tu trabajo:\n${agent.jobDescription}\n\n`;
  }

  // Knowledge base context
  if (contextChunks.length > 0) {
    prompt += 'Información relevante de tu base de conocimientos:\n';
    contextChunks.forEach((chunk, index) => {
      prompt += `${index + 1}. ${chunk}\n`;
    });
    prompt += '\n';
  }

  // Restrictions
  if (agent.restrictTopics) {
    prompt += 'IMPORTANTE: Solo responde preguntas relacionadas con tu área de trabajo. Si te preguntan sobre otros temas, cortésmente redirige la conversación.\n\n';
  }

  if (!agent.allowEmojis) {
    prompt += 'No uses emojis en tus respuestas.\n\n';
  }

  if (agent.signMessages) {
    prompt += 'Firma tus mensajes de manera profesional al final.\n\n';
  }

  if (agent.splitLongMessages) {
    prompt += 'Si tu respuesta es muy larga, divídela en múltiples mensajes más cortos y fáciles de leer.\n\n';
  }

  if (agent.transferToHuman) {
    prompt += 'Si un usuario solicita hablar con un humano o si la situación lo requiere, puedes transferir la conversación a un agente humano.\n\n';
  }

  return prompt.trim();
}

