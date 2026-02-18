'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, MoreVertical, Bot, MessageSquare, Zap, LayoutGrid, Settings, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { AgentWizard } from '@/components/agents/wizard/AgentWizard';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Agent {
    id: string;
    name: string;
    jobCompany?: string | null;
    avatarUrl?: string | null;
    trainingScore?: number | null;
    _count: {
        channels: number;
        conversations: number;
    };
}

interface AgentsPageClientProps {
    initialAgents: Agent[];
    userRole: 'OWNER' | 'MANAGER' | 'AGENT' | null;
}

function AgentCard({ agent }: { agent: Agent }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsMenuOpen(false);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const { deleteAgent } = await import('@/lib/actions/dashboard');
            await deleteAgent(agent.id);
            toast.success('Agente eliminado');
            router.refresh();
        } catch (error) {
            console.error('Error deleting agent:', error);
            toast.error('Error al eliminar');
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    return (
        <>
            <div className="relative group">
                <Link
                    href={`/agents/${agent.id}/profile`}
                    className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] hover:shadow-xl hover:shadow-[#21AC96]/5 transition-all cursor-pointer block relative overflow-hidden h-full"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#21AC96]/5 rounded-full -translate-y-16 translate-x-16 group-hover:bg-[#21AC96]/10 transition-colors pointer-events-none"></div>

                    {/* Header */}
                    <div className="flex items-start justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-gradient-to-br from-[#21AC96] to-[#1a8a78] rounded-2xl flex items-center justify-center text-3xl shadow-lg group-hover:rotate-6 transition-transform text-white font-bold overflow-hidden">
                                {(() => {
                                    console.log('[AgentCard] Agent:', agent.name, 'Avatar URL:', agent.avatarUrl);
                                    return agent.avatarUrl ? (
                                        <img
                                            src={`${agent.avatarUrl}?t=${Date.now()}`}
                                            alt={agent.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        agent.name.charAt(0).toUpperCase()
                                    );
                                })()}
                            </div>
                            <div>
                                <h3 className="text-gray-900 text-xl font-extrabold tracking-tight mb-1">{agent.name}</h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex px-2 py-0.5 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-green-100">
                                        Activo
                                    </span>
                                    {agent.jobCompany && (
                                        <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                                            {agent.jobCompany}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8 bg-gray-50/50 rounded-3xl p-4 sm:p-6 border border-gray-50">
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-2 shadow-sm">
                                <LayoutGrid className="w-4 h-4 text-[#21AC96]" />
                            </div>
                            <span className="text-base sm:text-lg text-gray-900 font-extrabold">{agent._count.channels}</span>
                            <span className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">Canales</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-2 shadow-sm">
                                <MessageSquare className="w-4 h-4 text-indigo-500" />
                            </div>
                            <span className="text-base sm:text-lg text-gray-900 font-extrabold">{agent._count.conversations}</span>
                            <span className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">Chats</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-2 shadow-sm">
                                <Zap className="w-4 h-4 text-orange-500" />
                            </div>
                            <span className="text-base sm:text-lg text-gray-900 font-extrabold">{agent.trainingScore ?? 0}</span>
                            <span className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">Puntos</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4">
                        <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs">💬</div>
                            <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs">🌐</div>
                        </div>
                        <span className="text-sm text-[#21AC96] font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                            Ver Perfil
                            <Plus className="w-4 h-4 rotate-45" />
                        </span>
                    </div>
                </Link>

                {/* Floating Menu Button */}
                <div className="absolute top-8 right-8 z-20" ref={menuRef}>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsMenuOpen(!isMenuOpen);
                        }}
                        className="p-2 hover:bg-gray-100/80 rounded-xl transition-colors text-gray-400 hover:text-gray-600 bg-white/50 backdrop-blur-sm"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                            <div className="p-1.5 space-y-0.5">
                                <Link
                                    href={`/agents/${agent.id}/settings`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                                >
                                    <Settings className="w-4 h-4 text-gray-400" />
                                    Configurar
                                </Link>
                                <button
                                    onClick={handleDeleteClick}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-center text-xl">¿Estás seguro?</DialogTitle>
                        <DialogDescription className="text-center pt-2">
                            Esta acción eliminará permanentemente al agente <strong>{agent.name}</strong> y todo su historial. No se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 gap-2 sm:gap-0 sm:flex-col sm:space-y-2">
                        <button
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="w-full px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
                        >
                            {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Agente'}
                        </button>
                        <button
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="w-full px-4 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function AgentsPageClient({ initialAgents, userRole }: AgentsPageClientProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

    // Check if user can create agents (OWNER or MANAGER)
    const canCreate = userRole === 'OWNER' || userRole === 'MANAGER';

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in text-gray-900">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-2">Agentes</h1>
                    <p className="text-gray-500 font-medium">Crea, entrena y gestiona tus agentes de IA personalizados</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* View Toggle - Hidden on very small screens to save space */}
                    <div className="hidden xs:flex bg-white p-1 rounded-xl border border-gray-100 items-center shadow-sm">
                        <button
                            onClick={() => setViewMode('GRID')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-gray-100 text-[#21AC96]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('LIST')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-gray-100 text-[#21AC96]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <div className="w-5 h-5 flex flex-col justify-center gap-1">
                                <span className="w-full h-0.5 bg-current rounded-full"></span>
                                <span className="w-full h-0.5 bg-current rounded-full"></span>
                                <span className="w-full h-0.5 bg-current rounded-full"></span>
                            </div>
                        </button>
                    </div>

                    {canCreate && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all cursor-pointer group active:scale-95"
                        >
                            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                            <span className="whitespace-nowrap">Nuevo Agente</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {initialAgents.length > 0 ? (
                viewMode === 'GRID' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                        {initialAgents.map((agent) => (
                            <AgentCard key={agent.id} agent={agent} />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {initialAgents.map((agent) => (
                            <AgentListItem key={agent.id} agent={agent} />
                        ))}
                    </div>
                )
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

            <AgentWizard
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onAgentCreated={() => console.log('Agent Created')}
            />
        </div>
    );
}

function AgentListItem({ agent }: { agent: Agent }) {
    const router = useRouter();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const { deleteAgent } = await import('@/lib/actions/dashboard');
            await deleteAgent(agent.id);
            toast.success('Agente eliminado');
            router.refresh();
        } catch (error) {
            console.error('Error deleting agent:', error);
            toast.error('Error al eliminar');
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    return (
        <>
            <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col md:flex-row items-center gap-6">
                {/* Avatar + Basic Info */}
                <div className="flex items-center gap-6 flex-1 w-full md:w-auto">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#21AC96] to-[#1a8a78] rounded-2xl flex items-center justify-center text-3xl shadow-lg text-white font-bold flex-none overflow-hidden">
                        {agent.avatarUrl ? (
                            <img
                                src={`${agent.avatarUrl}?t=${Date.now()}`}
                                alt={agent.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            agent.name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-gray-900 text-lg font-extrabold tracking-tight">{agent.name}</h3>
                            <span className="inline-flex px-2 py-0.5 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-green-100">
                                Activo
                            </span>
                            {agent.jobCompany && (
                                <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                                    {agent.jobCompany}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 font-medium">Creado el 12 Ene 2024</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center gap-12 flex-1 w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                    <div className="text-center">
                        <span className="block text-xl font-black text-gray-900">{agent._count.channels}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Canales</span>
                    </div>
                    <div className="text-center">
                        <span className="block text-xl font-black text-gray-900">{agent._count.conversations}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Chats</span>
                    </div>
                    <div className="text-center">
                        <span className="block text-xl font-black text-gray-900">0</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Puntos</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                    <Link
                        href={`/agents/${agent.id}/settings`}
                        className="px-5 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
                    >
                        Configurar
                    </Link>
                    <button
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-center text-xl">¿Estás seguro?</DialogTitle>
                        <DialogDescription className="text-center pt-2">
                            Esta acción eliminará permanentemente al agente <strong>{agent.name}</strong> y todo su historial. No se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 gap-2 sm:gap-0 sm:flex-col sm:space-y-2">
                        <button
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="w-full px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
                        >
                            {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Agente'}
                        </button>
                        <button
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="w-full px-4 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
