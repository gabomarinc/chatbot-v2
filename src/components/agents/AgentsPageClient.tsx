'use client';

import { useState } from 'react';
import { Plus, MoreVertical, Bot, MessageSquare, Zap, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { CreateAgentModal } from '@/components/agents/CreateAgentModal';

interface Agent {
    id: string;
    name: string;
    _count: {
        channels: number;
        conversations: number;
    };
}

interface AgentsPageClientProps {
    initialAgents: Agent[];
    userRole: 'OWNER' | 'MANAGER' | 'AGENT' | null;
}

export function AgentsPageClient({ initialAgents, userRole }: AgentsPageClientProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Check if user can create agents (OWNER or MANAGER)
    const canCreate = userRole === 'OWNER' || userRole === 'MANAGER';

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in text-gray-900">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-2">Agentes</h1>
                    <p className="text-gray-500 font-medium">Crea, entrena y gestiona tus agentes de IA personalizados</p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all cursor-pointer group active:scale-95"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                        Crear Nuevo Agente
                    </button>
                )}
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {initialAgents.length > 0 ? (
                    initialAgents.map((agent) => (
                        <Link
                            key={agent.id}
                            href={`/agents/${agent.id}/profile`}
                            className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] hover:shadow-xl hover:shadow-[#21AC96]/5 transition-all cursor-pointer group block relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#21AC96]/5 rounded-full -translate-y-16 translate-x-16 group-hover:bg-[#21AC96]/10 transition-colors"></div>

                            {/* Header */}
                            <div className="flex items-start justify-between mb-8 relative">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-gradient-to-br from-[#21AC96] to-[#1a8a78] rounded-2xl flex items-center justify-center text-3xl shadow-lg group-hover:rotate-6 transition-transform text-white font-bold">
                                        {agent.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-gray-900 text-xl font-extrabold tracking-tight mb-1">{agent.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex px-2 py-0.5 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-green-100">
                                                Activo
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-8 bg-gray-50/50 rounded-3xl p-6 border border-gray-50">
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-2 shadow-sm">
                                        <LayoutGrid className="w-4 h-4 text-[#21AC96]" />
                                    </div>
                                    <span className="text-lg text-gray-900 font-extrabold">{agent._count.channels}</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Canales</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-2 shadow-sm">
                                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <span className="text-lg text-gray-900 font-extrabold">{agent._count.conversations}</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Chats</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-2 shadow-sm">
                                        <Zap className="w-4 h-4 text-orange-500" />
                                    </div>
                                    <span className="text-lg text-gray-900 font-extrabold">0</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Puntos</span>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-4">
                                <div className="flex -space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs">💬</div>
                                    <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs">🌐</div>
                                </div>
                                <span className="text-sm text-[#21AC96] font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                    Configurar Agente
                                    <Plus className="w-4 h-4 rotate-45" />
                                </span>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full bg-white rounded-[2.5rem] py-20 px-10 border border-gray-100 shadow-sm text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 border border-gray-100 shadow-inner mx-auto">
                            <Bot className="w-10 h-10 text-gray-200" />
                        </div>
                        <h3 className="text-gray-900 font-extrabold text-xl tracking-tight mb-2">No tienes agentes aún</h3>
                        <p className="text-gray-400 font-medium max-w-sm mx-auto mb-8">
                            Empieza creando tu primer agente para automatizar tus canales de comunicación.
                        </p>
                        {canCreate && (
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all cursor-pointer active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                Crear Agente
                            </button>
                        )}
                    </div>
                )}
            </div>

            <CreateAgentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
