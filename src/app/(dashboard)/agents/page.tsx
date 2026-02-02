import { getAgents } from '@/lib/actions/dashboard';
import { AgentsPageClient } from '@/components/agents/AgentsPageClient';
import { getUserWorkspaceRole } from '@/lib/actions/workspace';

// Force revalidation to get fresh data
export const revalidate = 0;

export default async function AgentsPage() {
    const agents = await getAgents();
    const userRole = await getUserWorkspaceRole();

    // Map the agents to the format expected by the client component
    // Prisma returns a slightly different structure that needs mapping if we want to be strict with types
    const formattedAgents = agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        jobCompany: agent.jobCompany,
        avatarUrl: agent.avatarUrl,
        _count: {
            channels: agent._count.channels,
            conversations: agent._count.conversations
        }
    }));

    return <AgentsPageClient initialAgents={formattedAgents} userRole={userRole} />;
}
