import { getChannels } from '@/lib/actions/dashboard';
import { Plus, Search, Filter, Smartphone, MessageSquare, Globe, Instagram, Send, MoreVertical, Smartphone as PhoneIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { NewChannelButton } from '@/components/channels/NewChannelButton';

export default async function ChannelsPage() {
    const channels = await getChannels();

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-2">Canales</h1>
                    <p className="text-gray-500 font-medium">Conecta tus agentes con el mundo a través de múltiples plataformas</p>
                </div>
                <NewChannelButton variant="primary" />
            </div>

            {/* List */}
            <div className="space-y-4">
                {channels.length > 0 ? (
                    channels.map((channel) => (
                        <div key={channel.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-[#21AC96]/20 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer">
                            <div className="flex items-center gap-6">
                                {/* Icon Channel */}
                                <div className={cn(
                                    "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm relative",
                                    channel.type === 'WHATSAPP' ? 'bg-green-50 text-green-600' :
                                        channel.type === 'INSTAGRAM' ? 'bg-pink-50 text-pink-600' :
                                            'bg-indigo-50 text-indigo-600'
                                )}>
                                    {channel.type === 'WHATSAPP' && <PhoneIcon className="w-7 h-7" />}
                                    {channel.type === 'INSTAGRAM' && <Instagram className="w-7 h-7" />}
                                    {channel.type === 'WEBCHAT' && <Globe className="w-7 h-7" />}

                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] shadow-sm border border-gray-100">
                                        {channel.isActive ? '✅' : '🕙'}
                                    </div>
                                </div>

                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-gray-900 font-extrabold text-lg tracking-tight">{channel.displayName}</h3>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                                            channel.isActive
                                                ? "bg-green-50 text-green-600 border-green-100"
                                                : "bg-gray-50 text-gray-400 border-gray-100"
                                        )}>
                                            {channel.isActive ? 'Conectado' : 'Desconectado'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-400 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[#21AC96] font-bold text-xs uppercase tracking-tight">Agente:</span>
                                            {channel.agent.name}
                                        </div>
                                        <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-indigo-400 font-bold text-xs uppercase tracking-tight">Tipo:</span>
                                            {channel.type}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <Link
                                    href={channel.type === 'WEBCHAT' ? `/channels/setup/web?agentId=${channel.agentId}` : `/channels/${channel.id}`}
                                    className="px-6 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
                                >
                                    Configurar
                                </Link>
                                <button className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white rounded-[2.5rem] py-20 px-10 border border-gray-100 shadow-sm text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 border border-gray-100 shadow-inner mx-auto">
                            <Smartphone className="w-10 h-10 text-gray-200" />
                        </div>
                        <h3 className="text-gray-900 font-extrabold text-xl tracking-tight mb-2">No has conectado canales aún</h3>
                        <p className="text-gray-400 font-medium max-w-sm mx-auto mb-8">
                            Conecta tus redes sociales o chat web para empezar a recibir mensajes a través de tus agentes.
                        </p>
                        <NewChannelButton variant="empty" />
                    </div>
                )}
            </div>
        </div>
    );
}
