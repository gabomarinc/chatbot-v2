'use client'

import { useState } from 'react';
import { analyzeInbox } from '@/lib/actions/email-analysis';
import { testEmailIMAPConnection, saveEmailIMAPIntegration } from '@/lib/actions/integrations';
import {
    Mail, BrainCircuit, Sparkles, TrendingUp, AlertCircle,
    Clock, Settings2, RotateCw, Loader2, CheckCircle2,
    ArrowRight, MailSearch, Zap, ShieldCheck, MailOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogDescription,
    DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

interface InboxDashboardClientProps {
    initialAgents: any[];
}

export function InboxDashboardClient({ initialAgents }: InboxDashboardClientProps) {
    const [agents, setAgents] = useState(initialAgents);
    const [selectedAgent, setSelectedAgent] = useState(initialAgents[0] || null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [showConfigModal, setShowConfigModal] = useState(false);

    const handleRunAnalysis = async () => {
        if (!selectedAgent) return;
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const res = await analyzeInbox(selectedAgent.id);
            if (res.success) {
                setAnalysisResult(res.summary || null);
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

    if (agents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in">
                <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-blue-100/50">
                    <MailOpen className="w-12 h-12 text-blue-500" />
                </div>
                <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Correo Inteligente</h1>
                <p className="text-gray-400 font-bold max-w-md mx-auto leading-relaxed mb-10 text-lg">
                    Aún no tienes agentes configurados para analizar correos. Conecta tu cuenta IMAP para empezar a recibir insights.
                </p>
                <Button
                    variant="outline"
                    className="rounded-2xl h-14 px-8 text-sm font-black uppercase tracking-widest border-gray-200 hover:bg-gray-50 transition-all gap-3"
                    onClick={() => window.location.href = '/agents'}
                >
                    Ir a Agentes
                    <ArrowRight className="w-4 h-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-10">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-gray-100">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-blue-600">
                        <div className="bg-blue-100 p-2 rounded-xl">
                            <BrainCircuit className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Inteligencia Artificial</span>
                    </div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Correo Inteligente</h1>
                    <p className="text-gray-400 font-bold text-lg">Analiza patrones, detecta urgencias y optimiza tus ventas.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-[1.5rem] border border-gray-100 shadow-sm flex items-center gap-1">
                        {agents.map(agent => (
                            <button
                                key={agent.id}
                                onClick={() => {
                                    setSelectedAgent(agent);
                                    setAnalysisResult(null);
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${selectedAgent?.id === agent.id ? 'bg-[#21AC96] text-white shadow-lg shadow-[#21AC96]/20' : 'text-gray-400 hover:bg-gray-50'}`}
                            >
                                {agent.name}
                            </button>
                        ))}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-2xl h-12 w-12 bg-white border border-gray-100 shadow-sm text-gray-400 hover:text-blue-600 transition-all hover:rotate-180 duration-500"
                    >
                        <Settings2 className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Estado', value: 'Excelente', icon: ShieldCheck, color: 'text-green-500', bg: 'bg-green-50' },
                    { label: 'Último Análisis', value: 'Hace 5 min', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Ops Detectadas', value: '14 Nuevas', icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50' },
                    { label: 'Urgencias', value: '3 Pendientes', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' }
                ].map((stat, i) => (
                    <Card key={i} className="p-6 rounded-[2rem] border-none shadow-xl shadow-gray-200/20 bg-white group hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                                <p className="text-xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                            </div>
                            <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl group-hover:rotate-12 transition-all`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Main Action Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Analysis Area */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="rounded-[3rem] p-10 border-none shadow-2xl bg-white relative overflow-hidden h-full flex flex-col">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full translate-x-32 -translate-y-32 blur-3xl"></div>

                        <div className="flex items-center justify-between mb-10 relative">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200 rotate-3">
                                    <Sparkles className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Reporte Ejecutivo</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Generado con Inteligencia Artificial</p>
                                </div>
                            </div>

                            <Button
                                onClick={handleRunAnalysis}
                                disabled={isAnalyzing}
                                className="bg-gray-900 hover:bg-black text-white rounded-2xl h-12 px-6 text-xs font-black uppercase tracking-[0.15em] flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-gray-200"
                            >
                                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                                {isAnalyzing ? 'Procesando...' : 'Actualizar Análisis'}
                            </Button>
                        </div>

                        <div className="flex-1 relative">
                            {analysisResult ? (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed font-medium bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100 shadow-inner">
                                        {analysisResult.split('\n').map((line, i) => (
                                            <p key={i} className="mb-4 last:mb-0">
                                                {line}
                                            </p>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        <div className="flex-1 bg-green-50 p-6 rounded-[1.5rem] border border-green-100 flex items-center gap-4 group cursor-pointer hover:bg-green-100 transition-all">
                                            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
                                                <Zap className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Acción Sugerida</p>
                                                <p className="text-xs font-bold text-green-600">Crear seguimiento automático</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-[#21AC96]/5 p-6 rounded-[1.5rem] border border-[#21AC96]/10 flex items-center gap-4 group cursor-pointer hover:bg-[#21AC96]/10 transition-all">
                                            <div className="w-10 h-10 bg-[#21AC96] rounded-xl flex items-center justify-center shadow-lg shadow-[#21AC96]/20">
                                                <TrendingUp className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-[#21AC96] uppercase tracking-widest">Oportunidad</p>
                                                <p className="text-xs font-bold text-[#21AC96]">Enviar propuesta a 3 leads</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : isAnalyzing ? (
                                <div className="flex flex-col items-center justify-center h-[400px] space-y-6 animate-pulse">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
                                        <MailSearch className="w-20 h-20 text-blue-500 relative" />
                                    </div>
                                    <p className="text-gray-400 font-extrabold text-sm uppercase tracking-widest animate-bounce">
                                        Escaneando bandeja de entrada...
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-8">
                                    <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center border border-gray-100 shadow-inner">
                                        <MailSearch className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-black text-gray-900 tracking-tight">Listo para analizar</h4>
                                        <p className="text-gray-400 font-bold max-w-xs leading-relaxed">
                                            Pulsa el botón de arriba para que tu agente IA revise tus últimos correos.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Sidebar Info Area */}
                <div className="space-y-8">
                    {/* Connection Info */}
                    <Card className="rounded-[2.5rem] p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white border-none shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>

                        <div className="relative space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                                    <Mail className="w-5 h-5 text-blue-400" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Conexión IMAP</span>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest uppercase">Servidor</p>
                                    <p className="text-sm font-black tracking-tight flex items-center gap-2">
                                        {selectedAgent?.integrations[0]?.configJson?.host || 'No configurado'}
                                        {selectedAgent && <CheckCircle2 className="w-4 h-4 text-[#21AC96]" />}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest uppercase">Usuario</p>
                                    <p className="text-sm font-black tracking-tight truncate">
                                        {selectedAgent?.integrations[0]?.configJson?.user || '---'}
                                    </p>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                            >
                                Gestionar Conexión
                            </Button>
                        </div>
                    </Card>

                    {/* How it works area */}
                    <Card className="rounded-[2.5rem] p-8 bg-blue-50/50 border-blue-100 flex flex-col gap-6 shadow-sm">
                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            ¿Cómo funciona?
                        </h4>
                        <div className="space-y-4">
                            {[
                                { text: 'Escaneo de cabeceras seguro.', icon: '🛡️' },
                                { text: 'Análisis semántico de intención.', icon: '🧠' },
                                { text: 'Detección de urgencias reales.', icon: '⚡' },
                                { text: 'Sugerencias accionables 1-clic.', icon: '🎯' }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-3 text-xs font-bold text-blue-900/70">
                                    <span>{item.icon}</span>
                                    <span>{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
