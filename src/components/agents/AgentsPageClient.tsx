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
                    className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] hover:shadow-xl hover:shadow-[#21AC96]/5 transition-all cursor-pointer block relative overflow-visible h-full"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#21AC96]/5 rounded-full -translate-y-16 translate-x-16 group-hover:bg-[#21AC96]/10 transition-colors pointer-events-none"></div>

                    {/* Header */}
                    <div className="flex items-start justify-between mb-8 relative z-10">
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
                        <AgentCard key={agent.id} agent={agent} />
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

            <AgentWizard
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onAgentCreated={() => console.log('Agent Created')}
            />
        </div>
    );
}
