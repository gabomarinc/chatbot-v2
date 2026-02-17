import { prisma } from './prisma';
import { IntegrationProvider } from '@prisma/client';

export async function logIntegrationEvent(agentId: string, provider: IntegrationProvider, event: string, status: 'SUCCESS' | 'ERROR' = 'SUCCESS', metadata?: any) {
    try {
        await prisma.integrationEvent.create({
            data: {
                agentId,
                provider,
                event,
                status,
                metadata: metadata || {}
            }
        });
    } catch (error) {
        console.error(`[LOG_INTEGRATION_EVENT_ERROR] ${provider}:`, error);
    }
}
