'use client';

import { useState } from 'react';
import { X, Bot, Sparkles, MessageSquare, Shield, Target, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createAgent } from '@/lib/actions/dashboard';
import { useRouter } from 'next/navigation';

interface CreateAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateAgentModal({ isOpen, onClose }: CreateAgentModalProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        jobType: 'SALES' as 'SUPPORT' | 'SALES' | 'PERSONAL',
        communicationStyle: 'NORMAL' as 'FORMAL' | 'NORMAL' | 'CASUAL',
        personalityPrompt: '',
        model: 'gemini-1.5-flash' // Default to Gemini 1.5 Flash (supports images, cost-effective)
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await createAgent(formData);
            onClose();
            router.refresh();
        } catch (error) {
            console.error('Error creating agent:', error);
            alert('Error al crear el agente. Por favor, inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl shadow-gray-900/20 overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#21AC96]/10 rounded-xl flex items-center justify-center text-[#21AC96]">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-gray-900 font-extrabold text-xl tracking-tight">Crear Nuevo Agente</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Configuración Inicial</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Nombre del Agente</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Paulina de Ventas"
                                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Modelo de IA</label>
                            <select
                                value={formData.model}
                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium appearance-none cursor-pointer"
                            >
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recomendado)</option>
                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                            </select>
                        </div>
                    </div>

                    {/* Job Type */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-gray-700 ml-1">Objetivo del Agente</label>
                        <div className="grid grid-cols-3 gap-4">
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
                                        "p-4 rounded-[1.5rem] border-2 transition-all text-left group",
                                        formData.jobType === type.id
                                            ? "border-[#21AC96] bg-[#21AC96]/5 ring-4 ring-[#21AC96]/5"
                                            : "border-gray-50 bg-gray-50/50 hover:border-gray-200"
                                    )}
                                >
                                    <type.icon className={cn(
                                        "w-6 h-6 mb-3 transition-colors",
                                        formData.jobType === type.id ? "text-[#21AC96]" : "text-gray-400 group-hover:text-gray-600"
                                    )} />
                                    <div className="font-extrabold text-sm text-gray-900 leading-tight mb-0.5">{type.label}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{type.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Personality Prompt */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-sm font-bold text-gray-700">Prompt de Personalidad</label>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Define cómo debe actuar</span>
                        </div>
                        <textarea
                            required
                            rows={4}
                            value={formData.personalityPrompt}
                            onChange={(e) => setFormData({ ...formData, personalityPrompt: e.target.value })}
                            placeholder="Ej: Eres un asistente entusiasta y profesional de ventas para una inmobiliaria. Tu tono es amable y servicial..."
                            className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium resize-none"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-4 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-gray-50 text-gray-500 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={isLoading}
                            className="flex-[2] px-6 py-4 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Creando Agente...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    <span>Crear Agente</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
