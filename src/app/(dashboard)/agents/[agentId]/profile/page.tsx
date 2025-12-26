import { getAgent } from '@/lib/actions/dashboard';
import { AgentProfileForm } from '@/components/agents/AgentProfileForm';
import { redirect } from 'next/navigation';

export default async function AgentProfilePage({ params }: { params: Promise<{ agentId: string }> }) {
    const { agentId } = await params
    const agent = await getAgent(agentId);

    if (!agent) {
        redirect('/agents');
    }

    return (
        <AgentProfileForm
            agent={{
                id: agent.id,
                name: agent.name,
                communicationStyle: agent.communicationStyle,
                personalityPrompt: agent.personalityPrompt,
            }}
        />
    );
}
