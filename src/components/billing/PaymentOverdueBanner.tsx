'use client'

import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowRight, CreditCard } from "lucide-react"

export function PaymentOverdueBanner() {
    const router = useRouter()

    return (
        <div className="mb-8 w-full">
            <div className="relative overflow-hidden bg-[#0A0E17] rounded-[2rem] p-6 pr-10 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl border border-white/5 group hover:border-[#21AC96]/30 transition-all duration-500">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#21AC96]/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-500/5 blur-[80px] -ml-24 -mb-24 rounded-full" />
                
                <div className="relative space-y-4 max-w-2xl text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        <AlertTriangle className="w-3 h-3" />
                        Atención: Pago Retrasado
                    </div>
                    
                    <div className="space-y-2">
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
                            Tu último pago <span className="text-[#21AC96]">no pudo ser procesado</span>
                        </h2>
                        <p className="text-gray-400 font-medium text-sm md:text-base max-w-lg leading-relaxed">
                            Para evitar interrupciones en el servicio de tus agentes, actualiza tu método de pago lo antes posible.
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => router.push('/billing')}
                        className="group/btn h-14 px-8 bg-white text-black rounded-full font-black uppercase tracking-wider text-[11px] flex items-center gap-3 hover:scale-[1.05] active:scale-[0.95] transition-all duration-300 shadow-xl"
                    >
                        <CreditCard className="w-4 h-4 text-[#21AC96]" />
                        Verificar Pago
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    )
}
