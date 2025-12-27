'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, CheckCircle, Coins, Users, Calendar, ChevronLeft, ChevronRight, Bot, Sparkles, Globe, Instagram, MessageCircle, BarChart as BarChartIcon, MessageSquare, Clock, TrendingUp as TrendingUpIcon, Smartphone } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ConversationsDayModal } from './ConversationsDayModal';
import { CreditsDetailsModal } from './CreditsDetailsModal';
import { ResponseRateDetailsModal } from './ResponseRateDetailsModal';
import { getConversationsByDate, getCreditsDetails, getResponseRateDetails, getWeeklyConversationsData } from '@/lib/actions/dashboard';

interface DashboardClientProps {
    stats: {
        conversaciones: number;
        creditos: number;
        contactos: number;
        tasaRespuesta: number;
    };
    chartData: any[];
    channels: any[];
    topAgents: any[];
    weeklyConversations: {
        data: Array<{
            date: Date;
            dayName: string;
            dayNumber: string;
            count: number;
        }>;
        weekStart: Date;
        weekEnd: Date;
    };
}

// Custom clickable dot component
const ClickableDot = ({ cx, cy, payload, onClick }: any) => {
    if (!payload || payload.count === 0) return null;
    
    return (
        <g>
            <circle
                cx={cx}
                cy={cy}
                r={6}
                fill="#21AC96"
                stroke="#fff"
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick(payload);
                }}
                onMouseEnter={(e) => {
                    if (e.currentTarget) {
                        e.currentTarget.setAttribute('r', '8');
                        e.currentTarget.style.filter = 'drop-shadow(0 4px 8px rgba(33, 172, 150, 0.4))';
                    }
                }}
                onMouseLeave={(e) => {
                    if (e.currentTarget) {
                        e.currentTarget.setAttribute('r', '6');
                        e.currentTarget.style.filter = 'none';
                    }
                }}
            />
        </g>
    );
};

