'use client'

import { useState, useEffect } from 'react';
import { X, User, Mail, Calendar, Clock, MessageSquare, CheckCircle, AlertCircle, Users, TrendingUp, BarChart3, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { getMemberStats } from '@/lib/actions/team';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { updateTeamMember, removeTeamMember } from '@/lib/actions/team';

interface MemberDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberId: string;
    memberName: string;
    memberEmail: string;
    memberRole: 'OWNER' | 'MANAGER' | 'AGENT';
    currentUserRole?: 'OWNER' | 'MANAGER' | 'AGENT' | null;
}

interface MemberStats {
    member: {
        id: string;
        name: string | null;
        email: string;
        role: 'OWNER' | 'MANAGER' | 'AGENT';
        department: 'SUPPORT' | 'SALES' | 'PERSONAL' | null;
        joinedAt: Date;
        lastLoginAt: Date | null;
    };
    stats: {
        totalAssigned: number;
        assignedToday: number;
        assignedThisWeek: number;
        assignedThisMonth: number;
        activeConversations: number;
        pendingConversations: number;
        closedConversations: number;
        responseRate: number;
        averageResponseTimeMinutes: number;
    };
    peakActivity: {
        day: string | null;
        hour: string | null;
    };
    recentConversations: Array<{
        id: string;
        contactName: string;
        channelType: string;
        channelName: string;
        status: string;
        lastMessageAt: Date | null;
        messageCount: number;
        assignedAt: Date | null;
    }>;
}

