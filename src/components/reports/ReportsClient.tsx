'use client';

import React, { useMemo } from 'react';
import {
    BarChart3,
    PieChart,
    TrendingUp,
    Users,
    Calendar,
    Lock,
    Sparkles,
    Target,
    Zap,
    MousePointer2,
    MessageSquare,
    Clock
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart as RePieChart,
    Pie,
    AreaChart,
    Area,
    FunnelChart,
    Funnel,
    LabelList
} from 'recharts';
import { cn } from '@/lib/utils';

interface ReportsClientProps {
    workspaceInfo: any;
    customFieldsData: any[];
    funnelData: any;
    heatmapData: number[][];
    agentPerformance: any[];
}

const COLORS = ['#21AC96', '#6366F1', '#A855F7', '#EC4899', '#F59E0B', '#10B981'];

export function ReportsClient({
    workspaceInfo,
    customFieldsData,
    funnelData,
    heatmapData,
    agentPerformance
}: ReportsClientProps) {
    const plan = workspaceInfo.plan?.type || 'FRESHIE';

    // Feature access levels
    const access = {
        heatmap: plan !== 'FRESHIE',
        agentBench: plan !== 'FRESHIE',
        dataInsights: plan === 'WOLF_OF_WALLSTREET' || plan === 'CUSTOM'
    };

    const funnelChartData = [
        { name: 'Chats Totales', value: funnelData.interactions, fill: '#E0F2F1' },
        { name: 'Comprometidos', value: funnelData.engaged, fill: '#B2DFDB' },
        { name: 'Contactos', value: funnelData.leads, fill: '#4DB6AC' },
        { name: 'Cualificados', value: funnelData.qualified, fill: '#00897B' },
    ];

    const FeatureLock = ({ children, isLocked, title }: { children: React.ReactNode, isLocked: boolean, title: string }) => (
        <div className="relative h-full">
            {children}
            {isLocked && (
                <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-white/40 flex flex-col items-center justify-center rounded-3xl p-6 text-center border border-white/20">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-4 transform -rotate-6 group-hover:rotate-0 transition-transform duration-500">
                        <Lock className="w-8 h-8 text-[#21AC96]" />
                    </div>
                    <h4 className="text-gray-900 font-bold text-lg mb-2">Desbloquea {title}</h4>
                    <p className="text-gray-500 text-sm max-w-[240px] mb-6 font-medium">
                        Actualiza tu plan para acceder a analíticas avanzadas de última generación.
                    </p>
                    <button className="bg-[#21AC96] text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:scale-105 transition-all">
                        Mejorar Plan
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in p-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight">Reporting Hub</h1>
                        <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                            plan === 'FRESHIE' ? "bg-blue-50 text-blue-600" :
                                plan === 'MONEY_HONEY' ? "bg-purple-50 text-purple-600" :
                                    "bg-amber-50 text-amber-600"
                        )}>
                            <Zap className="w-3 h-3" />
                            PLAN {workspaceInfo.plan?.name || plan}
                        </div>
                    </div>
                    <p className="text-gray-500 font-medium max-w-2xl">
                        Análisis estratégico de la operación. Descubre la inteligencia capturada por tus agentes y optimiza tu funnel de ventas.
                    </p>
                </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* 1. Funnel Section (Available for all) */}
                <div className="lg:col-span-4 bg-white rounded-[32px] border border-gray-100 p-8 shadow-xl shadow-gray-200/20 relative overflow-hidden group">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#21AC96]/5 rounded-full blur-3xl group-hover:bg-[#21AC96]/10 transition-all duration-700"></div>

                    <div className="flex items-center justify-between mb-8 relative">
                        <div>
                            <h3 className="text-gray-900 font-bold text-xl tracking-tight mb-1">Funnel de Conversión</h3>
                            <p className="text-xs text-gray-400 font-medium">Flujo desde primer chat hasta lead calificado</p>
                        </div>
                        <div className="w-12 h-12 bg-[#21AC96]/5 rounded-2xl flex items-center justify-center text-[#21AC96]">
                            <Target className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="h-[400px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <FunnelChart>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: '600' }}
                                />
                                <Funnel
                                    dataKey="value"
                                    data={funnelChartData}
                                    isAnimationActive
                                >
                                    <LabelList position="right" fill="#374151" stroke="none" dataKey="name" fontSize={12} offset={20} fontWeight="bold" />
                                </Funnel>
                            </FunnelChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-50">
                        <div className="p-4 bg-gray-50 rounded-2xl">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Conversión</span>
                            <span className="text-2xl font-extrabold text-[#21AC96]">
                                {funnelData.interactions > 0 ? Math.round((funnelData.leads / funnelData.interactions) * 100) : 0}%
                            </span>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Calificación</span>
                            <span className="text-2xl font-extrabold text-blue-600">
                                {funnelData.leads > 0 ? Math.round((funnelData.qualified / funnelData.leads) * 100) : 0}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Agent Benchmarking (Locked for Freshie) */}
                <div className="lg:col-span-8 bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden group min-h-[500px]">
                    <FeatureLock isLocked={!access.agentBench} title="Performance de Agentes">
                        <div className="p-8 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-gray-900 font-bold text-xl tracking-tight mb-1">Eficiencia por Agente</h3>
                                    <p className="text-xs text-gray-400 font-medium">Comparativa de captura de leads por cada bot</p>
                                </div>
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                    <BarChart3 className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="flex-1 min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={agentPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }}
                                            dy={10}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: '#F9FAFB' }}
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="leadsCaptured" name="Leads Captados" radius={[10, 10, 0, 0]} barSize={40}>
                                            {agentPerformance.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mt-8 overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-widest border-b border-gray-50 pb-4">
                                            <th className="pb-4">Agente</th>
                                            <th className="pb-4 text-center">Total Chats</th>
                                            <th className="pb-4 text-center">Leads</th>
                                            <th className="pb-4 text-center">Eficiencia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {agentPerformance.map((agent, i) => (
                                            <tr key={agent.id} className="group/row hover:bg-gray-50 transition-colors">
                                                <td className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                                        <span className="font-bold text-gray-900">{agent.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 text-center font-medium text-gray-500">{agent.totalChats}</td>
                                                <td className="py-4 text-center font-medium text-gray-500">{agent.leadsCaptured}</td>
                                                <td className="py-4 text-center">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-50 text-green-600 text-[10px] font-bold">
                                                        {agent.efficiency}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </FeatureLock>
                </div>

                {/* 3. Heatmap of Activity (Locked for Freshie) */}
                <div className="lg:col-span-5 bg-white rounded-[32px] border border-gray-100 p-8 shadow-xl shadow-gray-200/20 group min-h-[400px]">
                    <FeatureLock isLocked={!access.heatmap} title="Mapa de Calor de Captación">
                        <div className="h-full flex flex-col">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-gray-900 font-bold text-xl tracking-tight mb-1">Momentos de Oro</h3>
                                    <p className="text-xs text-gray-400 font-medium">Cuándo tus bots capturan más leads (últimos 30 días)</p>
                                </div>
                                <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-600">
                                    <Clock className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="flex-1">
                                <div
                                    className="grid gap-1 h-32"
                                    style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
                                >
                                    {/* Heatmap implementation */}
                                    {heatmapData.map((dayRow, dayIdx) => (
                                        <React.Fragment key={dayIdx}>
                                            {dayRow.map((count, hourIdx) => {
                                                const intensity = Math.min(count * 20, 100);
                                                return (
                                                    <div
                                                        key={`${dayIdx}-${hourIdx}`}
                                                        className="rounded-sm transition-all hover:scale-125 hover:z-20 cursor-help group/cell relative"
                                                        style={{
                                                            backgroundColor: count === 0 ? '#F9FAFB' : `rgba(33, 172, 150, ${intensity / 100})`,
                                                            minHeight: '12px'
                                                        }}
                                                    >
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover/cell:opacity-100 pointer-events-none whitespace-nowrap z-30 transition-all font-bold">
                                                            {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'][dayIdx]} @ {hourIdx}:00 — {count} leads
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </React.Fragment>
                                    ))}
                                </div>
                                <div className="flex justify-between mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    <span>00:00</span>
                                    <span>Mediodía</span>
                                    <span>23:59</span>
                                </div>
                            </div>
                        </div>
                    </FeatureLock>
                </div>

                {/* 4. Data Insights (Locked for Wolf) */}
                <div className="lg:col-span-7 bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden group min-h-[400px]">
                    <FeatureLock isLocked={!access.dataInsights} title="Data Intelligence (BI)">
                        <div className="p-8 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-gray-900 font-bold text-xl tracking-tight mb-1">Inteligencia de Datos</h3>
                                    <p className="text-xs text-gray-400 font-medium">Distribución de valores en tus campos personalizados</p>
                                </div>
                                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                                {customFieldsData.length > 0 ? customFieldsData.slice(0, 2).map((field, i) => (
                                    <div key={field.key} className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-1.5 h-6 bg-[#21AC96] rounded-full"></div>
                                            <span className="font-bold text-gray-900">{field.label}</span>
                                        </div>
                                        <div className="h-[200px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={field.data} layout="vertical" margin={{ left: -20 }}>
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
                                                    <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                                    <Bar dataKey="count" fill="#21AC96" radius={[0, 4, 4, 0]} barSize={20} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-200">
                                            <MousePointer2 className="w-8 h-8" />
                                        </div>
                                        <p className="text-gray-400 font-medium">No hay datos suficientes para generar insights cualitativos.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </FeatureLock>
                </div>
            </div>
        </div>
    );
}
