import { getAgent, getTeamMembers } from '@/lib/actions/dashboard';
import { AgentSettingsForm } from '@/components/agents/AgentSettingsForm';
import { redirect } from 'next/navigation';

export default async function AgentSettingsPage({ params }: { params: Promise<{ agentId: string }> }) {
    const { agentId } = await params
    const [agent, teamMembers] = await Promise.all([
        getAgent(agentId),
        getTeamMembers()
    ]);

    if (!agent) {
        redirect('/agents');
    }

    return (
        <AgentSettingsForm
            teamMembers={teamMembers}
            agent={{
                id: agent.id,
                model: agent.model,
                temperature: agent.temperature,
                timezone: agent.timezone,
                allowEmojis: agent.allowEmojis,
                signMessages: agent.signMessages,
                restrictTopics: agent.restrictTopics,
                splitLongMessages: agent.splitLongMessages,
                allowReminders: agent.allowReminders,
                smartRetrieval: agent.smartRetrieval,
                transferToHuman: agent.transferToHuman,
                responseDelay: agent.responseDelay,
                enableNPS: (agent as any).enableNPS,
                handoffTargets: (agent as any).handoffTargets,
            }}
        />
    );
}
