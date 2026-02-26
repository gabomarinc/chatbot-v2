import { prisma } from '@/lib/prisma';
import { WidgetInterface } from '@/components/public/WidgetInterface';
import { notFound } from 'next/navigation';

interface TestAgentPageProps {
    params: Promise<{
        agentId: string;
    }>;
}

export default async function TestAgentPage({ params }: TestAgentPageProps) {
    const { agentId } = await params;

    // Find the agent and its first WEBCHAT channel
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
            channels: {
                where: { type: 'WEBCHAT' },
                take: 1
            }
        }
    });

    if (!agent) {
        return notFound();
    }

    // In a test scenario, if they don't have a webchat channel, 
    // we can either show an error or mock one. 
    // Most agents in this platform should have a default webchat channel or we can use a fallback config.
    const channel = agent.channels[0];

    if (!channel) {
        // Fallback: Show a basic interface even if no channel is configured yet
        const fallbackChannel = {
            id: 'test-channel',
            displayName: agent.name,
            configJson: {
                title: `${agent.name} (Prueba)`,
                welcomeMessage: `¡Hola! Soy ${agent.name}. Estoy listo para que me pruebes.`,
                color: '#21AC96'
            },
            agent: {
                name: agent.name,
                avatarUrl: agent.avatarUrl
            },
            agentId: agent.id
        };
        return <WidgetInterface channel={fallbackChannel as any} isTest={true} />;
    }

    const channelData = {
        id: channel.id,
        displayName: agent.name,
        configJson: channel.configJson,
        agent: {
            name: agent.name,
            avatarUrl: agent.avatarUrl
        },
        agentId: agent.id
    };

    return <WidgetInterface channel={channelData as any} isTest={true} />;
}
