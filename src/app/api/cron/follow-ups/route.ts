import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { sendInstagramMessage } from '@/lib/instagram';

export async function GET(request: Request) {
    // 1. Authentication Check (Vercel automatically passes CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Enforce cron secret check only in production to allow local testing
        if (process.env.NODE_ENV === 'production') {
            console.error('[CRON] Unauthorized request');
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    try {
        console.log('[CRON] Starting proactive follow-up processor...');

        // 2. Fetch all Due Follow-Ups
        const pendingFollowUps = await (prisma as any).scheduledFollowUp.findMany({
            where: {
                status: 'PENDING',
                scheduledFor: { lte: new Date() }
            },
            take: 20, // Process in batches to avoid Vercel Function timeout
            include: {
                agent: true,
                channel: true,
                conversation: {
                    include: { contact: true }
                }
            }
        });

        if (pendingFollowUps.length === 0) {
            console.log('[CRON] No pending follow-ups found.');
            return NextResponse.json({ success: true, processed: 0 });
        }

        console.log(`[CRON] Processing ${pendingFollowUps.length} follow-ups...`);

        let processedCount = 0;

        // 3. Process Each Follow-Up
        for (const followup of pendingFollowUps) {
            try {
                const { agent, channel, conversation, reason } = followup;

                if (!channel || !channel.isActive) {
                    throw new Error('Channel inactive or deleted');
                }

                // A. Retrieve Conversation History for Context
                const messages = await prisma.message.findMany({
                    where: { conversationId: conversation.id },
                    orderBy: { createdAt: 'desc' },
                    take: 6 // Get last few messages backwards
                });

                const historyText = messages.reverse().map(m =>
                    `${m.role === 'USER' ? 'Cliente' : 'Tú'}: ${m.content}`
                ).join("\n");

                // B. Generate the Proactive Message using AI
                const prompt = `Escribe OBLIGATORIAMENTE UN SOLO mensaje proactivo para retomar la conversación con este cliente.
Contexto o Motivo del seguimiento que tú mismo programaste: "${reason}"
Últimos mensajes de la conversación:
${historyText || '(No hay historial)'}

REGLAS:
- Sé amigable, natural y no parezcas un robot automático.
- NO uses saludos repetitivos si acaban de hablar hace poco.
- Mantén el estilo de comunicación: ${agent.communicationStyle}.
- Firma el mensaje al final como: "- ${agent.name}" si la firma está habilitada.`;

                let generatedText = '';

                // We use base configs or global keys
                if (agent.model.includes('gemini')) {
                    const { GoogleGenerativeAI } = await import('@google/generative-ai');
                    let googleKey = process.env.GOOGLE_API_KEY;
                    if (!googleKey) {
                        const gc = await prisma.globalConfig.findFirst({ where: { key: 'GOOGLE_API_KEY' } });
                        googleKey = gc?.value;
                    }
                    if (!googleKey) throw new Error('No Google API Key found');

                    const genAI = new GoogleGenerativeAI(googleKey);
                    const aiModel = genAI.getGenerativeModel({ model: agent.model });

                    const result = await aiModel.generateContent({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        systemInstruction: `Eres ${agent.name}. ${agent.personalityPrompt || ''}`,
                    });

                    generatedText = result.response.text();
                } else {
                    const { OpenAI } = await import('openai');
                    let openaiKey = process.env.OPENAI_API_KEY;
                    if (!openaiKey) {
                        const gc = await prisma.globalConfig.findFirst({ where: { key: 'OPENAI_API_KEY' } });
                        openaiKey = gc?.value;
                    }
                    if (!openaiKey) throw new Error('No OpenAI API Key found');

                    const openai = new OpenAI({ apiKey: openaiKey });
                    const completion = await openai.chat.completions.create({
                        model: agent.model.includes('gpt') ? agent.model : 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: `Eres ${agent.name}. ${agent.personalityPrompt || ''}` },
                            { role: 'user', content: prompt }
                        ]
                    });

                    generatedText = completion.choices[0].message.content || '';
                }

                if (!generatedText) throw new Error('LLM returned empty reply');

                // C. Send to Channel
                if (channel.type === 'WHATSAPP') {
                    // Important Meta Rule: Note if 24h passed, regular messages will fail.
                    // A proper implementation might switch to template messaging automatically in the future.
                    const { phoneNumberId, accessToken } = channel.configJson as any;
                    await sendWhatsAppMessage(phoneNumberId, accessToken, conversation.externalId, generatedText);
                } else if (channel.type === 'INSTAGRAM') {
                    const { pageAccessToken } = channel.configJson as any;
                    await sendInstagramMessage(pageAccessToken, conversation.externalId, generatedText);
                } else {
                    console.log(`[CRON] Skipping send for unsupported proactive channel type: ${channel.type}`);
                    // e.g., WebChat
                }

                // D. Save inside Internal Message Log (As Agent)
                await prisma.message.create({
                    data: {
                        conversationId: conversation.id,
                        role: 'AGENT',
                        content: generatedText,
                        metadata: { isProactiveFollowUp: true }
                    }
                });

                const currentCount = (conversation as any).followUpCount || 0;
                const newCount = currentCount + 1;
                const isMaxReached = newCount >= 2;

                // Update Conversation Time & Count
                await (prisma as any).conversation.update({
                    where: { id: conversation.id },
                    data: {
                        lastMessageAt: new Date(),
                        status: isMaxReached ? 'CLOSED' : 'OPEN',
                        followUpCount: newCount
                    }
                });

                // E. Mark Follow-up as Completed
                await (prisma as any).scheduledFollowUp.update({
                    where: { id: followup.id },
                    data: { status: 'COMPLETED', resultMessage: generatedText }
                });

                // Automatically schedule the next one if max is not reached
                if (!isMaxReached) {
                    const horas = (agent as any).followUpTimer || 23.99;
                    const nextDate = new Date();
                    nextDate.setHours(nextDate.getHours() + horas);

                    await (prisma as any).scheduledFollowUp.create({
                        data: {
                            agentId: agent.id,
                            conversationId: conversation.id,
                            channelId: channel.id,
                            scheduledFor: nextDate,
                            reason: `Segundo intento automatizado para contactar al cliente. Motivo original: ${reason}`,
                            status: 'PENDING'
                        }
                    });
                }

                processedCount++;
                console.log(`[CRON] Successfully processed follow-up ${followup.id} to ${conversation.externalId}`);
            } catch (error: any) {
                console.error(`[CRON] Error processing follow-up ${followup.id}:`, error);
                await (prisma as any).scheduledFollowUp.update({
                    where: { id: followup.id },
                    data: { status: 'FAILED', resultMessage: error.message }
                });
            }
        }

        return NextResponse.json({ success: true, processed: processedCount });

    } catch (e: any) {
        console.error('[CRON] Critical Error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
