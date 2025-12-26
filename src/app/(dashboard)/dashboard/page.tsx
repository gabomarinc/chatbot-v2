import DashboardClient from '@/components/dashboard/DashboardClient';
import { getDashboardStats, getChartData, getDashboardChannels, getTopAgents, getWeeklyConversationsData } from '@/lib/actions/dashboard';

import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const session = await auth();

    // Redirect SUPER_ADMIN users to admin dashboard
    if (session?.user?.role === 'SUPER_ADMIN') {
        redirect('/admin/dashboard');
    }

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
