import DashboardClient from '@/components/dashboard/DashboardClient';
import { getDashboardStats, getChartData, getDashboardChannels, getTopAgents, getWeeklyConversationsData } from '@/lib/actions/dashboard';
import { getUserWorkspaceRole } from '@/lib/actions/workspace';
import { getAgentPersonalStats, getAgentRecentConversations } from '@/lib/actions/agent-dashboard';

import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const session = await auth();

    // Redirect SUPER_ADMIN users to admin dashboard
    if (session?.user?.role === 'SUPER_ADMIN') {
        redirect('/admin/dashboard');
    }

    const userRole = await getUserWorkspaceRole();

    // If user is AGENT, show agent-specific dashboard
    if (userRole === 'AGENT') {
        const [agentStats, recentConversations] = await Promise.all([
            getAgentPersonalStats(),
            getAgentRecentConversations(10)
        ]);

        // We'll create AgentDashboardClient component
        // For now, import it (we'll create it next)
        const { AgentDashboardClient } = await import('@/components/dashboard/AgentDashboardClient');
        
        return (
            <AgentDashboardClient
                stats={agentStats}
                recentConversations={recentConversations}
            />
        );
    }

    // OWNER and MANAGER see the full dashboard
    const [stats, chartData, channels, topAgents, weeklyConversations] = await Promise.all([
        getDashboardStats(),
        getChartData(),
        getDashboardChannels(),
        getTopAgents(),
        getWeeklyConversationsData(0)
    ]);

    return (
        <DashboardClient
            stats={stats}
            chartData={chartData}
            channels={channels}
            topAgents={topAgents}
            weeklyConversations={weeklyConversations}
        />
    );
}
