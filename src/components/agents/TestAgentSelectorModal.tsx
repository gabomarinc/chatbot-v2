'use client';

import { X, Play, ExternalLink, Sparkles, MessageSquare, Terminal } from 'lucide-react';

interface TestAgentSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectInternal: () => void;
    onSelectExternal: () => void;
}

export function TestAgentSelectorModal({ isOpen, onClose, onSelectInternal, onSelectExternal }: TestAgentSelectorModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Probar Agente</h2>
                        <p className="text-gray-500 font-medium">Selecciona cómo prefieres testear la experiencia de tu IA</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Option 1: Internal */}
                    <button
                        onClick={onSelectInternal}
                        className="group relative flex flex-col items-start text-left p-8 rounded-[2.5rem] bg-gray-50 border-2 border-transparent hover:border-[#21AC96] hover:bg-white transition-all duration-500 shadow-sm hover:shadow-xl hover:-translate-y-1"
                    >
                        <div className="w-14 h-14 bg-[#21AC96]/10 rounded-2xl flex items-center justify-center text-[#21AC96] mb-6 group-hover:scale-110 transition-transform">
                            <Terminal className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Probar Aquí</h3>
                        <p className="text-sm text-gray-500 leading-relaxed font-medium">
                            Abre una consola de pruebas interna para verificar las respuestas del agente rápidamente.
                        </p>

                        <div className="mt-8 flex items-center gap-2 text-[#21AC96] font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            Configuración Rápida <Play className="w-3 h-3 fill-current" />
                        </div>
                    </button>

                    {/* Option 2: External */}
                    <button
                        onClick={onSelectExternal}
                        className="group relative flex flex-col items-start text-left p-8 rounded-[2.5rem] bg-gray-900 text-white border-2 border-transparent hover:border-[#21AC96] transition-all duration-500 shadow-xl hover:-translate-y-1 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#21AC96]/10 blur-[50px] -mr-16 -mt-16 group-hover:bg-[#21AC96]/20 transition-all duration-1000" />

                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-[#21AC96] mb-6 group-hover:scale-110 transition-transform">
                            <ExternalLink className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-extrabold mb-2">Ventana Nueva</h3>
                        <p className="text-white/60 text-sm leading-relaxed font-medium">
                            Genera un link público y efímero para ver cómo lucirá el chat en tu sitio web. Sin memoria.
                        </p>

                        <div className="mt-8 flex items-center gap-2 text-[#21AC96] font-black text-xs uppercase tracking-widest">
                            Link Público <Sparkles className="w-3 h-3 fill-current animate-pulse" />
                        </div>
                    </button>
                </div>

                <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Powered by Kônsul AI Engine</span>
                </div>
            </div>
        </div>
    );
}
