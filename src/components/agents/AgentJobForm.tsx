'use client';

import { useState } from 'react';
import { updateAgent } from '@/lib/actions/dashboard';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Target, Shield, Zap, Globe, Building2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentJobFormProps {
    agent: {
        id: string;
        jobType: 'SUPPORT' | 'SALES' | 'PERSONAL';
        jobCompany: string | null;
        jobWebsiteUrl: string | null;
        jobDescription: string | null;
    };
}

export function AgentJobForm({ agent }: AgentJobFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [formData, setFormData] = useState({
        jobType: agent.jobType,
        jobCompany: agent.jobCompany || '',
        jobWebsiteUrl: agent.jobWebsiteUrl || '',
        jobDescription: agent.jobDescription || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setIsSaved(false);
        try {
            await updateAgent(agent.id, formData);
            setIsSaved(true);
            router.refresh();
            setTimeout(() => setIsSaved(false), 3000);
        } catch (error) {
            console.error('Error updating agent job:', error);
            alert('Error al guardar los cambios.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-10 animate-fade-in">
            {/* Header Info */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-[#21AC96]/10 rounded-2xl flex items-center justify-center text-[#21AC96]">
                    <Target className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-gray-900 font-extrabold text-2xl tracking-tight">Contexto Laboral</h2>
                    <p className="text-gray-500 font-medium">Define el propósito y el entorno de trabajo del agente</p>
                </div>
            </div>

            <div className="space-y-6 md:space-y-8 bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="space-y-4">
                    <label className="text-sm font-extrabold text-gray-700 ml-1 uppercase tracking-wider">Objetivo del Agente</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                        {[
                            { id: 'SALES', label: 'Comercial', icon: Target, desc: 'Enfocado en ventas' },
                            { id: 'SUPPORT', label: 'Soporte', icon: Shield, desc: 'Ayuda técnica' },
                            { id: 'PERSONAL', label: 'Personal', icon: Zap, desc: 'Asistente general' }
                        ].map((type) => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, jobType: type.id as any })}
                                className={cn(
                                    "p-4 rounded-2xl border-2 transition-all text-left group",
                                    formData.jobType === type.id
                                        ? "border-[#21AC96] bg-[#21AC96]/5 ring-4 ring-[#21AC96]/5"
                                        : "border-gray-50 bg-gray-50 hover:border-gray-200"
                                )}
                            >
                                <type.icon className={cn(
                                    "w-6 h-6 mb-3 transition-colors",
                                    formData.jobType === type.id ? "text-[#21AC96]" : "text-gray-400 group-hover:text-gray-600"
                                )} />
                                <div className={cn(
                                    "font-extrabold text-sm mb-0.5",
                                    formData.jobType === type.id ? "text-[#21AC96]" : "text-gray-900"
                                )}>
                                    {type.label}
                                </div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{type.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Company & Website */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-extrabold text-gray-700 ml-1 uppercase tracking-wider">Empresa / Proyecto</label>
                        <div className="relative group">
                            <Building2 className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#21AC96] transition-colors" />
                            <input
                                type="text"
                                value={formData.jobCompany}
                                onChange={(e) => setFormData({ ...formData, jobCompany: e.target.value })}
                                placeholder="Nombre de la empresa"
                                className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-extrabold text-gray-700 ml-1 uppercase tracking-wider">Sitio Web Oficial</label>
                        <div className="relative group">
                            <Globe className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#21AC96] transition-colors" />
                            <input
                                type="url"
                                value={formData.jobWebsiteUrl}
                                onChange={(e) => setFormData({ ...formData, jobWebsiteUrl: e.target.value })}
                                placeholder="https://ejemplo.com"
                                className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* Job Description */}
                <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 ml-1">
                        <label className="text-sm font-extrabold text-gray-700 uppercase tracking-wider">Descripción del Negocio</label>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-full w-fit">
                            {formData.jobDescription.length} / 1000
                        </span>
                    </div>
                    <div className="relative">
                        <textarea
                            rows={6}
                            value={formData.jobDescription}
                            onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                            placeholder="Describe qué hace tu empresa, productos o servicios clave..."
                            className="w-full px-6 py-5 bg-gray-50 border border-transparent rounded-[1.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium resize-none leading-relaxed"
                        />
                        <div className="absolute top-4 right-4 text-[#21AC96]/20">
                            <FileText className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                <button
                    disabled={isLoading}
                    className="px-10 py-4 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Guardando...</span>
                        </>
                    ) : (
                        <span>Guardar Cambios</span>
                    )}
                </button>

                {isSaved && (
                    <div className="flex items-center gap-2 text-green-600 font-bold text-sm animate-in fade-in slide-in-from-left-4 duration-300">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>¡Guardado correctamente!</span>
                    </div>
                )}
            </div>
        </form>
    );
}
