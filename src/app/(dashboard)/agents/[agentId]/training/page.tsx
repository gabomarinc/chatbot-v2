import { getAgentFull } from '@/lib/actions/dashboard';
import { AgentTrainingClient } from '@/components/agents/AgentTrainingClient';
import { redirect } from 'next/navigation';

export default async function AgentTrainingPage({ params }: { params: Promise<{ agentId: string }> }) {
    const { agentId } = await params;
    const agent = await getAgentFull(agentId);

    if (!agent) {
        redirect('/agents');
    }

    // Map database knowledge bases to client format
    const knowledgeBases = agent.knowledgeBases.map(kb => ({
        id: kb.id,
        name: kb.name,
        sources: kb.sources.map(source => ({
            id: source.id,
            type: source.type,
            displayName: source.url || source.fileUrl || 'Documento de Texto',
            sourceUrl: source.url || source.fileUrl,
            status: source.status,
            errorMessage: source.errorMessage,
            createdAt: source.createdAt
        }))
    }));

    return (
        <AgentTrainingClient
            agentId={agent.id}
            knowledgeBases={knowledgeBases}
        />
    );
}
