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
      integrations: true,
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

  // Altaplaza Integration Check
  const altaplazaIntegration = agent.integrations?.find((i: any) => i.provider === 'ALTAPLAZA' && i.enabled);

  // Build system prompt
  const systemPrompt = buildSystemPrompt(agent, contextChunks, !!altaplazaIntegration);

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
    },
    {
      type: 'function',
      function: {
        name: 'escalate_to_human',
        description: 'Escalate the conversation to a human agent. USE ONLY AFTER COLLECTING USER CONTACT INFO (Name + Email/Phone) if possible.',
        parameters: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: 'Brief summary of the user\'s issue and why they need a human.'
            },
            departmentId: {
              type: 'string',
              description: 'The ID of the department to transfer to, based on user intent. Optional.'
            }
          },
          required: ['summary']
        }
      }
    }
  ];

  // Add Altaplaza tools if enabled
  if (altaplazaIntegration) {
    tools.push(
      {
        type: 'function',
        function: {
          name: 'altaplaza_check_user',
          description: 'Verify if a user exists in Altaplaza system using their ID card (cédula).',
          parameters: {
            type: 'object',
            properties: {
              idCard: { type: 'string', description: 'The user\'s ID card number (cédula).' }
            },
            required: ['idCard']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'altaplaza_register_user',
          description: 'Register a new user in Altaplaza. Call this if check_user returns that the user does not exist.',
          parameters: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string' },
              idCard: { type: 'string' },
              birthDate: { type: 'string', description: 'Format: YYYY-MM-DD' },
              phone: { type: 'string' },
              neighborhood: { type: 'string' }
            },
            required: ['firstName', 'lastName', 'email', 'idCard', 'birthDate']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'altaplaza_register_invoice',
          description: 'Register a processed invoice in Altaplaza system.',
          parameters: {
            type: 'object',
            properties: {
              idCard: { type: 'string' },
              invoiceNumber: { type: 'string' },
              amount: { type: 'number' },
              storeName: { type: 'string' },
              imageUrl: { type: 'string' },
              date: { type: 'string', description: 'Optional. Format: YYYY-MM-DD' }
            },
            required: ['idCard', 'invoiceNumber', 'amount', 'storeName']
          }
        }
      }
    );
  }

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

        // Handle escalate_to_human
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((toolCall as any).function.name === 'escalate_to_human') {
          try {
            const args = JSON.parse((toolCall as any).function.arguments);
            const summary = args.summary;
            console.log(`[LLM] Tool 'escalate_to_human' called. Summary:`, summary);

            if ((conversation as any).contactId) {
              // 1. Update status to PENDING
              await prisma.conversation.update({
                where: { id: conversationId },
                data: { status: 'PENDING' }
              });

              // 2. Send Email Notification
              // Get workspace owner email
              // We need agent -> workspace -> owner
              const agentWithWorkspace = await prisma.agent.findUnique({
                where: { id: agentId },
                include: {
                  workspace: {
                    include: { owner: true }
                  }
                }
              });

              if (agentWithWorkspace) {
                const { sendHandoffEmail } = await import('@/lib/email');
                const appUrl = process.env.NEXTAUTH_URL || 'https://app.konsul.com';
                const link = `${appUrl}/inbox?conversationId=${conversationId}`;

                // Determine recipient
                let recipientEmail = agentWithWorkspace.workspace.owner.email;
                let departmentName = 'General';

                // Check for smart routing
                if (args.departmentId && agent.handoffTargets && Array.isArray(agent.handoffTargets)) {
                  const target = agent.handoffTargets.find((t: any) => t.id === args.departmentId);
                  if (target && target.email) {
                    recipientEmail = target.email;
                    departmentName = target.name;
                    console.log(`[LLM] Smart Handoff: Routing to ${departmentName} (${recipientEmail})`);
                  }
                }
                // Fallback to general handoffEmail if set (legacy/simple support)
                else if ((agent as any).handoffEmail) {
                  recipientEmail = (agent as any).handoffEmail;
                }

                if (recipientEmail) {
                  await sendHandoffEmail(
                    recipientEmail,
                    agent.name,
                    agentWithWorkspace.workspace.name,
                    link,
                    {
                      name: (conversation as any).contact?.name || (conversation as any).contactName || 'Visitante',
                      email: (conversation as any).contact?.email || (conversation as any).contactEmail || undefined,
                      phone: (conversation as any).contact?.phone || undefined
                    },
                    `[${departmentName}] ${summary}`
                  );
                  console.log(`[LLM] Handoff email sent to ${recipientEmail}`);
                }
              }

              openaiMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ success: true, message: "Transfer initiated. Bot paused." })
              });

            } else {
              openaiMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ success: false, error: "System error: No contact linked." })
              });
            }

          } catch (error) {
            console.error("Tool execution error", error);
            openaiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ success: false, error: "Failed to escalate" })
            });
          }
        }

        // --- ALTAPLAZA HANDLERS ---
        if ((toolCall as any).function.name === 'altaplaza_check_user') {
          try {
            const { idCard } = JSON.parse((toolCall as any).function.arguments);
            const { checkUser } = await import('@/lib/altaplaza');
            const result = await checkUser(idCard);

            // Log Event
            const { logIntegrationEvent } = await import('@/lib/integrations-logger');
            await logIntegrationEvent(agentId, 'ALTAPLAZA', 'CHECK_USER', 'SUCCESS', { idCard });

            openaiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          } catch (error: any) {
            const { logIntegrationEvent } = await import('@/lib/integrations-logger');
            await logIntegrationEvent(agentId, 'ALTAPLAZA', 'CHECK_USER', 'ERROR', { error: error.message });
            openaiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ success: false, error: error.message })
            });
          }
        }

        if ((toolCall as any).function.name === 'altaplaza_register_user') {
          try {
            const userData = JSON.parse((toolCall as any).function.arguments);
            const { registerUser } = await import('@/lib/altaplaza');
            const result = await registerUser(userData);

            // Log Event
            const { logIntegrationEvent } = await import('@/lib/integrations-logger');
            await logIntegrationEvent(agentId, 'ALTAPLAZA', 'REGISTER_USER', 'SUCCESS', { email: userData.email });

            openaiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          } catch (error: any) {
            const { logIntegrationEvent } = await import('@/lib/integrations-logger');
            await logIntegrationEvent(agentId, 'ALTAPLAZA', 'REGISTER_USER', 'ERROR', { error: error.message });
            openaiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ success: false, error: error.message })
            });
          }
        }

        if ((toolCall as any).function.name === 'altaplaza_register_invoice') {
          try {
            const invoiceData = JSON.parse((toolCall as any).function.arguments);
            const { registerInvoice } = await import('@/lib/altaplaza');
            const result = await registerInvoice(invoiceData);

            // Log Event
            const { logIntegrationEvent } = await import('@/lib/integrations-logger');
            await logIntegrationEvent(agentId, 'ALTAPLAZA', 'REGISTER_INVOICE', 'SUCCESS', { amount: invoiceData.amount, invoiceNumber: invoiceData.invoiceNumber });

            openaiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          } catch (error: any) {
            const { logIntegrationEvent } = await import('@/lib/integrations-logger');
            await logIntegrationEvent(agentId, 'ALTAPLAZA', 'REGISTER_INVOICE', 'ERROR', { error: error.message });
            openaiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ success: false, error: error.message })
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

