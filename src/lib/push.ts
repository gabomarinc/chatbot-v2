import { getAdminMessaging } from './firebase-admin';

export async function sendAssignmentPushNotification(
    fcmToken: string,
    userName: string,
    contactName: string,
    intentSummary: string,
    conversationId: string
) {
    try {
        const messaging = getAdminMessaging();
        if (!messaging) {
            console.warn('Firebase Messaging no inicializado. Se omite notificación push.');
            return { success: false, error: 'Firebase not initialized' };
        }

        const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const firstName = userName ? userName.split(' ')[0] : 'Agente';

        await messaging.send({
            token: fcmToken,
            notification: {
                title: `🚀 Nuevo Lead: ${contactName}`,
                body: `¡Hola ${firstName}! Te han asignado un nuevo lead. Intención: ${intentSummary}`,
            },
            data: {
                conversationId: conversationId,
                url: `${APP_URL}/chat?id=${conversationId}`
            },
            webpush: {
                fcmOptions: {
                    link: `${APP_URL}/chat?id=${conversationId}`
                }
            }
        });
        return { success: true };
    } catch (error) {
        console.error('Error sending FCM notification:', error);
        return { success: false, error };
    }
}
