import { getAttentions } from '@/lib/actions/dashboard';
import { Clock, Search, Filter, MessageSquare, Send, Globe, Smartphone, User, Bot, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default async function AttentionsPage() {
    const attentions = await getAttentions();

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-2">Atenciones</h1>
                    <p className="text-gray-500 font-medium">Historial completo de conversaciones gestionadas por tus agentes</p>
                </div>

                <div className="flex gap-3">
                    <div className="relative group">
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#21AC96] transition-all" />
                        <input
                            type="text"
                            placeholder="Buscar por ID, agente o cliente..."
                            className="pl-12 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96] transition-all w-64 shadow-sm"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-sm text-gray-700 hover:shadow-md hover:border-gray-200 transition-all font-bold cursor-pointer group shadow-sm">
                        <Filter className="w-4 h-4 text-gray-400 group-hover:text-[#21AC96]" />
                        Filtrar
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all cursor-pointer">
                        Últimos 7 días
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {attentions.length > 0 ? (
                    attentions.map((conv) => {
                        const statusColors = {
                            OPEN: 'bg-green-100 text-green-700 border-green-200',
                            PENDING: 'bg-orange-100 text-orange-700 border-orange-200',
                            CLOSED: 'bg-gray-100 text-gray-600 border-gray-200'
                        };

                        return (
                            <div key={conv.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-[#21AC96]/20 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer">
                                <div className="flex items-center gap-6">
                                    {/* Icon Channel */}
                                    <div className="w-14 h-14 rounded-[1.25rem] bg-gray-50 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform group-hover:bg-[#21AC96]/10 group-hover:text-[#21AC96] relative">
                                        <Smartphone className="w-6 h-6" />
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] shadow-sm border border-gray-100 overflow-hidden">
                                            {conv.channel?.type === 'WHATSAPP' ? '📞' : '🌐'}
                                        </div>
                                    </div>

                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-gray-900 font-extrabold text-lg tracking-tight">{conv.contactName || conv.externalId}</span>
                                            <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold border", statusColors[conv.status])}>
                                                {conv.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-400 font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <Bot className="w-4 h-4 text-[#21AC96]" />
                                                {conv.agent.name}
                                            </div>
                                            <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                                            <div className="flex items-center gap-1.5">
                                                <MessageSquare className="w-4 h-4 text-indigo-400" />
                                                {conv._count.messages} mensajes
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 pr-4">
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
                                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                                            {format(conv.lastMessageAt || conv.createdAt, "HH:mm 'hs'")}
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium mt-0.5">
                                            {format(conv.lastMessageAt || conv.createdAt, "d MMM, yyyy", { locale: es })}
                                        </span>
                                    </div>
                                    <button className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[#21AC96]/5 text-[#21AC96] hover:bg-[#21AC96] hover:text-white transition-all transform active:scale-90">
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="bg-white rounded-[2.5rem] py-20 px-10 border border-gray-100 shadow-sm text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 border border-gray-100 shadow-inner mx-auto">
                            <Clock className="w-10 h-10 text-gray-200" />
                        </div>
                        <h3 className="text-gray-900 font-extrabold text-xl tracking-tight mb-2">Sin atenciones registradas</h3>
                        <p className="text-gray-400 font-medium max-w-sm mx-auto">
                            Las conversaciones gestionadas por tus agentes se listarán aquí en tiempo real.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
