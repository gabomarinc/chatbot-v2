'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/actions/auth';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { sendInstagramMessage } from '@/lib/instagram';
import { revalidatePath } from 'next/cache';

export interface SendMessageResult {
    success: boolean;
    message?: any;
    error?: string;
}

export async function sendManualMessage(
    conversationId: string,
    content: string
): Promise<SendMessageResult> {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return { success: false, error: 'No autorizado' };
        }

        // 1. Fetch conversation details including agent integrations
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                agent: {
                    include: {
                        integrations: true
                    }
                },
                channel: true
            }
        });

        if (!conversation) {
            return { success: false, error: 'Conversación no encontrada' };
        }

        // 2. Validate Assignment (Optional: only assigned user or manager can send?)
        // For now, we allow any authorized user with team access to help.

        // 3. Create Message in Database FIRST (Source of Truth)
        const newMessage = await prisma.message.create({
            data: {
                conversationId,
                role: 'HUMAN',
                content,
                metadata: {
                    senderId: user.id,
                    senderName: user.name || user.email
                }
            }
        });

        // 4. Update Conversation Timestamp
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                lastMessageAt: new Date(),
                // If status was CLOSED, maybe reopen? Leaving as is for now.
            }
        });

        // 5. Dispatch to External Channels
        const channelType = conversation.channel?.type;

        if (channelType === 'WHATSAPP') {
            const whatsappIntegration = conversation.agent.integrations.find(
                i => i.provider === 'WHATSAPP' && i.isActive
            );

            if (!whatsappIntegration) {
                // Return success (saved to DB) but warning? 
                // Or error? Let's return error so UI knows it wasn't delivered.
                // But message IS in DB.
                console.error('No active WhatsApp integration found for this agent');
                return { success: true, message: newMessage, error: 'Mensaje guardado pero no enviado: Integración WhatsApp no activa' };
            }

            const { phoneNumberId, accessToken } = whatsappIntegration.configJson as any;

            if (!phoneNumberId || !accessToken) {
                return { success: true, message: newMessage, error: 'Credenciales WhatsApp inválidas' };
            }

            // External ID is usually the phone number for WhatsApp
            await sendWhatsAppMessage(
                phoneNumberId,
                accessToken,
                conversation.externalId,
                content
            );

        } else if (channelType === 'INSTAGRAM') {
            const instaIntegration = conversation.agent.integrations.find(
                i => i.provider === 'INSTAGRAM' && i.isActive
            );

            if (!instaIntegration) {
                return { success: true, message: newMessage, error: 'Mensaje guardado pero no enviado: Integración Instagram no activa' };
            }

            const { pageAccessToken } = instaIntegration.configJson as any;

            if (!pageAccessToken) {
                return { success: true, message: newMessage, error: 'Credenciales Instagram inválidas' };
            }

            await sendInstagramMessage(
                pageAccessToken,
                conversation.externalId, // Scoped User ID (PSID)
                content
            );
        }

        // 6. Revalidate Cache
        revalidatePath('/dashboard');
        revalidatePath(`/dashboard/conversations/${conversationId}`); // If explicit page exists
        revalidatePath('/chat'); // If chat path exists

        return { success: true, message: newMessage };

    } catch (error: any) {
        console.error('Error in sendManualMessage:', error);
        return { success: false, error: error.message || 'Error al enviar mensaje' };
    }
}
