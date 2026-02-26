'use client'

import { useState } from 'react';
import { analyzeWorkspaceInbox, generateEmailRecommendations } from '@/lib/actions/email-analysis';
import { testEmailIMAPConnection, saveWorkspaceEmailIMAPIntegration } from '@/lib/actions/integrations';
import { cn } from '@/lib/utils';
import {
    Mail, BrainCircuit, Sparkles, TrendingUp, AlertCircle,
    Clock, Settings2, RotateCw, Loader2, CheckCircle2,
    ArrowRight, MailSearch, Zap, ShieldCheck, MailOpen,
    LayoutDashboard, Lock, Server, Key, User, Globe, Shield, Save,
    ChevronRight, ChevronLeft, Target, Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { deleteWorkspaceEmailIMAPIntegration } from '@/lib/actions/integrations';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface InboxDashboardClientProps {
    initialIntegration: any;
}

const GREEN = '#21AC96';

export function InboxDashboardClient({ initialIntegration }: InboxDashboardClientProps) {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'config'>('dashboard');
    const [integration, setIntegration] = useState(initialIntegration);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(initialIntegration?.lastAnalysis || null);
    const [lastAnalysisAt, setLastAnalysisAt] = useState<Date | null>(initialIntegration?.lastAnalysisAt ? new Date(initialIntegration.lastAnalysisAt) : null);

    // Form & Wizard state
    const [configStep, setConfigStep] = useState(1);
    const [config, setConfig] = useState({
        host: initialIntegration?.configJson?.host || '',
        port: initialIntegration?.configJson?.port || '993',
        secure: initialIntegration?.configJson?.secure ?? true,
        user: initialIntegration?.configJson?.user || '',
        password: initialIntegration?.configJson?.password || '',
        focusArea: initialIntegration?.configJson?.focusArea || 'Ventas',
        goals: initialIntegration?.configJson?.goals || ''
    });

    const [selectedGoals, setSelectedGoals] = useState<string[]>(
        initialIntegration?.configJson?.goals ? initialIntegration.configJson.goals.split(', ').filter(Boolean) : []
    );

    const goalsByFocus: Record<string, string[]> = {
        'Ventas': [
            'Detectar oportunidades nuevas',
            'Seguimiento de leads',
            'Análisis de objeciones',
            'Identificar intención de compra',
            'Resumen de reuniones comerciales'
        ],
        'Soporte': [
            'Resumir urgencias críticas',
            'Reporte de incidencias',
            'Detectar bugs recurrentes',
            'Clasificación automática de tickets',
            'Análisis de sentimiento del cliente'
        ],
        'Operaciones': [
            'Control de pagos/facturas',
            'Seguimiento de proveedores',
            'Coordinación de logística',
            'Alertas de plazos de entrega',
            'Resumen de reportes operativos'
        ],
        'Personal': [
            'Priorización de networking',
            'Resumen de newsletters',
            'Recordatorios de eventos',
            'Filtro de suscripciones',
            'Organización de viajes/citas'
        ]
    };

    const toggleGoal = (goal: string) => {
        let newGoals: string[];
        if (selectedGoals.includes(goal)) {
            newGoals = selectedGoals.filter(g => g !== goal);
        } else {
            if (selectedGoals.length >= 3) {
                toast.error('Puedes seleccionar hasta 3 objetivos.');
                return;
            }
            newGoals = [...selectedGoals, goal];
        }
        setSelectedGoals(newGoals);
        setConfig({ ...config, goals: newGoals.join(', ') });
    };

    const [selectedBullet, setSelectedBullet] = useState<string | null>(null);
    const [isLoadingRec, setIsLoadingRec] = useState(false);
    const [recommendation, setRecommendation] = useState<string | null>(null);
    const [showRecDialog, setShowRecDialog] = useState(false);

    const isConfigured = integration?.enabled;

    const handleBulletClick = async (text: string) => {
        setSelectedBullet(text);
        setShowRecDialog(true);
        setIsLoadingRec(true);
        setRecommendation(null);
        try {
            const res = await generateEmailRecommendations(text);
            if (res.success && res.content) {
                // Clean markdown from potentially wrapped code blocks
                let cleanContent = res.content.trim();
                if (cleanContent.startsWith('```')) {
                    const lines = cleanContent.split('\n');
                    // Remove first line (like ```markdown) and last line (like ```)
                    if (lines[0].startsWith('```')) lines.shift();
                    if (lines[lines.length - 1].startsWith('```')) lines.pop();
                    cleanContent = lines.join('\n').trim();
                }
                setRecommendation(cleanContent);
            } else if (!res.success) {
                toast.error('Error al generar recomendaciones.');
            }
        } catch (error) {
            toast.error('Error de comunicación con la IA.');
        } finally {
            setIsLoadingRec(false);
        }
    };

    const handleRunAnalysis = async () => {
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const res = await analyzeWorkspaceInbox();
            if (res.success && res.summary) {
                let cleanSummary = res.summary.trim();
                if (cleanSummary.startsWith('```')) {
                    const lines = cleanSummary.split('\n');
                    if (lines[0].startsWith('```')) lines.shift();
                    if (lines[lines.length - 1].startsWith('```')) lines.pop();
                    cleanSummary = lines.join('\n').trim();
                }
                setAnalysisResult(cleanSummary);
                if (res.lastAnalysisAt) setLastAnalysisAt(new Date(res.lastAnalysisAt));
                toast.success('Análisis de inbox completado.');
            } else if (!res.success) {
                toast.error('Error: ' + res.error);
            }
        } catch (error) {
            toast.error('Ocurrió un error inesperado al analizar correos.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        try {
            const res = await testEmailIMAPConnection(config);
            if (res.ok) {
                toast.success('Conexión IMAP exitosa.');
            } else {
                toast.error('Error de conexión: ' + res.error);
            }
        } catch (error) {
            toast.error('Error al probar la conexión.');
        } finally {
            setIsTesting(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const res = await saveWorkspaceEmailIMAPIntegration(config);
            if (res.success) {
                setIntegration(res.integration);
                toast.success('Configuración guardada correctamente.');
                setActiveTab('dashboard');
            } else {
                toast.error('Error al guardar: ' + res.error);
            }
        } catch (error) {
            toast.error('Error inesperado al guardar.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisconnect = async () => {
        setIsDisconnecting(true);
        try {
            const res = await deleteWorkspaceEmailIMAPIntegration();
            if (res.success) {
                setIntegration(null);
                setAnalysisResult(null);
                setLastAnalysisAt(null);
                toast.success('Correo desconectado correctamente.');
                setShowDisconnectDialog(false);
                setActiveTab('config');
            } else {
                toast.error('Error: ' + res.error);
            }
        } catch (error) {
            toast.error('Error al desconectar el correo.');
        } finally {
            setIsDisconnecting(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in p-6 pb-20">
            {/* Header + Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[#21AC96] mb-1">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Inteligencia de Negocio</span>
                    </div>
                    <h1 className="text-gray-900 text-4xl font-black tracking-tight leading-none">Smart Mail</h1>
                    <p className="text-gray-500 font-bold text-lg">
                        {activeTab === 'dashboard'
                            ? 'Analiza patrones y detecta oportunidades en tu inbox.'
                            : 'Configura tu cuenta IMAP para habilitar el análisis basado en IA.'}
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white border border-gray-100 shadow-md shadow-gray-100/60 rounded-[2rem] px-2 py-2 shrink-0 self-start md:self-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-3 select-none">Vista</span>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-[1.5rem] text-sm font-black transition-all duration-300"
                            style={activeTab === 'dashboard'
                                ? { background: '#1e293b', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
                                : { color: '#9ca3af' }}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('config')}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-[1.5rem] text-sm font-black transition-all duration-300"
                            style={activeTab === 'config'
                                ? { background: '#1e293b', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
                                : { color: '#9ca3af' }}
                        >
                            <Settings2 className="w-4 h-4" />
                            Configuración
                        </button>
                    </div>
                </div>
            </div>

            {/* Dashboard View */}
            {activeTab === 'dashboard' && (
                <div className="relative">
                    {/* Blurred Layer if not configured */}
                    <div className={isConfigured ? "" : "blur-md pointer-events-none select-none opacity-40"}>
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                            {[
                                { label: 'Estado', value: isConfigured ? 'Activo' : 'Pendiente', icon: ShieldCheck, color: 'text-green-500', bg: 'bg-green-50' },
                                { label: 'Correos Analizados', value: '30 Recientes', icon: MailSearch, color: 'text-[#21AC96]', bg: 'bg-[#21AC96]/10' },
                                { label: 'Insights Generados', value: '12 Temas', icon: BrainCircuit, color: 'text-purple-500', bg: 'bg-purple-50' },
                                { label: 'Urgencias', value: '0 Críticas', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' }
                            ].map((stat, i) => (
                                <Card key={i} className="p-6 rounded-[2.5rem] border-none shadow-xl shadow-gray-200/20 bg-white group hover:scale-[1.02] transition-all duration-300">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                                            <p className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                                        </div>
                                        <div className={`${stat.bg} ${stat.color} p-4 rounded-[1.5rem] group-hover:rotate-12 transition-all`}>
                                            <stat.icon className="w-6 h-6" />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Main Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <Card className="rounded-[3rem] p-10 border-none shadow-2xl bg-white relative overflow-hidden flex flex-col min-h-[600px]">
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-[#21AC96]/5 rounded-full translate-x-32 -translate-y-32 blur-[80px]"></div>

                                    <div className="flex items-center justify-between mb-10 relative">
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 bg-gray-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl rotate-3 shrink-0">
                                                <Sparkles className="w-8 h-8 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Tu Analista de Inbox</h3>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">IA Personalizada para tu Negocio</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-3">
                                            <Button
                                                onClick={handleRunAnalysis}
                                                disabled={isAnalyzing}
                                                className="bg-gray-900 hover:bg-black text-white rounded-2xl h-14 px-8 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-2xl"
                                            >
                                                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCw className="w-5 h-5" />}
                                                {isAnalyzing ? 'Procesando...' : 'Analizar Correos'}
                                            </Button>

                                            {lastAnalysisAt && !isAnalyzing && (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100 animate-fade-in">
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                        Actualizado hace {formatDistanceToNow(lastAnalysisAt, { locale: es })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 relative">
                                        {analysisResult ? (
                                            <div className="space-y-8 animate-fade-in pb-4">
                                                <div className="bg-gray-50/50 p-8 md:p-12 rounded-[3.5rem] border border-gray-100 shadow-inner relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            h1: ({ node, ...props }) => <h1 className="text-3xl font-black text-gray-900 mb-8 pb-4 border-b-4 border-[#21AC96]/20 inline-block tracking-tight" {...props} />,
                                                            h2: ({ node, ...props }) => <h2 className="text-xl font-black text-gray-800 mt-12 mb-6 flex items-center gap-2 group tracking-tight" {...props} />,
                                                            h3: ({ node, ...props }) => <h3 className="text-lg font-black text-gray-700 mt-8 mb-4 tracking-tight" {...props} />,
                                                            p: ({ node, ...props }) => <p className="text-gray-600 leading-[1.8] font-medium mb-4 text-base" {...props} />,
                                                            ul: ({ node, ...props }) => <ul className="space-y-8 mb-8" {...props} />,
                                                            li: ({ node, ...props }) => {
                                                                // Extract text content safely from React nodes to avoid [object Object]
                                                                const extractText = (children: any): string => {
                                                                    if (typeof children === 'string') return children;
                                                                    if (Array.isArray(children)) return children.map(extractText).join('');
                                                                    if (children?.props?.children) return extractText(children.props.children);
                                                                    return '';
                                                                };
                                                                const textContent = extractText(props.children);

                                                                return (
                                                                    <li
                                                                        onClick={() => handleBulletClick(textContent)}
                                                                        className="flex items-start gap-3 text-gray-600 bg-white/50 p-4 rounded-2xl border border-gray-100/50 shadow-sm hover:shadow-md transition-all cursor-pointer group/item relative overflow-hidden"
                                                                    >
                                                                        <div className="absolute inset-0 bg-[#21AC96]/0 group-hover/item:bg-[#21AC96]/5 transition-colors" />
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#21AC96] mt-[0.6rem] shrink-0 group-hover/item:scale-150 transition-all z-10" />
                                                                        <div className="flex-1 z-10">
                                                                            <span className="font-medium text-[0.95rem]">{props.children}</span>
                                                                            <div className="text-[10px] text-[#21AC96] font-black mt-2 opacity-0 group-hover/item:opacity-100 transition-all flex items-center gap-1.5 uppercase tracking-widest">
                                                                                <Sparkles className="w-3 h-3" /> Ver Inteligencia y Acciones
                                                                            </div>
                                                                        </div>
                                                                    </li>
                                                                );
                                                            },
                                                            strong: ({ node, ...props }) => <strong className="font-black text-gray-900 bg-[#21AC96]/10 px-1 rounded" {...props} />,
                                                            code: ({ node, ...props }) => (
                                                                <code className="bg-gray-100 text-[#21AC96] px-1.5 py-0.5 rounded-md font-mono text-[0.9em]" {...props} />
                                                            ),
                                                            pre: ({ node, ...props }) => (
                                                                <div className="bg-gray-900 rounded-2xl p-6 my-6 overflow-x-auto border border-gray-800 shadow-xl">
                                                                    <pre className="m-0 text-white/90 font-mono text-sm leading-relaxed" {...props} />
                                                                </div>
                                                            ),
                                                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-[#21AC96] pl-6 my-8 italic text-gray-500 font-medium" {...props} />,
                                                        }}
                                                    >
                                                        {analysisResult}
                                                    </ReactMarkdown>
                                                </div>
                                                <div className="flex flex-wrap gap-4">
                                                    <div className="flex-1 bg-green-50 p-6 rounded-[2rem] border border-green-100 flex items-center gap-4 transition-all">
                                                        <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200 shrink-0">
                                                            <TrendingUp className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Oportunidad</p>
                                                            <p className="text-sm font-black text-green-600 tracking-tight">Detectados 4 leads calientes</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 bg-[#21AC96]/5 p-6 rounded-[2rem] border border-[#21AC96]/10 flex items-center gap-4 transition-all">
                                                        <div className="w-12 h-12 bg-[#21AC96] rounded-2xl flex items-center justify-center shadow-lg shadow-[#21AC96]/20 shrink-0">
                                                            <Zap className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-[#21AC96] uppercase tracking-widest">Sugerencia IA</p>
                                                            <p className="text-sm font-black text-[#21AC96] tracking-tight">Redactar respuestas automáticas</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : isAnalyzing ? (
                                            <div className="flex flex-col items-center justify-center h-[450px] space-y-8 animate-pulse">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-[#21AC96]/10 rounded-full blur-3xl animate-pulse scale-150"></div>
                                                    <MailSearch className="w-24 h-24 text-[#21AC96] relative" />
                                                </div>
                                                <div className="text-center space-y-2">
                                                    <p className="text-gray-900 font-black text-xl tracking-tight">Escaneando Inbox...</p>
                                                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Estamos procesando tu inteligencia de negocio</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-[450px] text-center space-y-8">
                                                <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100 shadow-inner">
                                                    <MailOpen className="w-10 h-10 text-gray-300" />
                                                </div>
                                                <div className="space-y-3">
                                                    <h4 className="text-2xl font-black text-gray-900 tracking-tight">Sin análisis reciente</h4>
                                                    <p className="text-gray-400 font-bold max-w-sm mx-auto leading-relaxed text-lg">
                                                        Tu analista IA está listo. Pulsa el botón superior para procesar los últimos 30 correos.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            <div className="space-y-8">
                                <Card className="p-8 rounded-[3rem] bg-gray-900 text-white border-none shadow-2xl relative overflow-hidden h-full">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-20 translate-x-20 blur-3xl"></div>
                                    <div className="relative space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10 shadow-lg">
                                                <Mail className="w-6 h-6 text-[#21AC96]" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#21AC96]">Canal Conectado</p>
                                                <p className="text-lg font-black tracking-tight">{config.host || 'IMAP Server'}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cuenta de Usuario</label>
                                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                                                    <User className="w-4 h-4 text-gray-500" />
                                                    <p className="text-sm font-bold text-gray-300 truncate">{config.user}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cifrado de Datos</label>
                                                <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 flex items-center gap-3">
                                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                                    <p className="text-sm font-black text-green-500">AES-256 GCM Activo</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <Button
                                                onClick={() => setActiveTab('config')}
                                                variant="outline"
                                                className="w-full h-16 rounded-2xl border-gray-200 text-gray-900 font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 transition-all"
                                            >
                                                EDITAR CONFIGURACIÓN
                                            </Button>

                                            <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full h-16 rounded-2xl text-red-500 font-black uppercase tracking-widest text-[10px] hover:bg-red-50 hover:text-red-600 transition-all"
                                                    >
                                                        DESCONECTAR CORREO
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="rounded-[2.5rem] p-10 border-none shadow-2xl bg-white max-w-md">
                                                    <DialogHeader className="space-y-4">
                                                        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-2">
                                                            <AlertCircle className="w-8 h-8" />
                                                        </div>
                                                        <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">¿Desconectar correo?</DialogTitle>
                                                        <DialogDescription className="text-gray-500 font-medium leading-relaxed">
                                                            Esta acción eliminará tu configuración de IMAP y los análisis de IA guardados. Tendrás que configurar todo de nuevo para volver a usar esta sección.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <DialogFooter className="mt-10 gap-3 sm:flex-col lg:flex-row">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setShowDisconnectDialog(false)}
                                                            className="flex-1 h-14 rounded-2xl border-gray-100 font-bold"
                                                        >
                                                            Cancelar
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            onClick={handleDisconnect}
                                                            disabled={isDisconnecting}
                                                            className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-700 font-black uppercase tracking-widest text-[10px]"
                                                        >
                                                            {isDisconnecting ? 'Desconectando...' : 'Confirmar Desconexión'}
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>

                    {/* Lock Overlay if not configured */}
                    {!isConfigured && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center pt-20">
                            <Card className="max-w-md bg-white rounded-[3rem] p-12 border border-gray-100 shadow-[0_32px_80px_rgba(0,0,0,0.15)] flex flex-col items-center text-center gap-8 group animate-scale-up">
                                <div className="w-24 h-24 bg-[#21AC96]/5 rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-[#21AC96]/10 group-hover:scale-110 transition-transform duration-500">
                                    <Lock className="w-10 h-10 text-[#21AC96]" />
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Smart Mail Bloqueado</h2>
                                    <p className="text-gray-400 font-bold text-sm leading-relaxed max-w-[280px]">
                                        Conecta tu cuenta de correo IMAP para que nuestra IA pueda analizar tu bandeja de entrada y generar reportes ejecutivos.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => setActiveTab('config')}
                                    className="h-16 px-10 rounded-[1.5rem] bg-gray-900 text-white font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all w-full flex items-center justify-center gap-3"
                                >
                                    <Settings2 className="w-5 h-5" />
                                    Configurar Correo
                                </Button>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {/* Recommendation Modal */}
            <Dialog open={showRecDialog} onOpenChange={setShowRecDialog}>
                <DialogContent className="rounded-[3.5rem] p-0 border-none shadow-2xl bg-white max-w-3xl overflow-hidden">
                    {/* Modal Header Premium */}
                    <div className="bg-gray-900 p-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#21AC96]/20 rounded-full blur-[80px] -translate-y-24 translate-x-24 animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#21AC96]/10 rounded-full blur-[60px] translate-y-20 -translate-x-10"></div>

                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-[#21AC96] rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-[#21AC96]/30 rotate-3">
                                    <BrainCircuit className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#21AC96] mb-1">Análisis de Punto Clave</p>
                                    <h3 className="text-3xl font-black tracking-tight leading-none text-white">Inteligencia Profunda</h3>
                                </div>
                            </div>
                            <div className="hidden md:flex flex-col items-end">
                                <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#21AC96]">Estado del Agente</p>
                                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <ShieldCheck className="w-3 h-3 text-green-400" /> Analizando contexto...
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                        {/* Summary Reference - More Compact */}
                        <div className="bg-gray-50/80 backdrop-blur-sm p-6 rounded-[2rem] border border-gray-100 flex gap-4 relative group overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#21AC96]" />
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 border border-gray-100">
                                <Mail className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Punto analizado</p>
                                <p className="text-gray-900 font-bold leading-tight text-md">"{selectedBullet}"</p>
                            </div>
                        </div>

                        {isLoadingRec ? (
                            <div className="py-24 flex flex-col items-center justify-center gap-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-[#21AC96]/20 rounded-full blur-3xl animate-ping opacity-50"></div>
                                    <Loader2 className="w-14 h-14 text-[#21AC96] animate-spin relative" />
                                </div>
                                <div className="text-center">
                                    <p className="text-gray-900 font-black text-xl tracking-tight">Generando Recomendaciones...</p>
                                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Nuestra IA está redactando estrategias para ti</p>
                                </div>
                            </div>
                        ) : recommendation ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                {/* Insights & Metrics Panel */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { label: 'Prioridad', value: 'Alta', icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
                                        { label: 'Impacto Comercial', value: 'Crítico', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
                                        { label: 'Categoría', value: config.focusArea, icon: Target, color: 'text-[#21AC96]', bg: 'bg-[#21AC96]/10' }
                                    ].map((stat, i) => (
                                        <div key={i} className={cn("p-5 rounded-3xl border border-gray-50 shadow-sm flex items-center gap-4", stat.bg)}>
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm", stat.color)}>
                                                <stat.icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
                                                <p className={cn("text-sm font-black tracking-tight", stat.color)}>{stat.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Markdown Content Redesign */}
                                <div className="prose prose-teal max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            h1: ({ node, ...props }) => <h1 className="text-xl font-black text-gray-900 mb-10 flex items-center gap-3 underline decoration-[#21AC96]/20 decoration-4 underline-offset-8" {...props}>
                                                <div className="w-1.5 h-6 bg-[#21AC96] rounded-full" /> {props.children}
                                            </h1>,
                                            h2: ({ node, ...props }) => <h2 className="text-lg font-black text-gray-900 mt-16 mb-8 flex items-center gap-2" {...props}>
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#21AC96]" /> {props.children}
                                            </h2>,
                                            p: ({ node, ...props }) => <p className="text-gray-600 leading-[1.8] font-medium mb-6 text-sm" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="space-y-10 mb-12 pl-0 list-none" {...props} />,
                                            li: ({ node, ...props }) => <li className="flex items-start gap-6 text-gray-700 bg-gray-50/50 p-6 md:p-8 rounded-2xl border border-gray-100 group transition-all hover:bg-white hover:shadow-xl hover:-translate-y-1" {...props}>
                                                <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center group-hover:bg-[#21AC96] group-hover:text-white transition-all shrink-0 shadow-sm">
                                                    <ChevronRight className="w-5 h-5" />
                                                </div>
                                                <span className="font-bold text-base leading-relaxed">{props.children}</span>
                                            </li>,
                                            strong: ({ node, ...props }) => <strong className="font-black text-gray-900 bg-[#21AC96]/10 px-1.5 rounded" {...props} />,
                                            code: ({ node, ...props }) => (
                                                <code className="bg-gray-100 text-[#21AC96] px-1.5 py-0.5 rounded-md font-mono text-[0.9em]" {...props} />
                                            ),
                                            pre: ({ node, ...props }) => (
                                                <div className="bg-gray-900 rounded-2xl p-6 my-6 overflow-x-auto border border-gray-800 shadow-xl">
                                                    <pre className="m-0 text-white/90 font-mono text-sm leading-relaxed" {...props} />
                                                </div>
                                            ),
                                            blockquote: ({ node, ...props }) => (
                                                <div className="relative mt-12 mb-8 group">
                                                    <div className="absolute -inset-4 bg-gradient-to-r from-[#21AC96] to-emerald-600 rounded-[2.5rem] blur opacity-15 group-hover:opacity-25 transition duration-1000"></div>
                                                    <div className="relative bg-white p-8 md:p-12 rounded-[2.2rem] border border-gray-50 shadow-2xl overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-6">
                                                            <Sparkles className="w-12 h-12 text-[#21AC96]/10" />
                                                        </div>
                                                        <div className="flex items-center gap-4 mb-8">
                                                            <div className="h-0.5 w-12 bg-[#21AC96]" />
                                                            <span className="text-[10px] font-black text-[#21AC96] uppercase tracking-[0.4em]">Borrador IA Recomendado</span>
                                                        </div>
                                                        <blockquote className="italic font-medium text-gray-700 leading-[2] text-lg border-none p-0 m-0 space-y-4">
                                                            {props.children}
                                                        </blockquote>
                                                        <div className="mt-6 flex justify-end">
                                                            <Button
                                                                onClick={() => {
                                                                    const extractPlainText = (children: any): string => {
                                                                        if (typeof children === 'string') return children;
                                                                        if (Array.isArray(children)) return children.map(extractPlainText).join('');
                                                                        if (children?.props?.children) return extractPlainText(children.props.children);
                                                                        return '';
                                                                    };
                                                                    const textToCopy = extractPlainText(props.children);
                                                                    navigator.clipboard.writeText(textToCopy);
                                                                    toast.success('Borrador copiado al portapapeles');
                                                                }}
                                                                variant="ghost"
                                                                className="text-[#21AC96] font-black text-[10px] uppercase tracking-widest hover:bg-[#21AC96]/5 gap-2 h-8"
                                                            >
                                                                Copiar <Zap className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }}
                                    >
                                        {recommendation}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ) : (
                            <div className="py-24 text-center space-y-6">
                                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-red-100">
                                    <AlertCircle className="w-10 h-10 text-red-500" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-gray-900">Error de Generación</h4>
                                    <p className="text-gray-400 font-bold text-sm max-w-xs mx-auto">
                                        No pudimos establecer comunicación con el núcleo de inteligencia. Por favor, intenta de nuevo.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => handleBulletClick(selectedBullet || "")}
                                    className="bg-gray-900 text-white rounded-2xl px-8 h-12 text-[10px] font-black uppercase tracking-widest"
                                >
                                    Reintentar Análisis
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="p-10 pt-0 flex gap-4">
                        <Button
                            onClick={() => setShowRecDialog(false)}
                            className="flex-1 h-14 rounded-[1.4rem] bg-gray-900 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            Cerrar Inteligencia
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Config View */}
            {activeTab === 'config' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
                    <Card className="rounded-[3rem] p-10 md:p-12 border-none shadow-2xl bg-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-[#21AC96]/5 rounded-full translate-x-40 -translate-y-40 blur-[80px]"></div>

                        <div className="relative space-y-12">
                            {/* Steps Indicator */}
                            <div className="flex items-center justify-center gap-4 border-b border-gray-50 pb-8">
                                {[1, 2, 3].map((step) => (
                                    <div key={step} className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all duration-500",
                                            configStep >= step
                                                ? "bg-[#21AC96] text-white shadow-xl shadow-[#21AC96]/20 scale-110"
                                                : "bg-gray-100 text-gray-400"
                                        )}>
                                            {step}
                                        </div>
                                        {step < 3 && <div className={cn("w-12 h-1 rounded-full", configStep > step ? "bg-[#21AC96]" : "bg-gray-100")} />}
                                    </div>
                                ))}
                            </div>

                            {/* Wizard Steps */}
                            {configStep === 1 && (
                                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 bg-[#21AC96]/10 rounded-3xl flex items-center justify-center text-[#21AC96] mx-auto mb-4">
                                            <Target className="w-8 h-8" />
                                        </div>
                                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Área de Enfoque</h2>
                                        <p className="text-gray-400 font-bold">¿En qué departamento debe centrarse el analista IA?</p>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {['Ventas', 'Soporte', 'Operaciones', 'Personal'].map((area) => (
                                            <button
                                                key={area}
                                                onClick={() => {
                                                    setConfig({ ...config, focusArea: area });
                                                    setSelectedGoals([]);
                                                }}
                                                className={cn(
                                                    "p-6 rounded-3xl border-2 transition-all duration-300 text-center space-y-3 group",
                                                    config.focusArea === area
                                                        ? "border-[#21AC96] bg-[#21AC96]/5 shadow-xl shadow-[#21AC96]/10"
                                                        : "border-gray-100 hover:border-gray-200"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all",
                                                    config.focusArea === area ? "bg-[#21AC96] text-white" : "bg-gray-100 text-gray-400 group-hover:scale-110"
                                                )}>
                                                    {area === 'Ventas' && <TrendingUp className="w-5 h-5" />}
                                                    {area === 'Soporte' && <Settings2 className="w-5 h-5" />}
                                                    {area === 'Operaciones' && <Server className="w-5 h-5" />}
                                                    {area === 'Personal' && <User className="w-5 h-5" />}
                                                </div>
                                                <p className={cn("text-xs font-black uppercase tracking-widest", config.focusArea === area ? "text-[#21AC96]" : "text-gray-400")}>{area}</p>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button
                                            onClick={() => setConfigStep(2)}
                                            className="h-16 px-10 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-[1.02] transition-all"
                                        >
                                            Siguiente Paso <ChevronRight className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {configStep === 2 && (
                                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 bg-[#21AC96]/10 rounded-3xl flex items-center justify-center text-[#21AC96] mx-auto mb-4">
                                            <Lightbulb className="w-8 h-8" />
                                        </div>
                                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Tus Objetivos</h2>
                                        <p className="text-gray-400 font-bold">¿Qué buscas encontrar en tu bandeja de entrada?</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex flex-wrap gap-3 justify-center">
                                            {goalsByFocus[config.focusArea]?.map((goal) => (
                                                <button
                                                    key={goal}
                                                    onClick={() => toggleGoal(goal)}
                                                    className={cn(
                                                        "px-6 py-4 rounded-full border-2 font-bold text-xs uppercase tracking-widest transition-all",
                                                        selectedGoals.includes(goal)
                                                            ? "bg-[#21AC96] border-[#21AC96] text-white shadow-xl shadow-[#21AC96]/10"
                                                            : "border-gray-100 text-gray-400 hover:border-gray-200"
                                                    )}
                                                >
                                                    {goal}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Tus objetivos seleccionados ({selectedGoals.length}/3):</label>
                                            <Input
                                                value={config.goals}
                                                readOnly
                                                placeholder="Selecciona objetivos arriba..."
                                                className="h-16 rounded-2xl border-gray-100 bg-gray-50/50 px-6 font-bold text-sm text-[#21AC96]"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-between pt-4">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setConfigStep(1)}
                                            className="h-16 px-10 rounded-2xl text-gray-500 font-black uppercase tracking-widest text-xs flex items-center gap-2"
                                        >
                                            <ChevronLeft className="w-5 h-5" /> Atrás
                                        </Button>
                                        <Button
                                            onClick={() => setConfigStep(3)}
                                            className="h-16 px-10 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:scale-[1.02] transition-all"
                                        >
                                            Siguiente Paso <ChevronRight className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {configStep === 3 && (
                                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 bg-[#21AC96]/10 rounded-3xl flex items-center justify-center text-[#21AC96] mx-auto mb-4">
                                            <Globe className="w-8 h-8" />
                                        </div>
                                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Conexión IMAP</h2>
                                        <p className="text-gray-400 font-bold">Finalmente, ingresa los datos de tu servidor.</p>
                                    </div>

                                    <form className="grid grid-cols-1 md:grid-cols-2 gap-8" onSubmit={(e) => e.preventDefault()}>
                                        {/* Host */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                                                <Globe className="w-3 h-3" />
                                                Servidor (Host)
                                            </label>
                                            <Input
                                                value={config.host}
                                                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                                                placeholder="imap.tuservidor.com"
                                                className="h-16 rounded-2xl border-gray-100 bg-gray-50/50 px-6 font-bold text-sm focus:ring-4 focus:ring-[#21AC96]/5 transition-all"
                                            />
                                        </div>

                                        {/* Port */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                                                <Globe className="w-3 h-3" />
                                                Puerto
                                            </label>
                                            <Input
                                                value={config.port}
                                                onChange={(e) => setConfig({ ...config, port: e.target.value })}
                                                placeholder="993"
                                                className="h-16 rounded-2xl border-gray-100 bg-gray-50/50 px-6 font-bold text-sm focus:ring-4 focus:ring-[#21AC96]/5 transition-all"
                                            />
                                        </div>

                                        {/* User */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                                                <User className="w-3 h-3" />
                                                Usuario / Email
                                            </label>
                                            <Input
                                                value={config.user}
                                                onChange={(e) => setConfig({ ...config, user: e.target.value })}
                                                placeholder="tu@correo.com"
                                                className="h-16 rounded-2xl border-gray-100 bg-gray-50/50 px-6 font-bold text-sm focus:ring-4 focus:ring-[#21AC96]/5 transition-all"
                                            />
                                        </div>

                                        {/* Password */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                                                <Key className="w-3 h-3" />
                                                Contraseña / App Key
                                            </label>
                                            <Input
                                                type="password"
                                                value={config.password}
                                                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                                                placeholder="••••••••••••"
                                                className="h-16 rounded-2xl border-gray-100 bg-gray-50/50 px-6 font-bold text-sm focus:ring-4 focus:ring-[#21AC96]/5 transition-all"
                                            />
                                        </div>

                                        {/* Secure Switch */}
                                        <div className="md:col-span-2 flex items-center justify-between p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-gray-100">
                                                    <Shield className="w-6 h-6 text-[#21AC96]" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-black text-gray-900 leading-none mb-1">Conexión Segura (SSL/TLS)</p>
                                                    <p className="text-sm text-gray-400 font-bold">Recomendado para servidores modernos.</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={config.secure}
                                                onCheckedChange={(val) => setConfig({ ...config, secure: val })}
                                            />
                                        </div>

                                        {/* Actions */}
                                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                            <div className="flex gap-4">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => setConfigStep(2)}
                                                    className="h-16 flex-1 rounded-2xl text-gray-500 font-black uppercase tracking-widest text-xs"
                                                >
                                                    <ChevronLeft className="w-5 h-5" /> Atrás
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handleTestConnection}
                                                    disabled={isTesting || !config.host || !config.user || !config.password}
                                                    className="h-16 flex-1 rounded-2xl border-gray-100 text-xs font-black uppercase tracking-widest gap-3 hover:bg-gray-50 transition-all shadow-sm"
                                                >
                                                    {isTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCw className="w-5 h-5" />}
                                                    Probar Conexión
                                                </Button>
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={handleSaveConfig}
                                                disabled={isSaving || !config.host || !config.user || !config.password}
                                                className="h-16 rounded-2xl bg-gray-900 text-white px-8 text-xs font-black uppercase tracking-widest gap-3 transition-all shadow-2xl hover:scale-[1.02] active:scale-95"
                                            >
                                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                                Guardar y Activar Smart Mail
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Security Note */}
                    <div className="bg-[#21AC96]/5 p-10 rounded-[3rem] border border-[#21AC96]/10 flex items-center gap-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#21AC96]/5 rounded-full blur-2xl -mr-16 -mt-16"></div>
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-[#21AC96]/10 border border-[#21AC96]/10 shrink-0">
                            <ShieldCheck className="w-8 h-8 text-[#21AC96]" />
                        </div>
                        <div className="relative">
                            <h4 className="text-[#21AC96] font-black text-xl tracking-tight leading-none mb-2">Privacidad Garantizada</h4>
                            <p className="text-[#21AC96]/70 text-sm font-bold leading-relaxed max-w-2xl">
                                Tus credenciales se encriptan bajo el estándar <strong className="text-[#21AC96]">AES-256</strong>. Solo nuestro analista IA accede de forma puntual bajo tu demanda para procesar los resúmenes; nunca se almacenan los cuerpos de los correos permanentemente.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
