import { ChevronLeft, Play, Settings, Bot, LayoutGrid, MessageSquare, Zap } from 'lucide-react';
import Link from 'next/link';
import { getAgent } from '@/lib/actions/dashboard';
import { redirect } from 'next/navigation';
import { AgentLayoutClient } from '@/components/agents/AgentLayoutClient';
import { getUserWorkspaceRole } from '@/lib/actions/workspace';

export default async function AgentLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ agentId: string }>;
}) {
    const { agentId } = await params;
    const [agent, userRole] = await Promise.all([
        getAgent(agentId),
        getUserWorkspaceRole()
    ]);

    if (!agent) {
        redirect('/agents');
    }

    const tabs = [
        { id: 'profile', label: 'Perfil', icon: '👤', href: `/agents/${agentId}/profile` },
        { id: 'job', label: 'Trabajo', icon: '💼', href: `/agents/${agentId}/job` },
        { id: 'training', label: 'Entrenamientos', icon: '📚', href: `/agents/${agentId}/training` },
        { id: 'intents', label: 'Intenciones', icon: '🎯', href: `/agents/${agentId}/intents` },
        { id: 'integrations', label: 'Integraciones', icon: '🔌', href: `/agents/${agentId}/integrations` },
        { id: 'channels', label: 'Canales', icon: '📡', href: `/agents/${agentId}/channels` },
        { id: 'settings', label: 'Configuraciones', icon: '⚙️', href: `/agents/${agentId}/settings` },
    ];

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in px-4">
            {/* Header / Nav */}
            <div className="mb-10">
                <Link
                    href="/agents"
                    className="flex items-center gap-2 text-gray-400 font-extrabold text-sm uppercase tracking-widest hover:text-[#21AC96] transition-colors group inline-flex"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Volver a Agentes
                </Link>
            </div>

            {/* Agent Header Card */}
            <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] mb-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#21AC96]/5 rounded-full -translate-y-32 translate-x-32"></div>

                <div className="relative flex flex-col lg:flex-row lg:items-center gap-10">
                    {/* Avatar */}
                    <div className="w-28 h-28 bg-gradient-to-br from-[#21AC96] to-[#1a8a78] rounded-[2rem] flex items-center justify-center text-5xl shadow-2xl shadow-[#21AC96]/20 text-white font-black rotate-3">
                        {agent.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <h1 className="text-gray-900 text-4xl font-black tracking-tight">{agent.name}</h1>
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                Activo
                            </div>
                        </div>
                        <p className="text-gray-500 font-bold text-lg max-w-2xl leading-relaxed">
                            {agent.jobType === 'SALES' ? 'Agente Comercial' : agent.jobType === 'SUPPORT' ? 'Agente de Soporte' : 'Asistente Personal'}
                            {agent.jobCompany ? ` en ${agent.jobCompany}` : ''}
                        </p>

                        {/* Quick Stats Grid */}
                        <div className="flex flex-wrap gap-8 pt-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-[#21AC96] shadow-sm">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Motor</div>
                                    <div className="text-sm text-gray-900 font-black">{agent.model.toUpperCase()}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm">
                                    <LayoutGrid className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Canales</div>
                                    <div className="text-sm text-gray-900 font-black">{agent._count.channels} Conectados</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-orange-500 shadow-sm">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Chats</div>
                                    <div className="text-sm text-gray-900 font-black">{agent._count.conversations} Totales</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation & Actions */}
            <AgentLayoutClient agentId={agentId} agentName={agent.name} tabs={tabs} userRole={userRole} />

            {/* Main Content Area */}
            <div className="mt-8">
                {children}
            </div>
        </div>
    );
}
