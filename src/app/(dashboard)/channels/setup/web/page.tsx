import { getAgents, getChannels } from '@/lib/actions/dashboard';
import { WebWidgetConfig } from '@/components/channels/WebWidgetConfig';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// Force dynamic rendering to always get fresh agents list
export const dynamic = 'force-dynamic';

export default async function WebWidgetSetupPage({ 
    searchParams 
}: { 
    searchParams: Promise<{ agentId?: string }> 
}) {
    const params = await searchParams;
    // We need agents to let user select one
    const agents = await getAgents();

    // Get all channels and find existing WEBCHAT channel
    // If agentId is provided in searchParams, find channel for that specific agent
    // Otherwise, allow creating a new channel for any agent
    const channels = await getChannels();
    const existingWebChat = params.agentId 
        ? channels.find(c => c.type === 'WEBCHAT' && c.agentId === params.agentId)
        : null; // Don't restrict if no specific agent is selected

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-10">
                <Link
                    href={params.agentId ? `/agents/${params.agentId}/channels` : "/channels"}
                    className="flex items-center gap-2 text-gray-400 font-extrabold text-sm uppercase tracking-widest hover:text-[#21AC96] transition-colors group"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Volver
                </Link>
                <div className="h-8 w-[1px] bg-gray-200"></div>
                <h1 className="text-gray-900 font-black text-2xl tracking-tight">Widget Web</h1>
            </div>

            <WebWidgetConfig
                agents={agents.map(a => ({ id: a.id, name: a.name }))}
                existingChannel={existingWebChat}
                defaultAgentId={params.agentId}
            />
        </div>
    );
}
