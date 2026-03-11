'use client'

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { AlertCircle, CreditCard } from "lucide-react"

export function SubscriptionGuard() {
    const pathname = usePathname()
    const router = useRouter()

    const isBillingPage = pathname?.startsWith('/billing')

    useEffect(() => {
        // If not on billing and inactive, we could redirect here
        // but showing the overlay is better to explain WHY they are blocked
        if (!isBillingPage) {
            // Optional: router.push('/billing')
        }
    }, [isBillingPage, router])

    if (isBillingPage) return null

    return (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl border border-gray-100 p-10 text-center space-y-8 animate-in zoom-in-95 duration-700">
                <div className="mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                
                <div className="space-y-4">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Tu suscripción ha expirado</h2>
                    <p className="text-gray-500 font-medium leading-relaxed">
                        Para seguir disfrutando de Kônsul AI y que tus agentes sigan activos, necesitas actualizar tu método de pago o renovar tu plan.
                    </p>
                </div>

                <button
                    onClick={() => router.push('/billing')}
                    className="w-full h-14 bg-[#21AC96] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-[#21AC96]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                    <CreditCard className="w-4 h-4" />
                    Ir a Facturación
                </button>
                
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Kônsul AI — Tu Hub de Prospección
                </p>
            </div>
        </div>
    )
}