export function MemberDetailsModal({
    isOpen,
    onClose,
    memberId,
    memberName,
    memberEmail,
    memberRole,
    currentUserRole
}: MemberDetailsModalProps) {
    const router = useRouter();
    const [stats, setStats] = useState<MemberStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);

    useEffect(() => {
        if (isOpen && memberId) {
            loadMemberStats();
        }
    }, [isOpen, memberId]);

    const loadMemberStats = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getMemberStats(memberId);
            if (result.error) {
                setError(result.error);
            } else if (result.success && result.member) {
                setStats(result as any);
            }
        } catch (err) {
            setError('Error al cargar estadísticas');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateRole = async (newRole: 'MANAGER' | 'AGENT') => {
        setIsUpdatingRole(true);
        try {
            const result = await updateTeamMember(memberId, { role: newRole });
            if (result.error) {
                alert(result.error);
            } else {
                router.refresh();
                loadMemberStats();
            }
        } catch (err) {
            alert('Error al actualizar rol');
        } finally {
            setIsUpdatingRole(false);
        }
    };

    const handleRemoveMember = async () => {
        if (!confirm(`¿Estás seguro de eliminar a ${memberName} del equipo?`)) {
            return;
        }

        setIsUpdatingRole(true);
        try {
            const result = await removeTeamMember(memberId);
            if (result.error) {
                alert(result.error);
            } else {
                router.refresh();
                onClose();
            }
        } catch (err) {
            alert('Error al eliminar miembro');
        } finally {
            setIsUpdatingRole(false);
        }
    };

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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'OPEN':
                return 'bg-green-50 text-green-700 border-green-100';
            case 'PENDING':
                return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'CLOSED':
                return 'bg-gray-50 text-gray-700 border-gray-100';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const getUserStatus = () => {
        if (!stats?.member.lastLoginAt) return 'Pendiente';
        const lastLogin = new Date(stats.member.lastLoginAt).getTime();
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        if (now - lastLogin < thirtyMinutes) return 'Activo';
        return 'Desconectado';
    };

    const getDepartmentLabel = (dept: string | null) => {
        switch (dept) {
            case 'SALES': return 'Comercial / Ventas';
            case 'SUPPORT': return 'Soporte Técnico';
            case 'PERSONAL': return 'General / Personal';
            default: return 'General / Personal';
        }
    };

    if (!isOpen) return null;

    const canManage = currentUserRole === 'OWNER' || (currentUserRole === 'MANAGER' && memberRole !== 'OWNER');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-8 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#1E9A86] to-[#158571] rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <User className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-gray-900">{memberName}</h2>
                            <p className="text-sm text-gray-500 font-medium">{memberEmail}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        disabled={isLoading || isUpdatingRole}
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E9A86]"></div>
                        <p className="mt-4 text-gray-500 font-medium">Cargando estadísticas...</p>
                    </div>
                ) : stats ? (
                    <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                        {/* Información Básica */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Rol</p>
                                <p className="text-lg font-extrabold text-gray-900">{getRoleLabel(stats.member.role)}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Departamento</p>
                                <p className="text-lg font-extrabold text-[#21AC96]">{getDepartmentLabel(stats.member.department)}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Estado</p>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${getUserStatus() === 'Activo' ? 'bg-green-500 animate-pulse' : getUserStatus() === 'Pendiente' ? 'bg-amber-500' : 'bg-gray-400'}`}></div>
                                    <p className="text-lg font-extrabold text-gray-900">{getUserStatus()}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Fecha de ingreso</p>
                                <p className="text-lg font-extrabold text-gray-900">
                                    {format(new Date(stats.member.joinedAt), 'dd MMM yyyy', { locale: es })}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Último login</p>
                                <p className="text-lg font-extrabold text-gray-900">
                                    {stats.member.lastLoginAt
                                        ? formatDistanceToNow(new Date(stats.member.lastLoginAt), { addSuffix: true, locale: es })
                                        : 'Nunca'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Estadísticas de Conversaciones */}
                        <div>
                            <h3 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-[#1E9A86]" />
                                Estadísticas de Conversaciones
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-gradient-to-br from-[#1E9A86]/10 to-[#158571]/5 rounded-2xl border border-[#1E9A86]/20">
                                    <p className="text-xs text-gray-600 font-bold uppercase tracking-widest mb-1">Total Asignadas</p>
                                    <p className="text-2xl font-extrabold text-gray-900">{stats.stats.totalAssigned}</p>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                    <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mb-1">Activas</p>
                                    <p className="text-2xl font-extrabold text-blue-900">{stats.stats.activeConversations}</p>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                    <p className="text-xs text-amber-600 font-bold uppercase tracking-widest mb-1">Pendientes</p>
                                    <p className="text-2xl font-extrabold text-amber-900">{stats.stats.pendingConversations}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-xs text-gray-600 font-bold uppercase tracking-widest mb-1">Cerradas</p>
                                    <p className="text-2xl font-extrabold text-gray-900">{stats.stats.closedConversations}</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                                    <p className="text-xs text-green-600 font-bold uppercase tracking-widest mb-1">Tasa de Respuesta</p>
                                    <p className="text-2xl font-extrabold text-green-900">{stats.stats.responseRate}%</p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                                    <p className="text-xs text-purple-600 font-bold uppercase tracking-widest mb-1">Tiempo Promedio</p>
                                    <p className="text-2xl font-extrabold text-purple-900">
                                        {stats.stats.averageResponseTimeMinutes > 0
                                            ? `${stats.stats.averageResponseTimeMinutes} min`
                                            : 'N/A'
                                        }
                                    </p>
                                </div>
                                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mb-1">Esta Semana</p>
                                    <p className="text-2xl font-extrabold text-indigo-900">{stats.stats.assignedThisWeek}</p>
                                </div>
                                <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100">
                                    <p className="text-xs text-teal-600 font-bold uppercase tracking-widest mb-1">Este Mes</p>
                                    <p className="text-2xl font-extrabold text-teal-900">{stats.stats.assignedThisMonth}</p>
                                </div>
                            </div>
                        </div>

                        {/* Pico de Actividad */}
                        {stats.peakActivity.day && (
                            <div className="p-4 bg-gradient-to-br from-[#1E9A86]/5 to-[#158571]/5 rounded-2xl border border-[#1E9A86]/20">
                                <h4 className="text-sm font-extrabold text-gray-900 mb-2 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-[#1E9A86]" />
                                    Pico de Actividad (Últimos 7 días)
                                </h4>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span className="font-bold">{stats.peakActivity.day}</span>
                                    </div>
                                    {stats.peakActivity.hour && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            <span className="font-bold">{stats.peakActivity.hour}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Conversaciones Recientes */}
                        {stats.recentConversations.length > 0 && (
                            <div>
                                <h3 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-[#1E9A86]" />
                                    Conversaciones Recientes
                                </h3>
                                <div className="space-y-2">
                                    {stats.recentConversations.map((conv) => (
                                        <a
                                            key={conv.id}
                                            href={`/chat?conversationId=${conv.id}`}
                                            className="block p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#1E9A86] hover:bg-[#1E9A86]/5 transition-all group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-extrabold text-gray-900 truncate">{conv.contactName}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs text-gray-500 font-medium">{conv.channelName}</span>
                                                        <span className="text-xs text-gray-400">•</span>
                                                        <span className="text-xs text-gray-500 font-medium">{conv.messageCount} mensajes</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border ${getStatusBadge(conv.status)}`}>
                                                        {conv.status}
                                                    </span>
                                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#1E9A86] transition-colors" />
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Acciones Rápidas */}
                        {canManage && (
                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-lg font-extrabold text-gray-900 mb-4">Acciones Rápidas</h3>
                                <div className="flex flex-wrap gap-3">
                                    {memberRole !== 'OWNER' && (
                                        <>
                                            {memberRole === 'AGENT' && (
                                                <button
                                                    onClick={() => handleUpdateRole('MANAGER')}
                                                    disabled={isUpdatingRole}
                                                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 hover:bg-purple-100 transition-colors font-bold text-sm disabled:opacity-50"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    Promover a Administrador
                                                </button>
                                            )}
                                            {memberRole === 'MANAGER' && (
                                                <button
                                                    onClick={() => handleUpdateRole('AGENT')}
                                                    disabled={isUpdatingRole}
                                                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors font-bold text-sm disabled:opacity-50"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    Degradar a Agente
                                                </button>
                                            )}
                                            {currentUserRole === 'OWNER' && (
                                                <button
                                                    onClick={handleRemoveMember}
                                                    disabled={isUpdatingRole}
                                                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl border border-red-100 hover:bg-red-100 transition-colors font-bold text-sm disabled:opacity-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Eliminar del Equipo
                                                </button>
                                            )}
                                        </>
                                    )}
                                    <a
                                        href="/chat"
                                        className="flex items-center gap-2 px-4 py-2 bg-[#1E9A86] text-white rounded-xl hover:bg-[#158571] transition-colors font-bold text-sm"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Ver Todas las Conversaciones
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}