export default function DashboardClient({ stats, chartData, channels, topAgents, weeklyConversations }: DashboardClientProps) {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [conversations, setConversations] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingConversations, setIsLoadingConversations] = useState(false);
    
    // Credits modal state
    const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
    const [creditsData, setCreditsData] = useState<any>(null);
    const [isLoadingCredits, setIsLoadingCredits] = useState(false);
    
    // Response rate modal state
    const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
    const [responseData, setResponseData] = useState<any>(null);
    const [isLoadingResponse, setIsLoadingResponse] = useState(false);
    
    // Weekly navigation state
    const [weekOffset, setWeekOffset] = useState(0);
    const [weeklyData, setWeeklyData] = useState(() => {
        return {
            ...weeklyConversations,
            weekStart: new Date(weeklyConversations.weekStart),
            weekEnd: new Date(weeklyConversations.weekEnd),
            data: weeklyConversations.data.map(item => ({
                ...item,
                date: new Date(item.date)
            }))
        };
    });
    const [isLoadingWeeklyData, setIsLoadingWeeklyData] = useState(false);

    // Load weekly data when weekOffset changes
    const handleWeekChange = async (newOffset: number) => {
        setWeekOffset(newOffset);
        setIsLoadingWeeklyData(true);
        try {
            const data = await getWeeklyConversationsData(newOffset);
            setWeeklyData({
                ...data,
                weekStart: new Date(data.weekStart),
                weekEnd: new Date(data.weekEnd),
                data: data.data.map(item => ({
                    ...item,
                    date: new Date(item.date)
                }))
            });
        } catch (error) {
            console.error('Error loading weekly data:', error);
        } finally {
            setIsLoadingWeeklyData(false);
        }
    };

    const formatWeekRange = (start: Date, end: Date) => {
        const startStr = format(start, 'd MMM', { locale: es });
        const endStr = format(end, 'd MMM', { locale: es });
        return `${startStr} - ${endStr}`;
    };

    const handlePointClick = async (data: any) => {
        if (!data || data.count === 0) return;
        
        const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
        setSelectedDate(date);
        setIsLoadingConversations(true);
        setIsModalOpen(true);

        try {
            const convs = await getConversationsByDate(date);
            setConversations(convs);
        } catch (error) {
            console.error('Error loading conversations:', error);
            setConversations([]);
        } finally {
            setIsLoadingConversations(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedDate(null);
        setConversations([]);
    };

    const handleCreditsClick = async () => {
        setIsCreditsModalOpen(true);
        setIsLoadingCredits(true);
        try {
            const data = await getCreditsDetails();
            setCreditsData(data);
        } catch (error) {
            console.error('Error loading credits details:', error);
        } finally {
            setIsLoadingCredits(false);
        }
    };

    const handleResponseRateClick = async () => {
        setIsResponseModalOpen(true);
        setIsLoadingResponse(true);
        try {
            const data = await getResponseRateDetails();
            setResponseData(data);
        } catch (error) {
            console.error('Error loading response rate details:', error);
        } finally {
            setIsLoadingResponse(false);
        }
    };

    const statCards = [
        { 
            label: 'Total de Conversaciones', 
            value: stats.conversaciones.toLocaleString(), 
            change: '0%', 
            isPositive: true, 
            icon: CheckCircle,
            onClick: () => router.push('/chat')
        },
        { 
            label: 'Créditos Disponibles', 
            value: stats.creditos.toLocaleString(), 
            change: '0%', 
            isPositive: true, 
            icon: Coins,
            onClick: handleCreditsClick
        },
        { 
            label: 'Nuevos Contactos', 
            value: stats.contactos.toLocaleString(), 
            change: '0%', 
            isPositive: true, 
            icon: Users,
            onClick: () => router.push('/prospects')
        },
        { 
            label: 'Tasa de Respuesta', 
            value: `${stats.tasaRespuesta}%`, 
            change: '0%', 
            isPositive: true, 
            icon: Calendar,
            onClick: handleResponseRateClick
        },
    ];

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-2">Panel Principal</h1>
                    <p className="text-gray-500 font-medium">Información estratégica de tus agentes e interacciones</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div 
                            key={index} 
                            onClick={stat.onClick}
                            className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] hover:shadow-xl hover:shadow-[#21AC96]/5 transition-all group overflow-hidden relative cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#21AC96]/5 rounded-full -translate-y-12 translate-x-12 group-hover:bg-[#21AC96]/10 transition-colors"></div>

                            <div className="flex items-center justify-between mb-6 relative">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-[#21AC96]/10 transition-colors">
                                    <Icon className="w-6 h-6 text-gray-400 group-hover:text-[#21AC96] transition-colors" />
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${stat.isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    {stat.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {stat.change}
                                </div>
                            </div>
                            <div className="relative">
                                <div className="text-3xl text-gray-900 font-extrabold tracking-tight mb-1">{stat.value}</div>
                                <div className="text-sm text-gray-400 font-bold uppercase tracking-wider">{stat.label}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                {/* Weekly Conversations Chart */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-gray-900 font-extrabold text-xl tracking-tight mb-1">Conversaciones Iniciadas</h3>
                            <p className="text-sm text-gray-400 font-medium">Total de conversaciones iniciadas por día</p>
                        </div>
                    </div>
                    
                    {/* Week Navigation */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleWeekChange(weekOffset - 1)}
                                disabled={isLoadingWeeklyData}
                                className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-[#21AC96] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-[#21AC96] transition-colors" />
                            </button>
                            <div className="px-5 py-2.5 bg-gray-50 rounded-xl min-w-[200px] text-center">
                                {isLoadingWeeklyData ? (
                                    <div className="animate-pulse">
                                        <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
                                    </div>
                                ) : (
                                    <span className="text-sm font-bold text-gray-700">
                                        {formatWeekRange(weeklyData.weekStart, weeklyData.weekEnd)}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => handleWeekChange(weekOffset + 1)}
                                disabled={isLoadingWeeklyData}
                                className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-[#21AC96] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#21AC96] transition-colors" />
                            </button>
                            {weekOffset !== 0 && (
                                <button
                                    onClick={() => handleWeekChange(0)}
                                    className="ml-2 px-4 py-2 text-sm font-bold text-[#21AC96] hover:bg-[#21AC96]/10 rounded-xl transition-colors"
                                >
                                    Hoy
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="h-[280px] w-full">
                        {isLoadingWeeklyData ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#21AC96]"></div>
                            </div>
                        ) : weeklyData.data.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart 
                                    data={weeklyData.data} 
                                    margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="dayName"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                        dy={10}
                                        tickFormatter={(value, index) => {
                                            const day = weeklyData.data[index];
                                            if (day) {
                                                return `${value} ${day.dayNumber}`;
                                            }
                                            return value;
                                        }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                    />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl border-none">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Calendar className="w-4 h-4" />
                                                            <span className="text-xs font-bold text-gray-300">
                                                                {format(data.date, 'd MMM', { locale: es })}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <MessageSquare className="w-4 h-4 text-[#21AC96]" />
                                                            <span className="text-sm font-bold">
                                                                {data.count} conversaciones iniciadas
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#21AC96"
                                        strokeWidth={3}
                                        dot={(props: any) => <ClickableDot {...props} onClick={handlePointClick} />}
                                        activeDot={(props: any) => {
                                            const { cx, cy, payload } = props;
                                            return (
                                                <g>
                                                    <circle
                                                        cx={cx}
                                                        cy={cy}
                                                        r={8}
                                                        fill="#21AC96"
                                                        stroke="#fff"
                                                        strokeWidth={3}
                                                        style={{ 
                                                            cursor: 'pointer',
                                                            filter: 'drop-shadow(0 4px 8px rgba(33, 172, 150, 0.4))'
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePointClick(payload);
                                                        }}
                                                    />
                                                </g>
                                            );
                                        }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center p-10 bg-gray-50/50 rounded-[2rem] w-full h-full border-2 border-dashed border-gray-100">
                                <MessageSquare className="w-12 h-12 text-gray-200 mb-4" />
                                <p className="text-sm text-gray-400 font-bold max-w-xs">Aún no hay conversaciones en esta semana.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Communication Channels */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                            <BarChartIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="text-gray-900 font-extrabold text-xl tracking-tight">Canales de Comunicación</h3>
                    </div>

                    {channels && channels.length > 0 ? (
                        <div className="space-y-4">
                            {channels.map((channel, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-[1.5rem] hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                            {channel.type === 'WEBCHAT' && <Globe className="w-6 h-6 text-[#21AC96]" />}
                                            {channel.type === 'INSTAGRAM' && <Instagram className="w-6 h-6 text-pink-600" />}
                                            {channel.type === 'WHATSAPP' && <MessageCircle className="w-6 h-6 text-green-500" />}
                                            {channel.type === 'MESSENGER' && <MessageCircle className="w-6 h-6 text-blue-600" />}
                                            {!['WEBCHAT', 'INSTAGRAM', 'WHATSAPP', 'MESSENGER'].includes(channel.type) && <Globe className="w-6 h-6 text-gray-400" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">
                                                {channel.type === 'WEBCHAT' ? 'Web' :
                                                    channel.type === 'INSTAGRAM' ? 'Instagram' :
                                                        channel.type === 'WHATSAPP' ? 'WhatsApp' :
                                                            channel.type}
                                            </h4>
                                            <p className="text-xs text-gray-500 font-medium">{channel.type === 'WEBCHAT' ? 'Widget Web' : channel.name}</p>
                                            <p className="text-xs text-gray-400">{channel.agentName}</p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${channel.isActive
                                            ? 'bg-green-100/50 text-green-700'
                                            : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        {channel.isActive ? 'Conectado' : 'Desconectado'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-[250px] flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                <Globe className="w-8 h-8 text-gray-200" />
                            </div>
                            <p className="text-sm text-gray-400 font-bold max-w-[200px]">Sin canales conectados. Ve a tus agentes para conectar uno.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Row - Ranking */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-gray-900 font-extrabold text-xl tracking-tight">Top Desempeño por Agente</h3>
                    <button className="text-[#21AC96] text-sm font-bold hover:underline">Ver reporte completo</button>
                </div>

                {topAgents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {topAgents.map((agent: any, index) => (
                            <div key={agent.id || index} className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl p-6 border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all group">
                                {/* Header with Avatar and Rank */}
                                <div className="flex items-start justify-between mb-5">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 bg-gradient-to-br ${agent.color} rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg relative group-hover:rotate-6 transition-transform`}>
                                            {agent.name.charAt(0).toUpperCase()}
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-gray-900 shadow-sm border border-gray-100">
                                                #{index + 1}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-base text-gray-900 font-extrabold tracking-tight">{agent.name}</h4>
                                            <p className="text-xs text-gray-400 font-medium">{agent.role || 'Agente'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Metric */}
                                <div className="mb-5">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-2xl font-extrabold text-gray-900">{agent.conversations}</span>
                                        <span className="text-sm font-bold text-gray-400">conversaciones</span>
                                    </div>
                                    {agent.creditsUsed > 0 && (
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <Coins className="w-3.5 h-3.5 text-[#21AC96]" />
                                            <span className="font-bold text-[#21AC96]">{agent.creditsUsed}</span>
                                            <span className="text-xs text-gray-400">créditos usados</span>
                                        </div>
                                    )}
                                </div>

                                {/* Engagement Metrics */}
                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    {/* Active Hours */}
                                    {agent.activeHours !== undefined && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                                <Clock className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-400 font-medium">Horas activas</p>
                                                <p className="text-sm font-bold text-gray-900">{agent.activeHours}h esta semana</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Peak Day and Hour */}
                                    {(agent.peakDay || agent.peakHour) && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                                <TrendingUpIcon className="w-4 h-4 text-purple-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-400 font-medium">Pico de actividad</p>
                                                <p className="text-sm font-bold text-gray-900">
                                                    {agent.peakDay !== 'N/A' && agent.peakDay}
                                                    {agent.peakDay !== 'N/A' && agent.peakHour !== 'N/A' && ' • '}
                                                    {agent.peakHour !== 'N/A' && agent.peakHour}
                                                    {agent.peakDay === 'N/A' && agent.peakHour === 'N/A' && 'Sin datos'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Channel Distribution */}
                                    {agent.channelDistribution && agent.channelDistribution.length > 0 && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                                <Smartphone className="w-4 h-4 text-green-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-400 font-medium mb-1.5">Canales principales</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {agent.channelDistribution.slice(0, 3).map((channel: any, idx: number) => {
                                                        const channelNames: Record<string, string> = {
                                                            WHATSAPP: 'WhatsApp',
                                                            INSTAGRAM: 'Instagram',
                                                            MESSENGER: 'Messenger',
                                                            WEBCHAT: 'Web'
                                                        }
                                                        return (
                                                            <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg">
                                                                <span className="text-xs font-bold text-gray-700">{channelNames[channel.type] || channel.type}</span>
                                                                <span className="text-xs font-bold text-[#21AC96]">{channel.percentage}%</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center py-12 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
                        <Bot className="w-16 h-16 text-gray-200 mb-4" />
                        <h4 className="text-gray-600 font-extrabold text-lg mb-1">No hay agentes activos</h4>
                        <p className="text-sm text-gray-400 font-medium max-w-xs">Crea tu primer agente para empezar a ver sus estadísticas aquí.</p>
                    </div>
                )}
            </div>

            {/* Conversations Day Modal */}
            {selectedDate && (
                <ConversationsDayModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    conversations={conversations}
                    date={selectedDate}
                    isLoading={isLoadingConversations}
                />
            )}

            {/* Credits Details Modal */}
            <CreditsDetailsModal
                isOpen={isCreditsModalOpen}
                onClose={() => setIsCreditsModalOpen(false)}
                creditsData={creditsData}
                isLoading={isLoadingCredits}
            />

            {/* Response Rate Details Modal */}
            <ResponseRateDetailsModal
                isOpen={isResponseModalOpen}
                onClose={() => setIsResponseModalOpen(false)}
                responseData={responseData}
                isLoading={isLoadingResponse}
            />
        </div>
    );
}