function buildSystemPrompt(agent: any, contextChunks: string[], hasAltaplaza: boolean = false): string {
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
    prompt += `### CONTEXTO DE CONOCIMIENTO (ESTRICTO - NO ALUCINAR)\n`;
    prompt += `A continuación se presentan fragmentos extraídos de tus documentos oficiales. Es CRÍTICO que sigas estas reglas:\n`;
    prompt += `1. **Solo Información Verificada**: Responde ÚNICAMENTE basándote en la información que aparece en los fragmentos de abajo. Si el usuario pregunta por algo que NO está en estos textos (como un proyecto inmobiliario, precio o característica no mencionada), DEBES responder: "Lo siento, no tengo información sobre eso actualmente" o algo similar. JAMÁS inventes datos.\n`;
    prompt += `2. **Prohibido Inventar**: No inventes nombres de proyectos, ubicaciones, precios, números de contacto o correos electrónicos. Si no está escrito abajo, no existe para ti.\n`;
    prompt += `3. **Prioridad Absoluta**: El conocimiento de abajo prevalece sobre cualquier cosa que creas saber por tu entrenamiento general de IA.\n\n`;
    prompt += `--------- FRAGMENTOS DE CONOCIMIENTO ---------\n`;
    contextChunks.forEach((chunk, index) => {
      prompt += `[BLOQUE ${index + 1}]: ${chunk}\n`;
    });
    prompt += `----------------------------------------------\n\n`;
    prompt += `REGLAS DE ORO DE CONTESTACIÓN:\n`;
    prompt += `1. **Cero Alucinación**: Si un dato no está en los bloques, di que no lo sabes. Sé honesto.\n`;
    prompt += `2. **Integración Fluida**: Usa la información de forma natural. No menciones "según el bloque X", simplemente habla como un experto que lo sabe.\n`;
    prompt += `3. **Fidelidad**: Si te piden comparar proyectos y solo tienes información de 3, aclara que solo conoces esos 3 y habla de ellos. No intentes completar la lista.\n\n`;
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

  // Altaplaza Specific Instructions
  if (hasAltaplaza) {
    prompt += `
INSTRUCCIONES PARA INTEGRACIÓN ALTAPLAZA:
Eres capaz de gestionar el flujo de Altaplaza. Sigue este protocolo:
1. SI el usuario quiere registrar una factura o consultar puntos, PRIMERO pide su cédula y usa 'altaplaza_check_user'.
2. SI 'altaplaza_check_user' dice que el usuario NO existe, pide sus datos (Nombre, Apellido, Email, Fecha Nacimiento) y usa 'altaplaza_register_user'. Informa al usuario su "temporaryPassword" si se genera una.
3. SI el usuario ya existe o acaba de ser registrado, puedes proceder a registrar facturas usando 'altaplaza_register_invoice'.
4. La fecha de nacimiento debe ser en formato AAAA-MM-DD.
5. Sé amable y guía al usuario en cada paso.
\n`;
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

  // HUMAN HANDOFF PROTOCOL (CRITICAL)
  if (agent.transferToHuman) {
    prompt += `
HUMAN HANDOFF PROTOCOL (CRITICAL):
1. BEFORE calling 'escalate_to_human', you MUST verify you have the user's Name AND (Email OR Phone).
2. If these details are missing, POLITELY ASK FOR THEM: "Para transferirte con un especialista, necesito tu nombre y un medio de contacto (email o teléfono). ¿Me los podrías facilitar?"
3. Once you have the data (or if the user explicitly refuses but insists on transfer), THEN call 'escalate_to_human'.
4. Provide a clear summary of the user's request in the tool call.
`;

    // Smart Routing Injection
    if (agent.handoffTargets && Array.isArray(agent.handoffTargets) && agent.handoffTargets.length > 0) {
      prompt += `
AVAILABLE HANDOFF DEPARTMENTS:
Select the 'departmentId' parameter for 'escalate_to_human' based on the user's need:
`;
      agent.handoffTargets.forEach((target: any) => {
        prompt += `- ID: "${target.id}" | Name: "${target.name}" | Context: ${target.description}\n`;
      });
      prompt += `If no specific department matches, omit the 'departmentId' parameter.\n`;
    }
  }

  return prompt.trim();
}

