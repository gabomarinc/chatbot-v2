'use client'

import { useState } from 'react';
import { MessageSquare, CheckCircle, Clock, TrendingUp, User, Mail, Calendar, Users, UserCircle, ArrowRight, Zap } from 'lucide-react';
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
                return <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold border border-green-100">Abierta</span>;
            case 'PENDING':
                return <span className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-xl text-xs font-bold border border-yellow-100">Pendiente</span>;
            case 'CLOSED':
                return <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-200">Cerrada</span>;
            default:
                return <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-200">{status}</span>;
        }
    };

    return (
        <div className="space-y-10 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-12">
                <h1 className="text-gray-900 text-4xl font-extrabold tracking-tight mb-3">Mi Panel</h1>
                <p className="text-gray-500 font-medium text-lg">
                    Visión personal de tus conversaciones asignadas y desempeño
                </p>
            </div>

            {/* Main Stats Cards - Large and Centered */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Total Asignadas - Large Card */}
                <Link 
                    href="/chat"
                    className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] hover:shadow-xl hover:shadow-[#21AC96]/5 hover:border-[#21AC96]/20 transition-all cursor-pointer group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-full -translate-y-20 translate-x-20 group-hover:bg-blue-100 transition-colors"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                <MessageSquare className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <div className="text-5xl font-extrabold text-gray-900 mb-2">{stats.totalAssigned}</div>
                        <div className="text-base text-gray-500 font-semibold mb-4">Total Asignadas</div>
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-sm group-hover:translate-x-2 transition-transform">
                            <span>Ver todas</span>
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </Link>

                {/* Conversaciones Activas - Large Card */}
                <Link 
                    href="/chat?status=OPEN"
                    className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] hover:shadow-xl hover:shadow-[#21AC96]/5 hover:border-[#21AC96]/20 transition-all cursor-pointer group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-green-50 rounded-full -translate-y-20 translate-x-20 group-hover:bg-green-100 transition-colors"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform">
                                <CheckCircle className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <div className="text-5xl font-extrabold text-gray-900 mb-2">{stats.activeConversations}</div>
                        <div className="text-base text-gray-500 font-semibold mb-4">Conversaciones Activas</div>
                        <div className="flex items-center gap-2 text-green-600 font-bold text-sm group-hover:translate-x-2 transition-transform">
                            <span>Ver activas</span>
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </Link>
            </div>

            {/* Secondary Stats Row - Medium Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Pendientes */}
                <Link 
                    href="/chat?status=PENDING"
                    className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] hover:shadow-xl hover:shadow-yellow-500/5 hover:border-yellow-200 transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-14 h-14 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20 group-hover:scale-110 transition-transform">
                            <Clock className="w-7 h-7 text-white" />
                        </div>
                    </div>
                    <div className="text-4xl font-extrabold text-gray-900 mb-2">{stats.pendingConversations}</div>
                    <div className="text-sm text-gray-500 font-semibold">Pendientes</div>
                </Link>

                {/* Tasa de Respuesta */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <TrendingUp className="w-7 h-7 text-white" />
                        </div>
                    </div>
                    <div className="text-4xl font-extrabold text-gray-900 mb-2">{stats.responseRate}%</div>
                    <div className="text-sm text-gray-500 font-semibold">Tasa de Respuesta</div>
                </div>

                {/* Tiempo Promedio */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Zap className="w-7 h-7 text-white" />
                        </div>
                    </div>
                    <div className="text-4xl font-extrabold text-gray-900 mb-2">
                        {stats.averageResponseTimeMinutes > 0 
                            ? `${stats.averageResponseTimeMinutes} min`
                            : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500 font-semibold">Tiempo promedio</div>
                </div>
            </div>

            {/* Additional Metrics - Compact */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <div className="text-2xl font-extrabold text-gray-900 mb-1">{stats.handledThisWeek}</div>
                    <div className="text-xs text-gray-500 font-semibold">Esta semana</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <div className="text-2xl font-extrabold text-gray-900 mb-1">{stats.handledThisMonth}</div>
                    <div className="text-xs text-gray-500 font-semibold">Este mes</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <div className="text-2xl font-extrabold text-gray-900 mb-1">{stats.assignedToday}</div>
                    <div className="text-xs text-gray-500 font-semibold">Hoy</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <div className="text-2xl font-extrabold text-gray-900 mb-1">{stats.closedConversations}</div>
                    <div className="text-xs text-gray-500 font-semibold">Cerradas</div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] p-8">
                <h2 className="text-xl font-extrabold text-gray-900 mb-6">Accesos Rápidos</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link
                        href="/chat?status=PENDING"
                        className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-gray-100 hover:border-[#21AC96] hover:bg-[#21AC96]/5 transition-all group"
                    >
                        <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-yellow-500 transition-colors">
                            <Clock className="w-6 h-6 text-yellow-600 group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-sm font-bold text-gray-900">Pendientes</span>
                    </Link>
                    <Link
                        href="/prospects"
                        className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-gray-100 hover:border-[#21AC96] hover:bg-[#21AC96]/5 transition-all group"
                    >
                        <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-pink-500 transition-colors">
                            <UserCircle className="w-6 h-6 text-pink-600 group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-sm font-bold text-gray-900">Prospectos</span>
                    </Link>
                    <Link
                        href="/team"
                        className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-gray-100 hover:border-[#21AC96] hover:bg-[#21AC96]/5 transition-all group"
                    >
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-500 transition-colors">
                            <Users className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-sm font-bold text-gray-900">Equipo</span>
                    </Link>
                    <Link
                        href="/profile"
                        className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-gray-100 hover:border-[#21AC96] hover:bg-[#21AC96]/5 transition-all group"
                    >
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-500 transition-colors">
                            <User className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-sm font-bold text-gray-900">Perfil</span>
                    </Link>
                </div>
            </div>

            {/* Recent Conversations */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                <div className="p-8 border-b border-gray-100">
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Conversaciones Recientes</h2>
                    <p className="text-sm text-gray-500">Últimas conversaciones asignadas a ti</p>
                </div>

                <div className="p-6">
                    {recentConversations.length > 0 ? (
                        <div className="space-y-4">
                            {recentConversations.map((conv) => (
                                <Link
                                    key={conv.id}
                                    href={`/chat?conversationId=${conv.id}`}
                                    className="block p-6 rounded-2xl border-2 border-gray-100 hover:border-[#21AC96] hover:shadow-lg hover:shadow-[#21AC96]/5 transition-all group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="text-3xl">{getChannelIcon(conv.channelType)}</div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-xl font-extrabold text-gray-900 group-hover:text-[#21AC96] transition-colors">
                                                            {conv.contactName}
                                                        </h3>
                                                        {getStatusBadge(conv.status)}
                                                    </div>
                                                    {conv.contactEmail && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                                            <Mail className="w-4 h-4" />
                                                            {conv.contactEmail}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 text-sm text-gray-500 mt-4">
                                                <span className="flex items-center gap-2 font-semibold">
                                                    <MessageSquare className="w-4 h-4" />
                                                    {conv.messageCount} mensajes
                                                </span>
                                                <span className="flex items-center gap-2 font-semibold">
                                                    <Calendar className="w-4 h-4" />
                                                    {conv.lastMessageAt 
                                                        ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true, locale: es })
                                                        : 'Sin mensajes'}
                                                </span>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#21AC96] group-hover:translate-x-2 transition-all" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <MessageSquare className="w-10 h-10 text-gray-300" />
                            </div>
                            <p className="text-gray-900 font-bold text-lg mb-2">No tienes conversaciones asignadas aún</p>
                            <p className="text-sm text-gray-500">Las conversaciones asignadas aparecerán aquí</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
