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
        goals: initialIntegration?.configJson?.goals || 'Detectar oportunidades nuevas'
    });

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
            if (res.success) {
                setRecommendation(res.content || null);
            } else {
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
            if (res.success) {
                setAnalysisResult(res.summary || null);
                if (res.lastAnalysisAt) setLastAnalysisAt(new Date(res.lastAnalysisAt));
                toast.success('Análisis de inbox completado.');
            } else {
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
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
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
                                { label: 'Correos Analizados', value: '30 Recientes', icon: MailSearch, color: 'text-blue-500', bg: 'bg-blue-50' },
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
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/50 rounded-full translate-x-32 -translate-y-32 blur-[80px]"></div>

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
                                                            h1: ({ node, ...props }) => <h1 className="text-3xl font-black text-gray-900 mb-8 pb-4 border-b-4 border-blue-500/20 inline-block tracking-tight" {...props} />,
                                                            h2: ({ node, ...props }) => <h2 className="text-xl font-black text-gray-800 mt-12 mb-6 flex items-center gap-2 group tracking-tight" {...props} />,
                                                            h3: ({ node, ...props }) => <h3 className="text-lg font-black text-gray-700 mt-8 mb-4 tracking-tight" {...props} />,
                                                            p: ({ node, ...props }) => <p className="text-gray-600 leading-[1.8] font-medium mb-6 text-base" {...props} />,
                                                            ul: ({ node, ...props }) => <ul className="space-y-4 mb-8" {...props} />,
                                                            li: ({ node, ...props }) => {
                                                                const textContent = (props.children as any)?.toString() || "";
                                                                return (
                                                                    <li
                                                                        onClick={() => handleBulletClick(textContent)}
                                                                        className="flex items-start gap-3 text-gray-600 bg-white/50 p-4 rounded-2xl border border-gray-100/50 shadow-sm hover:shadow-md transition-all cursor-pointer group/item relative overflow-hidden"
                                                                    >
                                                                        <div className="absolute inset-0 bg-blue-50/0 group-hover/item:bg-blue-50/50 transition-colors" />
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-[0.6rem] shrink-0 group-hover/item:scale-150 transition-all z-10" />
                                                                        <div className="flex-1 z-10">
                                                                            <span className="font-medium text-[0.95rem]">{props.children}</span>
                                                                            <div className="text-[10px] text-blue-500 font-black mt-2 opacity-0 group-hover/item:opacity-100 transition-all flex items-center gap-1.5 uppercase tracking-widest">
                                                                                <Sparkles className="w-3 h-3" /> Ver Inteligencia y Acciones
                                                                            </div>
                                                                        </div>
                                                                    </li>
                                                                );
                                                            },
                                                            strong: ({ node, ...props }) => <strong className="font-black text-gray-900 bg-blue-50 px-1 rounded" {...props} />,
                                                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-500 pl-6 my-8 italic text-gray-500 font-medium" {...props} />,
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
                                                    <div className="flex-1 bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-center gap-4 transition-all">
                                                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                                                            <Zap className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Sugerencia IA</p>
                                                            <p className="text-sm font-black text-blue-600 tracking-tight">Redactar respuestas automáticas</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : isAnalyzing ? (
                                            <div className="flex flex-col items-center justify-center h-[450px] space-y-8 animate-pulse">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl animate-pulse scale-150"></div>
                                                    <MailSearch className="w-24 h-24 text-blue-500 relative" />
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
                                                <Mail className="w-6 h-6 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Canal Conectado</p>
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
                                <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-blue-100/50 group-hover:scale-110 transition-transform duration-500">
                                    <Lock className="w-10 h-10 text-blue-600" />
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
                <DialogContent className="rounded-[3rem] p-0 border-none shadow-2xl bg-white max-w-2xl overflow-hidden">
                    <div className="bg-gray-900 p-8 text-white relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
                        <div className="relative flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                                <BrainCircuit className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Inteligencia Profunda</p>
                                <h3 className="text-xl font-black tracking-tight">Análisis de Punto Clave</h3>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Punto del Resumen:</p>
                            <p className="text-gray-900 font-bold leading-relaxed italic">"{selectedBullet}"</p>
                        </div>

                        {isLoadingRec ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Generando recomendaciones...</p>
                            </div>
                        ) : recommendation ? (
                            <div className="prose prose-blue max-w-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-xl font-black text-gray-900 mb-4" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-lg font-black text-gray-800 mt-6 mb-3" {...props} />,
                                        p: ({ node, ...props }) => <p className="text-gray-600 leading-relaxed font-medium mb-4" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="space-y-2 mb-6" {...props} />,
                                        li: ({ node, ...props }) => <li className="flex items-start gap-2 text-gray-600 font-medium" {...props}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                            <span>{props.children}</span>
                                        </li>,
                                        strong: ({ node, ...props }) => <strong className="font-bold text-gray-900" {...props} />,
                                        blockquote: ({ node, ...props }) => (
                                            <div className="relative mt-8 group">
                                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                                <blockquote className="relative bg-white p-6 rounded-2xl border border-gray-100 italic font-medium text-gray-700 leading-relaxed shadow-sm">
                                                    {props.children}
                                                </blockquote>
                                                <div className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">Borrador IA</div>
                                            </div>
                                        )
                                    }}
                                >
                                    {recommendation}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                                <p className="text-gray-500 font-bold text-sm">No pudimos generar recomendaciones en este momento.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-8 pt-0">
                        <Button
                            onClick={() => setShowRecDialog(false)}
                            className="w-full h-14 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-widest text-[10px]"
                        >
                            Entendido
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Config View */}
            {activeTab === 'config' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
                    <Card className="rounded-[3rem] p-10 md:p-12 border-none shadow-2xl bg-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/50 rounded-full translate-x-40 -translate-y-40 blur-[80px]"></div>

                        <div className="relative space-y-12">
                            {/* Steps Indicator */}
                            <div className="flex items-center justify-center gap-4 border-b border-gray-50 pb-8">
                                {[1, 2, 3].map((step) => (
                                    <div key={step} className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all duration-500",
                                            configStep >= step
                                                ? "bg-blue-600 text-white shadow-xl shadow-blue-200 scale-110"
                                                : "bg-gray-100 text-gray-400"
                                        )}>
                                            {step}
                                        </div>
                                        {step < 3 && <div className={cn("w-12 h-1 rounded-full", configStep > step ? "bg-blue-600" : "bg-gray-100")} />}
                                    </div>
                                ))}
                            </div>

                            {/* Wizard Steps */}
                            {configStep === 1 && (
                                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-4">
                                            <Target className="w-8 h-8" />
                                        </div>
                                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Área de Enfoque</h2>
                                        <p className="text-gray-400 font-bold">¿En qué departamento debe centrarse el analista IA?</p>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {['Ventas', 'Soporte', 'Operaciones', 'Personal'].map((area) => (
                                            <button
                                                key={area}
                                                onClick={() => setConfig({ ...config, focusArea: area })}
                                                className={cn(
                                                    "p-6 rounded-3xl border-2 transition-all duration-300 text-center space-y-3 group",
                                                    config.focusArea === area
                                                        ? "border-blue-600 bg-blue-50/50 shadow-xl shadow-blue-100"
                                                        : "border-gray-100 hover:border-gray-200"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all",
                                                    config.focusArea === area ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 group-hover:scale-110"
                                                )}>
                                                    {area === 'Ventas' && <TrendingUp className="w-5 h-5" />}
                                                    {area === 'Soporte' && <Settings2 className="w-5 h-5" />}
                                                    {area === 'Operaciones' && <Server className="w-5 h-5" />}
                                                    {area === 'Personal' && <User className="w-5 h-5" />}
                                                </div>
                                                <p className={cn("text-xs font-black uppercase tracking-widest", config.focusArea === area ? "text-blue-900" : "text-gray-400")}>{area}</p>
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
                                        <div className="w-16 h-16 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-4">
                                            <Lightbulb className="w-8 h-8" />
                                        </div>
                                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Tus Objetivos</h2>
                                        <p className="text-gray-400 font-bold">¿Qué buscas encontrar en tu bandeja de entrada?</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex flex-wrap gap-3 justify-center">
                                            {[
                                                'Detectar oportunidades nuevas',
                                                'Resumir urgencias críticas',
                                                'Seguimiento de leads',
                                                'Control de pagos/facturas',
                                                'Reporte de incidencias'
                                            ].map((goal) => (
                                                <button
                                                    key={goal}
                                                    onClick={() => setConfig({ ...config, goals: goal })}
                                                    className={cn(
                                                        "px-6 py-4 rounded-full border-2 font-bold text-xs uppercase tracking-widest transition-all",
                                                        config.goals === goal
                                                            ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100"
                                                            : "border-gray-100 text-gray-400 hover:border-gray-200"
                                                    )}
                                                >
                                                    {goal}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">U otro objetivo personalizado:</label>
                                            <Input
                                                value={config.goals}
                                                onChange={(e) => setConfig({ ...config, goals: e.target.value })}
                                                placeholder="Ej: Buscar correos sobre el proyecto Alpha..."
                                                className="h-16 rounded-2xl border-gray-100 bg-gray-50/50 px-6 font-bold text-sm"
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
                                        <div className="w-16 h-16 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-4">
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
                                                className="h-16 rounded-2xl border-gray-100 bg-gray-50/50 px-6 font-bold text-sm focus:ring-4 focus:ring-blue-500/5 transition-all"
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
                                                className="h-16 rounded-2xl border-gray-100 bg-gray-50/50 px-6 font-bold text-sm focus:ring-4 focus:ring-blue-500/5 transition-all"
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
                                                className="h-16 rounded-2xl border-gray-100 bg-gray-50/50 px-6 font-bold text-sm focus:ring-4 focus:ring-blue-500/5 transition-all"
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
                                                className="h-16 rounded-2xl border-gray-100 bg-gray-50/50 px-6 font-bold text-sm focus:ring-4 focus:ring-blue-500/5 transition-all"
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
                    <div className="bg-blue-50/50 p-10 rounded-[3rem] border border-blue-100 flex items-center gap-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-16 -mt-16"></div>
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200 border border-blue-100 shrink-0">
                            <ShieldCheck className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-blue-900 font-black text-xl tracking-tight leading-none mb-2">Privacidad Garantizada</h4>
                            <p className="text-blue-600/70 text-sm font-bold leading-relaxed max-w-2xl">
                                Tus credenciales se encriptan bajo el estándar <strong className="text-blue-700">AES-256</strong>. Solo nuestro analista IA accede de forma puntual bajo tu demanda para procesar los resúmenes; nunca se almacenan los cuerpos de los correos permanentemente.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
