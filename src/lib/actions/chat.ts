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

        // 1. Fetch conversation details including channel
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                agent: true,
                channel: true
            }
        });

        if (!conversation) {
            return { success: false, error: 'Conversación no encontrada' };
        }

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
            }
        });

        // 5. Dispatch to External Channels
        const channel = conversation.channel;

        if (channel?.type === 'WHATSAPP') {
            // For WhatsApp, we check if the channel is active
            if (!channel.isActive) {
                console.warn('WhatsApp channel is inactive');
            }

            const { phoneNumberId, accessToken } = channel.configJson as any;

            if (!phoneNumberId || !accessToken) {
                return { success: true, message: newMessage, error: 'Credenciales WhatsApp inválidas en configuración del canal' };
            }

            await sendWhatsAppMessage(
                phoneNumberId,
                accessToken,
                conversation.externalId,
                content
            );

        } else if (channel?.type === 'INSTAGRAM') {
            if (!channel.isActive) {
                console.warn('Instagram channel is inactive');
            }

            const { pageAccessToken } = channel.configJson as any;

            if (!pageAccessToken) {
                return { success: true, message: newMessage, error: 'Credenciales Instagram inválidas en configuración del canal' };
            }

            await sendInstagramMessage(
                pageAccessToken,
                conversation.externalId,
                content
            );
        }

        // 6. Revalidate Cache
        revalidatePath('/dashboard');
        revalidatePath(`/dashboard/conversations/${conversationId}`);
        revalidatePath('/chat');

        return { success: true, message: newMessage };

    } catch (error: any) {
        console.error('Error in sendManualMessage:', error);
        return { success: false, error: error.message || 'Error al enviar mensaje' };
    }
}
