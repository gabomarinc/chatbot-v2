import { getAgent } from '@/lib/actions/dashboard';
import { AgentJobForm } from '@/components/agents/AgentJobForm';
import { redirect } from 'next/navigation';

export default async function AgentJobPage({ params }: { params: Promise<{ agentId: string }> }) {
    const { agentId } = await params
    const agent = await getAgent(agentId);

    if (!agent) {
        redirect('/agents');
    }

    return (
        <AgentJobForm
            agent={{
                id: agent.id,
                jobType: agent.jobType,
                jobCompany: agent.jobCompany,
                jobWebsiteUrl: agent.jobWebsiteUrl,
                jobDescription: agent.jobDescription,
            }}
        />
    );
}
