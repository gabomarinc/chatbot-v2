'use client';

import { useState } from 'react';
import { Sparkles, Brain, Target, Zap, TrendingUp, RotateCcw, Loader2, CheckCircle2 } from 'lucide-react';
import { generateContactInsights } from '@/lib/actions/contacts';
import { toast } from 'sonner';

interface AIInsightsTabProps {
    contactId: string;
    initialData: any;
}

export function AIInsightsTab({ contactId, initialData }: AIInsightsTabProps) {
    const [data, setData] = useState(initialData);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const result = await generateContactInsights(contactId);
            if (result.success) {
                setData(result.contact);
                toast.success('Perfil de inteligencia actualizado correctamente');
            } else {
                toast.error('Error al generar inteligencia: ' + result.error);
            }
        } catch (error) {
            toast.error('Error inesperado');
        } finally {
            setIsGenerating(false);
        }
    };

    const insights = data?.aiInsights || {};

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header Action */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-gray-900 font-black text-xl tracking-tight">Cerebro de Lead</h3>
                    <p className="text-gray-500 text-sm font-medium">Análisis profundo mediante IA del comportamiento y necesidades.</p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-black/10 disabled:opacity-50"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analizando...
                        </>
                    ) : (
                        <>
                            <RotateCcw className="w-4 h-4" />
                            {data?.aiInsights ? 'Recalcular' : 'Generar Inteligencia'}
                        </>
                    )}
                </button>
            </div>

            {!data?.aiInsights && !isGenerating ? (
                <div className="bg-white border-2 border-dashed border-gray-100 rounded-[3rem] p-16 text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
                        <Brain className="w-10 h-10" />
                    </div>
                    <h4 className="text-gray-900 font-extrabold text-2xl mb-3">Sin Inteligencia Generada</h4>
                    <p className="text-gray-500 max-w-sm mx-auto font-medium mb-8">
                        Haz clic en el botón superior para que la IA lea todo el historial de chats y extraiga los intereses, dolores y perfil de este contacto.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Key Metrics */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">
                                    <Target className="w-5 h-5" />
                                </div>
                                <h4 className="text-gray-900 font-black uppercase tracking-widest text-xs">Intereses Detectados</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {insights.interests?.map((interest: string, i: number) => (
                                    <span key={i} className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl text-xs font-black uppercase tracking-wider border border-purple-100">
                                        {interest}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <h4 className="text-gray-900 font-black uppercase tracking-widest text-xs">Dolores / Necesidades</h4>
                            </div>
                            <ul className="space-y-3">
                                {insights.problems?.map((problem: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                        {problem}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Sentiment & Next Action */}
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-gray-900 font-black uppercase tracking-widest text-xs">Estado Mental</h4>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${insights.urgency === 'alta' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    Urgencia: {insights.urgency}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                                <div className="text-2xl">
                                    {insights.sentiment === 'positivo' ? '😊' : insights.sentiment === 'frustrado' ? '😤' : '😐'}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sentimiento Dominante</span>
                                    <span className="text-gray-900 font-bold capitalize">{insights.sentiment}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-[#21AC96] to-[#1a8a78] p-8 rounded-[2.5rem] text-white shadow-lg shadow-[#21AC96]/20 group">
                            <div className="flex items-center gap-3 mb-4">
                                <TrendingUp className="w-5 h-5 text-white/80 group-hover:scale-110 transition-transform" />
                                <h4 className="font-black uppercase tracking-widest text-xs opacity-80">Siguiente Mejor Acción</h4>
                            </div>
                            <p className="text-lg font-bold leading-relaxed">
                                "{insights.nextBestAction}"
                            </p>
                            <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Recomendado por Kônsul AI
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
