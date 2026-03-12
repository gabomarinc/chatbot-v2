'use client'

import { useRouter } from "next/navigation"
import { AlertCircle, ArrowRight, CreditCard, Calendar } from "lucide-react"

interface PaymentOverdueBannerProps {
    dueDate?: Date;
}

export function PaymentOverdueBanner({ dueDate }: PaymentOverdueBannerProps) {
    const router = useRouter()

    const formattedDate = dueDate 
        ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dueDate))
        : null;

    return (
        <div className="mb-8 w-full group">
            <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-orange-500 rounded-[2.5rem] p-6 pr-10 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_20px_50px_rgba(239,68,68,0.3)] border border-white/20 transition-all duration-500 hover:scale-[1.01]">
                
                {/* Decorative background effects */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] -mr-48 -mt-48 rounded-full animate-pulse" />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative space-y-4 max-w-2xl text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Acción Requerida: Pago Pendiente
                    </div>
                    
                    <div className="space-y-3">
                        <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                            ¡Atención! Tu pago ha <span className="underline decoration-white/40 italic">fallado</span>
                        </h2>
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <p className="text-white/90 font-bold text-sm md:text-base leading-relaxed max-w-lg">
                                Para evitar que tus agentes dejen de responder, actualiza tu método de pago de inmediato.
                            </p>
                            {formattedDate && (
                                <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
                                    <Calendar className="w-4 h-4 text-white/70" />
                                    <span className="text-white text-xs font-black uppercase tracking-wider">
                                        Venció el: {formattedDate}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => router.push('/billing')}
                        className="group/btn h-16 px-10 bg-white text-red-600 rounded-2xl font-black uppercase tracking-wider text-[12px] flex items-center gap-3 hover:bg-gray-50 active:scale-[0.95] transition-all duration-300 shadow-2xl shadow-black/20"
                    >
                        <CreditCard className="w-5 h-5" />
                        Saldar Deuda
                        <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    )
}
