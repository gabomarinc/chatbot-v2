import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { MessageCircle, Globe, Instagram, Send, Sparkles, Users } from 'lucide-react';
import { getAgentFull } from '@/lib/actions/dashboard';
import { ConnectChannelButton } from '@/components/agents/ConnectChannelButton';

export default async function AgentChannelsPage({ params }: { params: Promise<{ agentId: string }> }) {
    const { agentId } = await params;
    const agent = await getAgentFull(agentId);

    if (!agent) {
        notFound();
    }

    const channels = agent.channels || [];

    const getChannelIcon = (type: string) => {
        switch (type) {
            case 'WHATSAPP': return <MessageCircle className="w-6 h-6 text-white" />;
            case 'INSTAGRAM': return <Instagram className="w-6 h-6 text-white" />;
            case 'WEBCHAT': return <Globe className="w-6 h-6 text-white" />;
            default: return <Send className="w-6 h-6 text-white" />;
        }
    };

    const getChannelColor = (type: string) => {
        switch (type) {
            case 'WHATSAPP': return 'bg-[#25D366]'; // WhatsApp Green
            case 'INSTAGRAM': return 'bg-gradient-to-tr from-[#FF0069] to-[#C13584]'; // Instagram Gradient (simplified)
            case 'WEBCHAT': return 'bg-[#21AC96]'; // Brand Color
            default: return 'bg-gray-400';
        }
    };

    const getChannelName = (type: string) => {
        switch (type) {
            case 'WHATSAPP': return 'WhatsApp';
            case 'INSTAGRAM': return 'Instagram';
            case 'WEBCHAT': return 'Webchat';
            default: return type;
        }
    };

    return (
        <div className="max-w-3xl animate-fade-in">
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-gray-900 font-extrabold text-2xl tracking-tight mb-2">Canales conectados</h3>
                        <p className="text-gray-500 font-medium">Gestiona los canales donde este agente está activo</p>
                    </div>
                    <div className="w-full sm:w-auto">
                        <ConnectChannelButton agentId={agentId} />
                    </div>
                </div>

                {channels.length > 0 ? (
                    <div className="grid gap-4">
                        {channels.map((channel) => (
                            <div key={channel.id} className="bg-white rounded-[1.5rem] p-5 md:p-6 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#21AC96]/20 hover:shadow-xl hover:shadow-[#21AC96]/5 transition-all group">
                                <div className="flex items-center gap-4 md:gap-5">
                                    {/* Icon / Avatar Logic */}
                                    {(channel.type === 'INSTAGRAM' && (channel.configJson as any)?.profilePictureUrl) ? (
                                        <div className="relative group-hover:scale-110 transition-transform duration-300">
                                            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#E1306C]/20 shadow-sm relative">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={(channel.configJson as any).profilePictureUrl}
                                                    alt="IG Profile"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[8px] shadow-sm border border-gray-100 z-10">
                                                {channel.isActive ? '✅' : '🕙'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300 ${getChannelColor(channel.type)}`}>
                                            {getChannelIcon(channel.type)}
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="text-lg font-bold text-gray-900">
                                                {(channel.type === 'INSTAGRAM' && (channel.configJson as any)?.username)
                                                    ? `@${(channel.configJson as any).username}`
                                                    : getChannelName(channel.type)
                                                }
                                            </div>
                                            {(channel.type === 'INSTAGRAM' && (channel.configJson as any)?.followersCount !== undefined) && (
                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500">
                                                    <Users className="w-3 h-3" />
                                                    <span>{(channel.configJson as any).followersCount}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${channel.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${channel.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                                {channel.isActive ? 'Conectado' : 'Desconectado'}
                                            </span>
                                            <span className="text-gray-300 px-1">•</span>
                                            <span className="text-xs text-gray-400 font-medium">{channel.displayName}</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="w-full sm:w-auto px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors">
                                    Configurar
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100 text-center">
                        <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-sm mb-6">
                            <Sparkles className="w-10 h-10 text-gray-300" />
                        </div>
                        <h4 className="text-gray-900 font-bold text-lg mb-2">Sin canales conectados</h4>
                        <p className="text-gray-400 max-w-sm mx-auto mb-8 font-medium">
                            Conecta tu agente a canales como WhatsApp o tu sitio web para empezar a recibir mensajes.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
