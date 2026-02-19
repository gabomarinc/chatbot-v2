'use client';

import React, { useMemo, useState } from 'react';
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
    Clock,
    ShieldCheck,
    Lightbulb,
    ArrowRight,
    Search,
    ChevronRight,
    UserCheck,
    Smartphone,
    X,
    Info,
    CheckCircle2,
    BarChart as BarChartIcon,
    Activity,
    Globe,
    ZapOff,
    Trophy,
    TrendingDown,
    Zap as ZapIcon
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
    FunnelChart,
    Funnel,
    LabelList,
    PieChart as RechartsPieChart,
    Pie
} from 'recharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface ReportsClientProps {
    workspaceInfo: any;
    customFieldsData: any[];
    funnelData: any;
    heatmapData: number[][];
    agentPerformance: any[];
    channelDistribution: any[];
    retentionRate: { rate: number; trend: number };
}

const COLORS = ['#21AC96', '#6366F1', '#A855F7', '#EC4899', '#F59E0B', '#10B981'];

export function ReportsClient({
    workspaceInfo,
    customFieldsData,
    funnelData,
    heatmapData,
    agentPerformance,
    channelDistribution,
    retentionRate
}: ReportsClientProps) {
    const plan = workspaceInfo.plan?.type || 'FRESHIE';
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

    // Feature access levels
    const access = {
        heatmap: plan !== 'FRESHIE',
        agentBench: plan !== 'FRESHIE',
        dataInsights: plan === 'WOLF_OF_WALLSTREET' || plan === 'CUSTOM'
    };

    const funnelChartData = [
        { id: 'chats', name: 'Chats', value: funnelData.interactions, fill: '#E0F2F1', desc: 'Total de conversaciones iniciadas por usuarios en todos tus canales conectados.' },
        { id: 'engagement', name: 'Interacción', value: funnelData.engaged, fill: '#B2DFDB', desc: 'Conversaciones donde el usuario envió al menos un mensaje después del saludo inicial.' },
        { id: 'leads', name: 'Leads', value: funnelData.leads, fill: '#4DB6AC', desc: 'Contactos únicos creados automáticamente cuando la IA identifica datos de contacto.' },
        { id: 'qualified', name: 'Cualificados', value: funnelData.qualified, fill: '#00897B', desc: 'Leads que han completado campos adicionales de perfil (presupuesto, zona, etc).' },
    ];

    // Channel data from props with colors
    const colorsMap: Record<string, string> = {
        'WEBCHAT': '#21AC96',
        'WHATSAPP': '#25D366',
        'INSTAGRAM': '#E4405F',
        'MESSENGER': '#0084FF'
    };

    const channelData = useMemo(() => {
        if (!channelDistribution || channelDistribution.length === 0) {
            return [
                { name: 'Sin Datos', value: 100, color: '#F3F4F6' }
            ];
        }
        return channelDistribution.map(d => ({
            name: d.name,
            value: d.percentage,
            color: colorsMap[d.name] || '#6366F1'
        }));
    }, [channelDistribution]);

    // AI Tips Logic
    const aiTips = useMemo(() => {
        const tips = [];
        if (funnelData.interactions > 0 && (funnelData.leads / funnelData.interactions) < 0.2) {
            tips.push({
                icon: Target,
                title: "Optimiza la Captura",
                desc: "Tu bot tiene muchos chats pero pocos leads. Prueba a pedir los datos (email/tel) más temprano en la conversación.",
                color: "text-amber-600",
                bg: "bg-amber-50"
            });
        } else if (funnelData.leads > 0) {
            tips.push({
                icon: UserCheck,
                title: "Alta Conversión",
                desc: "¡Excelente! Tu tasa de conversión es superior al promedio. Considera aumentar el tráfico a tus canales.",
                color: "text-green-600",
                bg: "bg-green-50"
            });
        }

        if (agentPerformance.some(a => (a.efficiency || 0) < 30)) {
            tips.push({
                icon: Sparkles,
                title: "Mejora el Entrenamiento",
                desc: "Algunos agentes tienen baja eficiencia. Revisa sus fuentes de conocimiento para que den respuestas más precisas.",
                color: "text-blue-600",
                bg: "bg-blue-50"
            });
        }

        tips.push({
            icon: Smartphone,
            title: "Tip Omnicanal",
            desc: "WhatsApp suele convertir 3x más que el Webchat. ¿Ya conectaste tu número oficial?",
            color: "text-purple-600",
            bg: "bg-purple-50"
        });

        return tips.slice(0, 3);
    }, [funnelData, agentPerformance]);

    const FeatureLock = ({ children, isLocked, title }: { children: React.ReactNode, isLocked: boolean, title: string }) => (
        <div className="relative flex-1 flex flex-col isolation-auto">
            <div className={cn("flex-1 flex flex-col", isLocked && "pointer-events-none")}>
                {children}
            </div>
            {isLocked && (
                <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center p-12 text-center bg-white/60 backdrop-blur-[12px] overflow-hidden rounded-[40px] border border-white/40 shadow-inner">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div className="relative z-[21] flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-4 transform -rotate-6 transition-transform duration-500 hover:rotate-0 border border-gray-100">
                            <Lock className="w-8 h-8 text-[#21AC96]" />
                        </div>
                        <h4 className="text-gray-900 font-bold text-lg mb-2">Desbloquea {title}</h4>
                        <p className="text-gray-500 text-sm max-w-[240px] mb-6 font-medium leading-relaxed">
                            Esta analítica profunda es exclusiva para planes superiores. ¡Lleva tu negocio al siguiente nivel!
                        </p>
                        <Link href="/billing" className="bg-[#21AC96] text-white px-8 py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:scale-105 transition-all inline-block active:scale-95">
                            Mejorar Plan
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );

    const MetricDetailModal = () => {
        if (!selectedMetric) return null;
        const metric = funnelChartData.find(m => m.id === selectedMetric);
        if (!metric) return null;

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
                <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedMetric(null)}></div>
                <div className="bg-white rounded-[40px] w-full max-w-lg relative z-[101] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-[#21AC96]/10 rounded-2xl flex items-center justify-center text-[#21AC96]">
                                    <BarChartIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-gray-900 font-black text-2xl">{metric.name}</h3>
                                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Definición de Métrica</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMetric(null)}
                                className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                <p className="text-gray-700 font-medium leading-relaxed italic">
                                    "{metric.desc}"
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#21AC96]" /> ¿Cómo mejorar esto?
                                </h4>
                                <ul className="space-y-3">
                                    {selectedMetric === 'chats' && (
                                        <>
                                            <li className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#21AC96] mt-2 shrink-0"></div>
                                                Optimiza la burbuja del widget para que sea más llamativa con un mensaje claro.
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#21AC96] mt-2 shrink-0"></div>
                                                Asegúrate de que tus enlaces de WhatsApp e Instagram estén visibles en tus redes.
                                            </li>
                                        </>
                                    )}
                                    {selectedMetric === 'leads' && (
                                        <>
                                            <li className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#21AC96] mt-2 shrink-0"></div>
                                                Configura el bot para que pregunte por el nombre y correo en los primeros 3 mensajes.
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#21AC96] mt-2 shrink-0"></div>
                                                Usa una oferta de valor (Lead Magnet) para incentivar al usuario a dejar sus datos.
                                            </li>
                                        </>
                                    )}
                                    {(selectedMetric === 'engagement' || selectedMetric === 'qualified') && (
                                        <>
                                            <li className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#21AC96] mt-2 shrink-0"></div>
                                                Refina el prompt de tu agente para que sea más persuasivo y haga preguntas abiertas.
                                            </li>
                                            <li className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#21AC96] mt-2 shrink-0"></div>
                                                Añade más fuentes de conocimiento para que el bot resuelva dudas complejas sin trabarse.
                                            </li>
                                        </>
                                    )}
                                </ul>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedMetric(null)}
                            className="w-full mt-10 bg-gray-900 text-white rounded-2xl py-4 font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in p-6 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-gray-900 text-4xl font-black tracking-tight">Reporting Hub</h1>
                        <div className={cn(
                            "px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm border",
                            plan === 'FRESHIE' ? "bg-white text-blue-600 border-blue-100" :
                                plan === 'MONEY_HONEY' ? "bg-white text-purple-600 border-purple-100" :
                                    "bg-white text-amber-600 border-amber-100"
                        )}>
                            <div className={cn("w-2 h-2 rounded-full animate-pulse",
                                plan === 'FRESHIE' ? "bg-blue-600" :
                                    plan === 'MONEY_HONEY' ? "bg-purple-600" : "bg-amber-600"
                            )}></div>
                            PLAN {workspaceInfo.plan?.name || plan}
                        </div>
                    </div>
                    <p className="text-gray-500 font-medium max-w-2xl text-lg">
                        Visualiza el impacto real de tu IA en el crecimiento de tu negocio.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Estado Global</span>
                        <span className="text-green-500 font-bold flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4" /> Operativo
                        </span>
                    </div>
                </div>
            </div>

            {/* AI Insights Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {aiTips.map((tip, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className={cn("absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-2xl opacity-10 transition-all group-hover:scale-150", tip.bg)}></div>
                        <div className="flex items-start gap-4 relative">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", tip.bg, tip.color)}>
                                <tip.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-gray-900 font-bold text-base mb-1">{tip.title}</h4>
                                <p className="text-gray-500 text-xs leading-relaxed font-medium">{tip.desc}</p>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <Lightbulb className="w-3 h-3 text-amber-400" /> IA Insight
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#21AC96] group-hover:translate-x-1 transition-all" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* 1. Funnel Section */}
                <div className="lg:col-span-12 xl:col-span-4 bg-white rounded-[40px] border border-gray-100 p-8 shadow-xl shadow-gray-200/20 relative overflow-hidden group border-b-4 border-b-[#21AC96]">
                    <div className="absolute top-0 right-0 p-8">
                        <div className="w-12 h-12 bg-[#21AC96]/5 rounded-2xl flex items-center justify-center text-[#21AC96] group-hover:rotate-12 transition-transform">
                            <Target className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="mb-4 relative">
                        <h3 className="text-gray-900 font-black text-2xl tracking-tight mb-1">Tu Funnel de Ventas</h3>
                        <p className="text-sm text-gray-400 font-medium tracking-tight">Analítica de captación en tiempo real.</p>
                    </div>

                    <div className="h-[400px] w-full mt-4 cursor-pointer">
                        <ResponsiveContainer width="100%" height="100%">
                            <FunnelChart onClick={(data: any) => {
                                if (data && data.activePayload && data.activePayload.length > 0) {
                                    setSelectedMetric(data.activePayload[0].payload.id);
                                }
                            }}>
                                <Tooltip
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '16px' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                    cursor={{ fill: 'rgba(33, 172, 150, 0.05)' }}
                                />
                                <Funnel dataKey="value" data={funnelChartData} isAnimationActive>
                                    <LabelList position="right" fill="#6B7280" stroke="none" dataKey="name" fontSize={11} offset={15} fontWeight="800" />
                                </Funnel>
                            </FunnelChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Funnel Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        {[
                            { id: 'leads', label: 'Tasa Captura', val: funnelData.interactions > 0 ? ((funnelData.leads / funnelData.interactions) * 100).toFixed(1) : 0, color: 'text-[#21AC96]', bg: 'bg-[#21AC96]/5' },
                            { id: 'qualified', label: 'Calificación', val: funnelData.leads > 0 ? ((funnelData.qualified / funnelData.leads) * 100).toFixed(1) : 0, color: 'text-indigo-600', bg: 'bg-indigo-50' }
                        ].map((m, i) => (
                            <button key={i} onClick={() => setSelectedMetric(m.id)} className={cn("p-5 rounded-[2rem] transition-all hover:scale-105 text-left border-none cursor-pointer", m.bg)}>
                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">{m.label} <Info className="w-2.5 h-2.5 inline-block opacity-40 ml-1" /></span>
                                <span className={cn("text-3xl font-black tracking-tighter", m.color)}>{m.val}%</span>
                            </button>
                        ))}
                    </div>

                    {/* Strategy & Benchmark Section */}
                    {(() => {
                        const captureRate = funnelData.interactions > 0 ? (funnelData.leads / funnelData.interactions) * 100 : 0;
                        const industryAvg = 35;
                        const performanceVsIndustry = captureRate - industryAvg;
                        const isSuperior = performanceVsIndustry > 0;

                        return (
                            <div className="mt-8 pt-8 border-t border-gray-50 space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Benchmark vs Industria</span>
                                    <Trophy className={cn("w-4 h-4", isSuperior ? "text-amber-500" : "text-gray-300")} />
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[11px] font-bold">
                                            <span className="text-gray-500">Tu Desempeño</span>
                                            <span className={isSuperior ? "text-[#21AC96]" : "text-amber-500"}>
                                                {isSuperior ? 'Superior' : 'En Crecimiento'}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden relative">
                                            <div
                                                className={cn("absolute top-0 left-0 h-full rounded-full transition-all duration-1000", isSuperior ? "bg-[#21AC96]" : "bg-amber-400")}
                                                style={{ width: `${Math.min(captureRate, 100)}%` }}
                                            ></div>
                                            <div className="absolute top-0 left-[35%] h-full w-0.5 bg-gray-300 z-10"></div>
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase tracking-tight">
                                            <span>Incio</span>
                                            <span>Media Sectorial (35%)</span>
                                            <span>Meta</span>
                                        </div>
                                    </div>

                                    <div className={cn("rounded-2xl p-4 border", isSuperior ? "bg-gradient-to-br from-indigo-50 to-white border-indigo-100/50" : "bg-gray-50 border-gray-100")}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <ZapIcon className={cn("w-3 h-3", isSuperior ? "text-indigo-500 fill-indigo-500" : "text-gray-400")} />
                                            <span className={cn("text-[10px] font-black uppercase tracking-widest", isSuperior ? "text-indigo-600" : "text-gray-500")}>Estrategia de Crecimiento</span>
                                        </div>
                                        <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                                            {isSuperior
                                                ? `Estás un **${Math.abs(performanceVsIndustry).toFixed(0)}% por encima** de la media global. Para mantener este ritmo, podrías activar recordatorios automáticos.`
                                                : `Tu tasa actual es del **${captureRate.toFixed(1)}%**. Para alcanzar la media del sector (35%), intenta optimizar los mensajes de bienvenida de tus agentes.`}
                                        </p>
                                    </div>

                                    {/* Additional Visualization: Peak Conversion Days */}
                                    <div className="pt-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest text-left">Días de Alta Conversión</span>
                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                        </div>
                                        <div className="space-y-3">
                                            {(() => {
                                                const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                                                const dailyTotals = heatmapData.map((day, i) => ({
                                                    name: dayNames[i],
                                                    total: day.reduce((a, b) => a + b, 0)
                                                }));
                                                const maxLeads = Math.max(...dailyTotals.map(d => d.total), 1);

                                                return dailyTotals
                                                    .sort((a, b) => b.total - a.total)
                                                    .slice(0, 3)
                                                    .map((day, idx) => (
                                                        <div key={idx} className="space-y-1">
                                                            <div className="flex justify-between text-[11px] font-bold text-gray-700">
                                                                <span>{day.name}</span>
                                                                <span className="text-gray-400">{day.total} leads</span>
                                                            </div>
                                                            <div className="h-1 bg-gray-50 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-[#21AC96] rounded-full opacity-70 transition-all duration-1000"
                                                                    style={{ width: `${(day.total / maxLeads) * 100}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    ));
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* 2. Advanced Insights Section */}
                <div className="lg:col-span-12 xl:col-span-8 space-y-8">

                    {/* Global Health & Distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-xl shadow-gray-200/20 relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-gray-900 font-black text-xl tracking-tight">Salud del Canal</h3>
                                    <p className="text-xs text-gray-400 font-medium tracking-tight">Distribución de tráfico por red</p>
                                </div>
                                <Activity className="w-6 h-6 text-[#21AC96] animate-pulse" />
                            </div>

                            <div className="flex items-center gap-8 h-48">
                                <div className="w-1/2 h-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPieChart>
                                            <Pie
                                                data={channelData}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={8}
                                                dataKey="value"
                                            >
                                                {channelData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </RechartsPieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-1/2 space-y-3">
                                    {channelData.map((channel, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: channel.color }}></div>
                                                <span className="text-xs font-bold text-gray-600">{channel.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-gray-900">{channel.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-xl shadow-gray-200/20 relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-gray-900 font-black text-xl tracking-tight">Retención IA</h3>
                                    <p className="text-xs text-gray-400 font-medium tracking-tight">Usuarios que vuelven a hablar</p>
                                </div>
                                <Users className="w-6 h-6 text-indigo-500" />
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-end gap-2">
                                    <span className="text-5xl font-black text-gray-900 tracking-tighter">{retentionRate.rate}%</span>
                                    <span className={cn(
                                        "font-black text-sm mb-2 flex items-center gap-1",
                                        retentionRate.trend >= 0 ? "text-green-500" : "text-red-500"
                                    )}>
                                        {retentionRate.trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                        {retentionRate.trend >= 0 ? '+' : ''}{retentionRate.trend}%
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                    De cada 100 usuarios, **{Math.round(retentionRate.rate)} vuelven** a interactuar con tu marca. Esto indica el nivel de fidelidad de tus clientes con la IA.
                                </p>
                                <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${retentionRate.rate}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Table Section */}
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden group min-h-[500px] relative flex flex-col">
                        <FeatureLock isLocked={!access.agentBench} title="Comparativa de Agentes">
                            <div className="p-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                    <div>
                                        <h3 className="text-gray-900 font-black text-2xl tracking-tight mb-1">Efectividad por Agente</h3>
                                        <p className="text-sm text-gray-400 font-medium">Comportamiento en vivo de tu equipo digital</p>
                                    </div>
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Filtrar agentes..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-[#21AC96]/20 outline-none w-full md:w-48 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-[10px] text-gray-400 font-black uppercase tracking-widest border-b border-gray-50">
                                                <th className="pb-4 text-left">Ranking / Agente</th>
                                                <th className="pb-4 text-center">Interacciones</th>
                                                <th className="pb-4 text-center">Leads</th>
                                                <th className="pb-4 text-right">Efectividad</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {agentPerformance.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())).map((agent, i) => (
                                                <tr key={agent.id} className="group/row hover:bg-gray-50/80 transition-all cursor-pointer">
                                                    <td className="py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center font-black text-xs text-gray-400 border border-gray-100 group-hover/row:bg-[#21AC96] group-hover/row:text-white transition-colors">
                                                                {i + 1}
                                                            </div>
                                                            <span className="font-extrabold text-gray-900">{agent.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-sm font-bold text-gray-900">{agent.totalChats}</span>
                                                            <div className="w-16 h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                                                                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(agent.totalChats * 2, 100)}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 text-center">
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-xl text-xs font-black">
                                                            <Users className="w-3 h-3" /> {agent.leadsCaptured}
                                                        </span>
                                                    </td>
                                                    <td className="py-5 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-sm font-black text-[#21AC96]">{agent.efficiency}%</span>
                                                            <span className="text-[9px] text-gray-400 font-bold uppercase">Tasa Conversión</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </FeatureLock>
                    </div>

                    {/* Bottom Split: Heatmap & BI Insights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Heatmap Card */}
                        <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/20 group h-[380px] relative overflow-hidden flex flex-col">
                            <FeatureLock isLocked={!access.heatmap} title="Mapa de Actividad 24/7">
                                <div className="p-8 h-full flex flex-col">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-gray-900 font-black text-xl tracking-tight">Actividad 24/7</h3>
                                        <Clock className="w-6 h-6 text-pink-500" />
                                    </div>

                                    <div
                                        className="grid gap-1.5 h-32"
                                        style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
                                    >
                                        {heatmapData.map((dayRow, dayIdx) => (
                                            <React.Fragment key={dayIdx}>
                                                {dayRow.map((count, hourIdx) => {
                                                    const intensity = Math.min(count * 25, 100);
                                                    return (
                                                        <div
                                                            key={`${dayIdx}-${hourIdx}`}
                                                            className="rounded-[2px] transition-all hover:scale-150 hover:z-20 cursor-help group/cell relative"
                                                            style={{
                                                                backgroundColor: count === 0 ? '#F9FAFB' : `rgba(33, 172, 150, ${Math.max(0.1, intensity / 100)})`
                                                            }}
                                                        >
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/cell:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-all font-black shadow-2xl">
                                                                {['D', 'L', 'M', 'X', 'J', 'V', 'S'][dayIdx]} @ {hourIdx}:00h — {count} Leads
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-6 px-1">
                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">00:00</span>
                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Mediodía</span>
                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">23:59</span>
                                    </div>
                                </div>
                            </FeatureLock>
                        </div>

                        {/* BI Insights Card */}
                        <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/20 group h-[380px] overflow-hidden relative flex flex-col">
                            <FeatureLock isLocked={!access.dataInsights} title="BI: Inteligencia Cualitativa">
                                <div className="p-8 h-full flex flex-col">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-gray-900 font-black text-xl tracking-tight">Segmentación</h3>
                                        <PieChart className="w-6 h-6 text-amber-500" />
                                    </div>

                                    <div className="space-y-6">
                                        {customFieldsData.length > 0 ? customFieldsData.slice(0, 2).map((field, i) => (
                                            <div key={field.key}>
                                                <div className="flex items-center justify-between mb-3 px-1">
                                                    <span className="text-sm font-extrabold text-gray-700">{field.label}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">{field.total} entradas</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {field.data.slice(0, 3).map((item: any, idx: number) => (
                                                        <div key={idx} className="relative h-7 bg-gray-50 rounded-lg overflow-hidden group/bar">
                                                            <div
                                                                className="absolute top-0 left-0 h-full bg-amber-100 transition-all duration-1000"
                                                                style={{ width: `${(item.count / field.total) * 100}%` }}
                                                            ></div>
                                                            <div className="relative h-full flex items-center justify-between px-3">
                                                                <span className="text-[11px] font-bold text-gray-700 truncate max-w-[140px]">{item.label}</span>
                                                                <span className="text-[11px] font-black text-amber-600">{Math.round((item.count / field.total) * 100)}%</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="flex flex-col items-center justify-center h-48 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                                <MousePointer2 className="w-8 h-8 text-gray-300 mb-3" />
                                                <p className="text-gray-400 text-xs font-medium max-w-[180px]">Configura campos personalizados para ver insights cualitativos.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </FeatureLock>
                        </div>
                    </div>
                </div>
            </div>

            <MetricDetailModal />
        </div>
    );
}
