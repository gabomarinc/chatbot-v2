'use client';

import { useState } from 'react';
import { updateAgent } from '@/lib/actions/dashboard';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Bot, Sparkles, Wand2, Upload } from 'lucide-react';
import { generateAgentAvatar, uploadAgentAvatar } from '@/lib/actions/agent-avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AgentProfileFormProps {
    agent: {
        id: string;
        name: string;
        communicationStyle: string;
        personalityPrompt: string;
        avatarUrl?: string | null;
    };
}

export function AgentProfileForm({ agent }: AgentProfileFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [formData, setFormData] = useState({
        name: agent.name,
        communicationStyle: agent.communicationStyle,
        personalityPrompt: agent.personalityPrompt,
        avatarUrl: agent.avatarUrl,
    });
    const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

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
            console.error('Error updating agent:', error);
            toast.error('Error al guardar los cambios.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateAvatar = async () => {
        setIsGeneratingAvatar(true);
        try {
            const result = await generateAgentAvatar(agent.id);
            console.log("Avatar generation result:", result);
            if (result.success && result.url) {
                setFormData(prev => ({ ...prev, avatarUrl: result.url }));
                toast.success('Avatar generado con IA correctamente');
                router.refresh();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error('Error generating avatar:', error);
            toast.error(error.message || 'Error generando avatar. Inténtalo de nuevo.');
        } finally {
            setIsGeneratingAvatar(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('El archivo no debe superar los 5MB');
            return;
        }

        setIsUploading(true);
        const uploadForm = new FormData();
        uploadForm.append('file', file);

        try {
            const result = await uploadAgentAvatar(agent.id, uploadForm);
            if (result.success && result.url) {
                setFormData(prev => ({ ...prev, avatarUrl: result.url }));
                toast.success('Foto subida correctamente');
                router.refresh();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            toast.error(error.message || 'Error subiendo imagen. Inténtalo de nuevo.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-10 animate-fade-in">
            {/* Header Info */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-[#21AC96]/10 rounded-2xl flex items-center justify-center text-[#21AC96]">
                    <Bot className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-gray-900 font-extrabold text-2xl tracking-tight">Perfil de Identidad</h2>
                    <p className="text-gray-500 font-medium">Define el nombre y la personalidad base de tu agente</p>
                </div>
            </div>

            <div className="space-y-8 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                {/* Name */}
                <div className="space-y-2">
                    <label className="text-sm font-extrabold text-gray-700 ml-1 uppercase tracking-wider">Nombre del Agente</label>
                    <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium"
                    />
                </div>

                {/* Avatar Section */}
                <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center border-2 border-dashed border-gray-200 overflow-hidden shrink-0">
                        {formData.avatarUrl ? (
                            <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <Bot className="w-8 h-8 text-gray-300" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-1">Foto de Perfil</h3>
                        <p className="text-xs text-gray-500 mb-3">Genera una identidad visual única con IA o sube tu propia imagen.</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleGenerateAvatar}
                                disabled={isGeneratingAvatar || isUploading}
                                className="text-xs font-bold text-[#21AC96] bg-[#21AC96]/10 px-3 py-1.5 rounded-lg hover:bg-[#21AC96]/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isGeneratingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                {isGeneratingAvatar ? 'Diseñando...' : 'Generar con IA (50 Créditos)'}
                            </button>

                            <label className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 cursor-pointer">
                                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                {isUploading ? 'Subiendo...' : 'Subir Foto'}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={isGeneratingAvatar || isUploading}
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Communication Style */}
                <div className="space-y-4">
                    <label className="text-sm font-extrabold text-gray-700 ml-1 uppercase tracking-wider">Estilo de Comunicación</label>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { id: 'FORMAL', label: 'Formal', desc: 'Serio y profesional' },
                            { id: 'NORMAL', label: 'Normal', desc: 'Equilibrado' },
                            { id: 'CASUAL', label: 'Desenfadado', desc: 'Amigable y cercano' }
                        ].map((style) => (
                            <button
                                key={style.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, communicationStyle: style.id })}
                                className={cn(
                                    "p-4 rounded-2xl border-2 transition-all text-left",
                                    formData.communicationStyle === style.id
                                        ? "border-[#21AC96] bg-[#21AC96]/5 ring-4 ring-[#21AC96]/5"
                                        : "border-gray-50 bg-gray-50 hover:border-gray-200"
                                )}
                            >
                                <div className={cn(
                                    "font-extrabold text-sm mb-0.5",
                                    formData.communicationStyle === style.id ? "text-[#21AC96]" : "text-gray-900"
                                )}>
                                    {style.label}
                                </div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{style.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Personality Prompt */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                        <label className="text-sm font-extrabold text-gray-700 uppercase tracking-wider">Prompt de Comportamiento</label>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            {formData.personalityPrompt.length} / 2000
                        </span>
                    </div>
                    <div className="relative">
                        <textarea
                            required
                            rows={8}
                            value={formData.personalityPrompt}
                            onChange={(e) => setFormData({ ...formData, personalityPrompt: e.target.value })}
                            className="w-full px-6 py-5 bg-gray-50 border border-transparent rounded-[1.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium resize-none leading-relaxed"
                        />
                        <div className="absolute top-4 right-4 text-[#21AC96]/20">
                            <Sparkles className="w-6 h-6" />
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
