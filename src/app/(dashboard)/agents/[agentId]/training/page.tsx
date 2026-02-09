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
    let knowledgeBases: any[] = [];
    try {
        knowledgeBases = agent.knowledgeBases.map(kb => ({
            id: kb.id,
            name: kb.name,
            sources: (kb.sources as any[]).map(source => ({
                id: source.id,
                type: source.type,
                displayName: source.url || source.fileUrl || 'Documento de Texto',
                sourceUrl: source.url || source.fileUrl,
                status: source.status,
                errorMessage: source.errorMessage || null, // Ensure explicit null
                createdAt: source.createdAt
            }))
        }));
    } catch (error) {
        console.error("Error mapping knowledge bases:", error);
        knowledgeBases = []; // Fallback to avoid crash
    }

    return (
        <AgentTrainingClient
            agentId={agent.id}
            knowledgeBases={knowledgeBases}
        />
    );
}
