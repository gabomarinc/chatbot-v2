'use client'

import { Settings, Users, Bot, CreditCard, ChevronRight, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface WorkspaceDropdownProps {
    isOpen: boolean;
    workspaceInfo: {
        id: string;
        name: string;
        createdAt: Date;
        role: string;
        plan: {
            name: string;
            type: string;
            price: number;
            creditsPerMonth: number;
            maxAgents: number;
        } | null;
        membersCount: number;
        agentsCount: number;
    } | null;
    isLoading?: boolean;
    onClose: () => void;
}

export function WorkspaceDropdown({ isOpen, workspaceInfo, isLoading = false, onClose }: WorkspaceDropdownProps) {
    const router = useRouter();

    if (!isOpen) return null;

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'OWNER':
                return 'Propietario';
            case 'MANAGER':
                return 'Administrador';
            case 'AGENT':
                return 'Agente';
            default:
                return role;
        }
    };

    const handleAction = (action: string) => {
        switch (action) {
            case 'team':
                router.push('/team');
                break;
            case 'settings':
                router.push('/settings');
                break;
            case 'billing':
                router.push('/billing');
                break;
        }
        onClose();
    };

    return (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
            {isLoading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21AC96]"></div>
                </div>
            ) : workspaceInfo ? (
                <div className="p-4">
                    {/* Header */}
                    <div className="mb-4 pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#21AC96] to-[#1a8a78] flex items-center justify-center text-white shadow-lg">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-extrabold text-gray-900 truncate">{workspaceInfo.name}</h3>
                                <p className="text-xs text-gray-500 font-medium">Miembro desde {format(new Date(workspaceInfo.createdAt), 'MMM yyyy', { locale: es as any })}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
                            <span className="text-xs text-gray-500 font-medium">Rol:</span>
                            <span className="text-xs font-bold text-[#21AC96]">{getRoleLabel(workspaceInfo.role)}</span>
                        </div>
                    </div>

                    {/* Plan Info */}
                    {workspaceInfo.plan && (
                        <div className="mb-4 pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-purple-50/50 rounded-xl">
                                <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">{workspaceInfo.plan.name}</p>
                                    <p className="text-xs text-gray-600">
                                        ${workspaceInfo.plan.price.toLocaleString()}/mes • {workspaceInfo.plan.creditsPerMonth.toLocaleString()} créditos
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="mb-4 pb-4 border-b border-gray-100">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <Users className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs text-gray-500 font-medium">Miembros</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{workspaceInfo.membersCount}</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <Bot className="w-4 h-4 text-purple-600" />
                                    <span className="text-xs text-gray-500 font-medium">Agentes</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{workspaceInfo.agentsCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-1">
                        <button
                            onClick={() => handleAction('team')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer group transition-all"
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                <Users className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="flex-1 text-sm font-semibold text-gray-900 text-left">Ver Equipo</span>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#21AC96] group-hover:translate-x-1 transition-all" />
                        </button>

                        <button
                            onClick={() => handleAction('settings')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer group transition-all"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                                <Settings className="w-4 h-4 text-gray-600" />
                            </div>
                            <span className="flex-1 text-sm font-semibold text-gray-900 text-left">Configuración</span>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#21AC96] group-hover:translate-x-1 transition-all" />
                        </button>

                        <button
                            onClick={() => handleAction('billing')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer group transition-all"
                        >
                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                                <CreditCard className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="flex-1 text-sm font-semibold text-gray-900 text-left">Facturación</span>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#21AC96] group-hover:translate-x-1 transition-all" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <Building2 className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm font-bold text-gray-600 mb-1">No se pudo cargar el workspace</p>
                    <p className="text-xs text-gray-400">Intenta recargar la página</p>
                </div>
            )}
        </div>
    );
}

