import { getAgents, getChannels } from '@/lib/actions/dashboard';
import { WhatsAppConfig } from '@/components/channels/WhatsAppConfig';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering to always get fresh agents list
export const dynamic = 'force-dynamic';

export default async function WhatsAppSetupPage({
    searchParams
}: {
    searchParams: Promise<{ agentId?: string; channelId?: string }>
}) {
    const params = await searchParams;
    const agents = await getAgents();
    const channels = await getChannels();

    // Fix: Only find existing channel if we are editing a specific one (by ID or Agent)
    // Do NOT default to the first found WhatsApp channel globally.
    let existingWhatsApp = undefined;

    if (params.channelId) {
        existingWhatsApp = channels.find(c => c.id === params.channelId);
    } else if (params.agentId) {
        existingWhatsApp = channels.find(c => c.type === 'WHATSAPP' && c.agentId === params.agentId);
    }
    // If no params, we are creating a fresh one.

    const metaAppIdConfig = await prisma.globalConfig.findUnique({
        where: { key: 'META_APP_ID' }
    });
    const metaAppId = metaAppIdConfig?.value;

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-10">
                <Link
                    href={params.agentId ? `/agents/${params.agentId}/channels` : "/channels"}
                    className="flex items-center gap-2 text-gray-400 font-extrabold text-sm uppercase tracking-widest hover:text-green-600 transition-colors group"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Volver
                </Link>
                <div className="h-8 w-[1px] bg-gray-200"></div>
                <h1 className="text-gray-900 font-black text-2xl tracking-tight">WhatsApp Business</h1>
            </div>

            <WhatsAppConfig
                agents={agents.map(a => ({ id: a.id, name: a.name }))}
                existingChannel={existingWhatsApp}
                metaAppId={metaAppId}
                defaultAgentId={params.agentId}
            />
        </div>
    );
}
