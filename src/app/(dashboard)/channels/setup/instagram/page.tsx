import { InstagramConfig } from '@/components/channels/InstagramConfig';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Instagram } from 'lucide-react';

export default async function InstagramSetupPage({
    searchParams,
}: {
    searchParams: Promise<{ agentId?: string; channelId?: string }>;
}) {
    const { agentId, channelId } = await searchParams;
    const session = await auth();
    if (!session?.user) redirect('/login');

    // Get agents for the workspace
    const agents = await prisma.agent.findMany({
        where: {
            workspace: {
                OR: [
                    { ownerId: session.user.id },
                    { members: { some: { userId: session.user.id } } }
                ]
            }
        },
        select: {
            id: true,
            name: true
        }
    });

    if (agents.length === 0) {
        redirect('/agents/new');
    }

    // Check if there's an existing Instagram channel
    let existingChannel = null;

    // IF editing a specific channel (passed via URL), load it
    if (channelId) {
        existingChannel = await prisma.channel.findUnique({
            where: { id: channelId }
        });
    }
    // IF no channelId is passed, we assume NEW CHANNEL creation (so we don't load any existing one)
    // This allows connecting a second specific account without pre-filling the form

    const metaAppIdConfig = await prisma.globalConfig.findUnique({
        where: { key: 'META_APP_ID' }
    });
    const metaAppId = metaAppIdConfig?.value;

    return (
        <div className="container max-w-7xl mx-auto py-10 px-6">
            <div className="mb-10">
                {/* Header */}
                <div className="flex items-center gap-4 mb-10">
                    <a
                        href={agentId ? `/agents/${agentId}/channels` : "/channels"}
                        className="flex items-center gap-2 text-gray-400 font-extrabold text-sm uppercase tracking-widest hover:text-pink-600 transition-colors group"
                    >
                        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        Volver
                    </a>
                    <div className="h-8 w-[1px] bg-gray-200"></div>
                    <h1 className="text-gray-900 font-black text-2xl tracking-tight">Configurar Instagram</h1>
                </div>

                {existingChannel && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Instagram className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-sm">
                            <p className="font-bold text-blue-900">Canal existente encontrado</p>
                            <p className="text-blue-700">Actualiza la configuración o verifica que todo esté funcionando correctamente</p>
                        </div>
                    </div>
                )}
            </div>

            <InstagramConfig
                agents={agents}
                defaultAgentId={agentId}
                existingChannel={existingChannel}
                metaAppId={metaAppId}
            />
        </div>
    );
}
