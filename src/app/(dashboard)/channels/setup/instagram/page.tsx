import { InstagramConfig } from '@/components/channels/InstagramConfig';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Instagram } from 'lucide-react';

export default async function InstagramSetupPage({
    searchParams,
}: {
    searchParams: { agentId?: string; channelId?: string };
}) {
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
    if (searchParams.channelId) {
        existingChannel = await prisma.channel.findUnique({
            where: { id: searchParams.channelId }
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
                <div className="flex items-center gap-4 mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center">
                        <Instagram className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                            Configurar Instagram
                        </h1>
                        <p className="text-gray-500 font-medium mt-1">
                            Conecta tu Instagram Business para responder mensajes directos automáticamente
                        </p>
                    </div>
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
                defaultAgentId={searchParams.agentId}
                existingChannel={existingChannel}
                metaAppId={metaAppId}
            />
        </div>
    );
}
