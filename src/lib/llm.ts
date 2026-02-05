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
  // Load agent configuration with custom fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      customFieldDefinitions: true,
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
    } as any,
  }) as any;

  if (!agent) {
    throw new Error('Agent not found');
  }

  // Ensure contact exists for this conversation
  let conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: true }
  });

  if (!conversation) throw new Error("Conversation not found");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!conversation.contactId) {
    console.log(`[LLM] No contact linked for conversation ${conversationId}. Creating new contact...`);
    try {
      // Create a new contact if one doesn't exist
      const newContact = await prisma.contact.create({
        data: {
          workspaceId: agent.workspaceId,
          name: conversation.contactName || 'Visitante',
          email: conversation.contactEmail,
          externalId: conversation.externalId,
          customData: {},
        }
      });
      console.log(`[LLM] Created contact ${newContact.id}`);

      // Link to conversation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedConversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: { contactId: newContact.id },
        include: { contact: true }
      });

      // Update local variable
      conversation = updatedConversation as any;
      console.log(`[LLM] Linked contact to conversation.`);
    } catch (error) {
      console.error(`[LLM] Error creating/linking contact:`, error);
      // Continue execution, don't crash the chat, but maybe notify?
    }
  } else {
    console.log(`[LLM] Contact matches: ${conversation.contactId}`);
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
    take: 20, // Last 20 messages
  });

  // Build messages array for OpenAI
  let openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((msg) => ({
      role: msg.role === 'USER' ? 'user' : 'assistant',
      content: msg.role === 'HUMAN'
        ? `[Intervención humana]: ${msg.content}`
        : msg.content,
    }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
    { role: 'user', content: userMessage },
  ];

  // Define Tools
  const tools: OpenAI.Chat.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'update_contact',
        description: 'Update the contact information with collected data.',
        parameters: {
          type: 'object',
          properties: {
            updates: {
              type: 'object',
              description: 'Key-value pairs of data to update. Keys can be standard fields ("name", "email", "phone") or defined custom fields.',
              additionalProperties: true
            }
          },
          required: ['updates']
        }
      }
    }
  ];

  // Call OpenAI API (Loop for tool calls)
  const openai = getOpenAIClient();
  let finalReply = '';
  let tokensUsed = 0;
  let creditsUsed = 0;

  // Max 3 turns to prevent infinite loops
  for (let i = 0; i < 3; i++) {
    const completion = await openai.chat.completions.create({
      model: agent.model,
      messages: openaiMessages,
      temperature: agent.temperature,
      max_tokens: 1000,
      tools: tools,
      tool_choice: 'auto'
    });

    const choice = completion.choices[0];
    const message = choice.message;
    tokensUsed += completion.usage?.total_tokens || 0;

    // Add assistant message to history
    openaiMessages.push(message);

    if (message.tool_calls && message.tool_calls.length > 0) {
      // Handle Tool Calls
      for (const toolCall of message.tool_calls) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((toolCall as any).function.name === 'update_contact') {
          try {
            const args = JSON.parse((toolCall as any).function.arguments);
            const updates = args.updates;
            console.log(`[LLM] Tool 'update_contact' called with:`, updates);

            // Perform Update using shared action
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((conversation as any).contactId) {
              // Import dynamically to avoid circular deps if any, or just standard import
              const { updateContact } = await import('@/lib/actions/contacts');
              const result = await updateContact(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (conversation as any).contactId,
                updates,
                agent.workspaceId
              );

              if (result.success) {
                openaiMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({ success: true, message: "Contact updated successfully" })
                });
              } else {
                throw new Error(result.error);
              }
            } else {
              throw new Error("No contact ID linked to conversation");
            }
          } catch (error) {
            console.error("Tool execution error", error);
            openaiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ success: false, error: "Failed to update contact" })
            });
          }
        }
      }
      // Loop continues to get the next response from AI
    } else {
      // No tool calls, this is the final reply
      finalReply = message.content || '';
      break;
    }
  }

  // Calculate credits
  creditsUsed = Math.ceil(tokensUsed / 100);

  // Store agent reply
  await prisma.message.create({
    data: {
      conversationId,
      role: 'AGENT',
      content: finalReply,
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
    reply: finalReply,
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

  // Custom Fields Collection
  if (agent.customFieldDefinitions && agent.customFieldDefinitions.length > 0) {
    prompt += 'TU OBJETIVO SECUNDARIO ES RECOLECTAR LA SIGUIENTE INFORMACIÓN DEL USUARIO:\n';
    agent.customFieldDefinitions.forEach((field: any) => {
      let fieldDesc = `- ${field.label} (ID: "${field.key}"): ${field.description || 'Sin descripción'}`;
      if (field.type === 'SELECT' && field.options && field.options.length > 0) {
        fieldDesc += ` [Opciones válidas: ${field.options.join(', ')}]`;
      }
      prompt += fieldDesc + '\n';
    });
    prompt += '\nCuando el usuario te proporcione esta información, USA LA HERRAMIENTA "update_contact" para guardarla.\n';
    prompt += 'Para campos con Opciones válidas, DEBES ajustar la respuesta del usuario a una de las opciones exactas si es posible, o pedir clarificación.\n';
    prompt += 'No seas intrusivo. Pregunta por estos datos de manera natural durante la conversación.\n\n';
  }

  // STANDARD CONTACT INFO COLLECTION (Always Active)
  prompt += `
ADEMÁS, TU OBJETIVO PRINCIPAL ES IDENTIFICAR Y GUARDAR LOS SIGUIENTES DATOS DE CONTACTO SI EL USUARIO LOS MENCIONA:
- Nombre completo (key: "name")
- Correo electrónico (key: "email")
- Número de teléfono (key: "phone")

INSTRUCCIONES CRÍTICAS PARA DATOS DE CONTACTO:
1. SI el usuario menciona su nombre, email o teléfono espontáneamente, USA INMEDIATAMENTE la herramienta "update_contact".
2. ES MUY COMÚN que el usuario responda directamente a tus preguntas.
   - Si preguntaste "¿Cuál es tu nombre?" y el usuario responde con frases como "Soy Omar", "Es Omar", "Si soy omar", EXTRAE SOLO EL NOMBRE ("Omar") y guárdalo. ¡NO guardes "Soy Omar" completo!
   - Si preguntaste "¿Cuál es tu correo?" y el usuario responde "juan@gmail.com", ASUME que es su email y guárdalo.
   - Si preguntaste por el teléfono y responden "5551234", ASUME que es el teléfono y guárdalo.
3. NO esperes al final de la conversación. Guárdalo apenas lo tengas.
4. Si ya tienes el dato (ej. el sistema ya sabe el nombre), NO lo vuelvas a preguntar ni a guardar a menos que el usuario lo corrija.
`;

  return prompt.trim();
}

