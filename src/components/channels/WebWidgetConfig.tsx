'use client';

import { useState } from 'react';
import { createChannel, updateChannel } from '@/lib/actions/dashboard';
import { Loader2, Copy, CheckCircle2, LayoutTemplate, Palette, MessageSquare, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Agent {
    id: string;
    name: string;
}

interface WebWidgetConfigProps {
    agents: Agent[];
    existingChannel?: any;
    defaultAgentId?: string;
}

export function WebWidgetConfig({ agents, existingChannel, defaultAgentId }: WebWidgetConfigProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Initial State defaults
    const [formData, setFormData] = useState({
        agentId: existingChannel?.agentId || defaultAgentId || (agents.length > 0 ? agents[0].id : ''),
        displayName: existingChannel?.displayName || 'Chat Web',
        color: existingChannel?.configJson?.color || '#21AC96',
        title: existingChannel?.configJson?.title || 'Asistente Virtual',
        welcomeMessage: existingChannel?.configJson?.welcomeMessage || '¡Hola! ¿En qué puedo ayudarte hoy?',
        placeholder: existingChannel?.configJson?.placeholder || 'Escribe un mensaje...',
        logoUrl: existingChannel?.configJson?.logoUrl || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const payload = {
                agentId: formData.agentId,
                displayName: formData.displayName,
                type: 'WEBCHAT' as const,
                isActive: true, // Activate the channel by default
                configJson: {
                    color: formData.color,
                    title: formData.title,
                    welcomeMessage: formData.welcomeMessage,
                    placeholder: formData.placeholder,
                    logoUrl: formData.logoUrl
                }
            };

            if (existingChannel) {
                await updateChannel(existingChannel.id, {
                    displayName: formData.displayName,
                    configJson: payload.configJson,
                    isActive: true // Ensure channel is active when saving
                });
            } else {
                await createChannel(payload);
            }

            setIsSaved(true);
            router.refresh();
            setTimeout(() => setIsSaved(false), 3000);
        } catch (error) {
            console.error('Error saving widget:', error);
            alert('Error al guardar la configuración');
        } finally {
            setIsLoading(false);
        }
    };

    const embedCode = existingChannel
        ? `<script src="${window.location.origin}/widget.js" data-channel-id="${existingChannel.id}"></script>`
        : 'Guarda el canal para generar el código.';

    const copyToClipboard = () => {
        if (!existingChannel) return;
        navigator.clipboard.writeText(embedCode);
        alert('Código copiado al portapapeles');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in">
            {/* Configuration Form */}
            <div className="space-y-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-[#21AC96]/10 rounded-xl flex items-center justify-center text-[#21AC96]">
                            <LayoutTemplate className="w-5 h-5" />
                        </div>
                        <h3 className="text-gray-900 font-extrabold text-lg tracking-tight">Configuración General</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Agente Responsable</label>
                            <select
                                disabled={!!existingChannel}
                                value={formData.agentId}
                                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium appearance-none cursor-pointer disabled:opacity-50"
                            >
                                {agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                                ))}
                            </select>
                            {existingChannel && <p className="text-xs text-gray-400 ml-1">El agente no se puede cambiar una vez creado el canal.</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Nombre del Canal (Interno)</label>
                            <input
                                type="text"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                            <Palette className="w-5 h-5" />
                        </div>
                        <h3 className="text-gray-900 font-extrabold text-lg tracking-tight">Personalización Visual</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1">Color Principal</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-12 h-12 rounded-xl cursor-pointer border-0 p-1 bg-gray-50"
                                    />
                                    <span className="text-sm font-mono text-gray-500 bg-gray-50 px-3 py-1 rounded-lg uppercase">{formData.color}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1">Título del Chat</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Mensaje de Bienvenida</label>
                            <textarea
                                rows={3}
                                value={formData.welcomeMessage}
                                onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Placeholder del Input</label>
                            <input
                                type="text"
                                value={formData.placeholder}
                                onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium"
                                placeholder="Escribe un mensaje..."
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full py-4 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Guardando...</span>
                        </>
                    ) : (
                        <span>{existingChannel ? 'Actualizar Widget' : 'Crear Widget'}</span>
                    )}
                </button>
                {isSaved && (
                    <div className="flex items-center justify-center gap-2 text-green-600 font-bold text-sm animate-in fade-in zoom-in duration-300">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Configuración guardada correctamente</span>
                    </div>
                )}
            </div>

            {/* Preview Column */}
            <div className="space-y-8">
                {/* Live Preview */}
                <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-200/50 flex flex-col items-center justify-center min-h-[700px] relative overflow-visible">
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50 rounded-[2.5rem] overflow-hidden"></div>
                    <div className="relative w-[340px] h-[600px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col animate-slide-in-from-bottom-10">
                        {/* Fake Widget Header */}
                        <div className="h-16 flex items-center px-6 text-white gap-3 shrink-0" style={{ background: formData.color }}>
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">Bot</div>
                            <span className="font-bold truncate max-w-[180px]">{formData.title}</span>
                            <div className="ml-auto flex gap-2">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
                            </div>
                        </div>
                        {/* Fake Widget Content */}
                        <div className="flex-1 bg-gray-50/50 p-4 space-y-4 overflow-hidden relative">
                            <div className="flex gap-2">
                                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: formData.color }}>Bot</div>
                                <div className="bg-white p-3 rounded-2xl rounded-tl-none text-sm text-gray-700 shadow-sm border border-gray-100 max-w-[200px]">
                                    {formData.welcomeMessage || '...'}
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <div className="text-white p-3 rounded-2xl rounded-tr-none text-sm shadow-md opacity-80 max-w-[200px]" style={{ background: formData.color }}>
                                    ¿Tienen soporte 24/7?
                                </div>
                            </div>
                        </div>
                        {/* Fake Input */}
                        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                            <div className="h-12 bg-gray-50 border border-gray-100 rounded-xl w-full px-4 flex items-center text-sm text-gray-400">
                                {formData.placeholder || 'Escribe un mensaje...'}
                            </div>
                        </div>
                    </div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-8 z-10">Vista Previa en Vivo</p>
                </div>

                {/* Integration Code */}
                {existingChannel && (
                    <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-4 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#21AC96] opacity-10 blur-3xl rounded-full"></div>
                        <div className="flex items-center gap-3 mb-2 text-white">
                            <Code className="w-5 h-5 text-[#21AC96]" />
                            <h3 className="font-extrabold text-lg tracking-tight">Instalación</h3>
                        </div>
                        <div className="space-y-6">
                            {/* Script Option */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Opción 1: Script (Recomendado)</label>
                                <div className="relative bg-slate-950 rounded-2xl p-4 border border-slate-800">
                                    <code className="text-xs text-slate-300 font-mono break-all block leading-relaxed">
                                        {embedCode}
                                    </code>
                                    <button
                                        onClick={() => {
                                            if (!existingChannel) return;
                                            navigator.clipboard.writeText(embedCode);
                                            alert('Script copiado');
                                        }}
                                        className="absolute top-2 right-2 p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                                        title="Copiar Script"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500">
                                    Incluye el botón flotante y gestiona la apertura/cierre del chat automáticamente.
                                </p>
                            </div>

                            {/* Iframe Option */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Opción 2: Iframe Directo</label>
                                <div className="relative bg-slate-950 rounded-2xl p-4 border border-slate-800">
                                    <code className="text-xs text-slate-300 font-mono break-all block leading-relaxed">
                                        {`<iframe
  src="${window.location.origin}/widget/${existingChannel.id}"
  width="100%"
  height="600"
  frameborder="0"
></iframe>`}
                                    </code>
                                    <button
                                        onClick={() => {
                                            if (!existingChannel) return;
                                            const iframeCode = `<iframe src="${window.location.origin}/widget/${existingChannel.id}" width="100%" height="600" frameborder="0"></iframe>`;
                                            navigator.clipboard.writeText(iframeCode);
                                            alert('Iframe copiado');
                                        }}
                                        className="absolute top-2 right-2 p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                                        title="Copiar Iframe"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500">
                                    Utiliza esto si prefieres incrustar el chat en un contenedor específico de tu web.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
