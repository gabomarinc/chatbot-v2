'use client'

import { useState } from 'react';
import { MessageSquare, CheckCircle, Clock, TrendingUp, User, Mail, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AgentPersonalStats {
    totalAssigned: number;
    assignedToday: number;
    handledThisWeek: number;
    handledThisMonth: number;
    activeConversations: number;
    pendingConversations: number;
    closedConversations: number;
    responseRate: number;
    averageResponseTimeMinutes: number;
}

interface RecentConversation {
    id: string;
    contactName: string;
    contactEmail?: string | null;
    agentName: string;
    channelType: string;
    channelName: string;
    status: string;
    lastMessageAt: Date | null;
    messageCount: number;
    assignedAt: Date | null;
}

interface AgentDashboardClientProps {
    stats: AgentPersonalStats | null;
    recentConversations: RecentConversation[];
}

export function AgentDashboardClient({ stats, recentConversations }: AgentDashboardClientProps) {
    if (!stats) {
        return (
            <div className="p-8">
                <div className="text-center text-gray-500">Cargando estadísticas...</div>
            </div>
        );
    }

    const getChannelIcon = (type: string) => {
        switch (type) {
            case 'WHATSAPP':
                return '💬';
            case 'WEBCHAT':
                return '🌐';
            case 'INSTAGRAM':
                return '📷';
            case 'MESSENGER':
                return '💙';
            default:
                return '📱';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'OPEN':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">Abierta</span>;
            case 'PENDING':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold">Pendiente</span>;
            case 'CLOSED':
                return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">Cerrada</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">{status}</span>;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-3">Mi Panel</h1>
                <p className="text-gray-500 font-medium">
                    Visión personal de tus conversaciones asignadas y desempeño
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Asignadas */}
                <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 mb-1">{stats.totalAssigned}</div>
                    <div className="text-sm text-gray-500 font-medium">Total Asignadas</div>
                </div>

                {/* Activas */}
                <Link 
                    href="/chat"
                    className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] hover:shadow-xl hover:shadow-[#21AC96]/5 hover:border-[#21AC96]/20 transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 mb-1">{stats.activeConversations}</div>
                    <div className="text-sm text-gray-500 font-medium">Conversaciones Activas</div>
                </Link>

                {/* Pendientes */}
                <Link 
                    href="/chat?status=PENDING"
                    className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] hover:shadow-xl hover:shadow-[#21AC96]/5 hover:border-[#21AC96]/20 transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 mb-1">{stats.pendingConversations}</div>
                    <div className="text-sm text-gray-500 font-medium">Pendientes</div>
                </Link>

                {/* Tasa de Respuesta */}
                <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 mb-1">{stats.responseRate}%</div>
                    <div className="text-sm text-gray-500 font-medium">Tasa de Respuesta</div>
                </div>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Esta Semana */}
                <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="text-2xl font-extrabold text-gray-900 mb-1">{stats.handledThisWeek}</div>
                    <div className="text-sm text-gray-500 font-medium">Atendidas esta semana</div>
                </div>

                {/* Este Mes */}
                <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="text-2xl font-extrabold text-gray-900 mb-1">{stats.handledThisMonth}</div>
                    <div className="text-sm text-gray-500 font-medium">Atendidas este mes</div>
                </div>

                {/* Tiempo Promedio */}
                <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="text-2xl font-extrabold text-gray-900 mb-1">
                        {stats.averageResponseTimeMinutes > 0 
                            ? `${stats.averageResponseTimeMinutes} min`
                            : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500 font-medium">Tiempo promedio de respuesta</div>
                </div>
            </div>

            {/* Recent Conversations */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                <div className="p-8 border-b border-gray-100">
                    <h2 className="text-xl font-extrabold text-gray-900">Conversaciones Recientes</h2>
                    <p className="text-sm text-gray-500 mt-1">Últimas conversaciones asignadas a ti</p>
                </div>

                <div className="p-6">
                    {recentConversations.length > 0 ? (
                        <div className="space-y-4">
                            {recentConversations.map((conv) => (
                                <Link
                                    key={conv.id}
                                    href={`/chat?conversationId=${conv.id}`}
                                    className="block p-5 rounded-2xl border border-gray-100 hover:border-[#21AC96]/20 hover:shadow-lg hover:shadow-[#21AC96]/5 transition-all group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-2xl">{getChannelIcon(conv.channelType)}</span>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-[#21AC96] transition-colors">
                                                            {conv.contactName}
                                                        </h3>
                                                        {getStatusBadge(conv.status)}
                                                    </div>
                                                    {conv.contactEmail && (
                                                        <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                                                            <Mail className="w-3 h-3" />
                                                            {conv.contactEmail}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                                                <span className="flex items-center gap-1.5">
                                                    <MessageSquare className="w-4 h-4" />
                                                    {conv.messageCount} mensajes
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4" />
                                                    {conv.lastMessageAt 
                                                        ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true, locale: es })
                                                        : 'Sin mensajes'}
                                                </span>
                                                {conv.assignedAt && (
                                                    <span className="flex items-center gap-1.5">
                                                        <User className="w-4 h-4" />
                                                        Asignada {formatDistanceToNow(new Date(conv.assignedAt), { addSuffix: true, locale: es })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No tienes conversaciones asignadas aún</p>
                            <p className="text-sm text-gray-400 mt-1">Las conversaciones asignadas aparecerán aquí</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

