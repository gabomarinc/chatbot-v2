"use client";

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Sparkles,
    MessageSquare,
    Filter,
    CheckSquare,
    Send,
    X,
    ChevronRight,
    PlayCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function CampaignEducation() {
    const [isOpen, setIsOpen] = useState(false);

    const steps = [
        {
            title: "Filtra tu Audiencia",
            description: "Usa los filtros avanzados para encontrar a los clientes ideales según etiquetas, agentes o datos personalizados.",
            icon: <Filter className="w-6 h-6" />,
            color: "bg-blue-500"
        },
        {
            title: "Selecciona el Objetivo",
            description: "Marca los contactos que deseas incluir en tu campaña usando los checkboxes de la tabla.",
            icon: <CheckSquare className="w-6 h-6" />,
            color: "bg-[#21AC96]"
        },
        {
            title: "Lanza el Mensaje",
            description: "Elige una plantilla de WhatsApp, personaliza las variables y ¡listo! Tus mensajes llegarán en segundos.",
            icon: <Send className="w-6 h-6" />,
            color: "bg-indigo-500"
        }
    ];

    return (
        <>
            {/* Banner Premium */}
            <div className="relative overflow-hidden bg-gray-900 rounded-[2.5rem] p-8 md:p-10 mb-10 shadow-2xl group">
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-[#21AC96]/10 rounded-full blur-[80px] group-hover:bg-[#21AC96]/20 transition-all duration-700"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-700"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#21AC96]/20 to-transparent rounded-full border border-[#21AC96]/20 text-[#21AC96] text-xs font-black uppercase tracking-widest mb-6">
                            <Sparkles className="w-4 h-4 animate-pulse" />
                            Nuevo: Campañas Masivas
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4 leading-tight">
                            ¿Sabes cómo crear una <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#21AC96] to-emerald-400">Campaña de WhatsApp</span>?
                        </h2>
                        <p className="text-gray-400 text-lg font-medium max-w-xl">
                            Transforma tus segmentos en ventas reales enviando mensajes directos y personalizados a gran escala.
                        </p>
                    </div>

                    <div className="shrink-0">
                        <button
                            onClick={() => setIsOpen(true)}
                            className="group relative flex items-center gap-4 bg-white hover:bg-[#21AC96] text-gray-900 hover:text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl hover:shadow-[#21AC96]/40 active:scale-95"
                        >
                            <PlayCircle className="w-6 h-6" />
                            Ver Cómo Funciona
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Tutorial */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-3xl bg-white border-none shadow-2xl rounded-[3rem] p-0 overflow-hidden outline-none">
                    <div className="bg-gray-900 p-10 text-white relative">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white/60 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-[#21AC96] rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-[#21AC96]/20 mb-6">
                                <MessageSquare className="w-8 h-8" />
                            </div>
                            <h3 className="text-3xl font-black tracking-tight mb-2">Domina las Campañas</h3>
                            <p className="text-gray-400 font-medium">Sigue estos 3 pasos para conectar proactivamente con tu audiencia.</p>
                        </div>
                    </div>

                    <div className="p-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {steps.map((step, idx) => (
                                <div key={idx} className="relative flex flex-col items-center text-center group">
                                    <div className={cn(
                                        "w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3",
                                        step.color
                                    )}>
                                        {step.icon}
                                    </div>
                                    <h4 className="text-lg font-black text-gray-900 mb-2">{step.title}</h4>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                        {step.description}
                                    </p>

                                    {idx < steps.length - 1 && (
                                        <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-gray-100"></div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-[#21AC96]">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className="text-gray-900 font-black text-sm">¿Listo para empezar?</p>
                                    <p className="text-gray-500 text-xs font-medium">Usa el buscador de contactos aquí abajo.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full sm:w-auto px-8 py-3 bg-[#21AC96] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#21AC96]/20 hover:bg-[#1E9A86] transition-all"
                            >
                                Entendido, ¡Vamos!
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
