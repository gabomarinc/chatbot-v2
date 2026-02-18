"use client"

import { CheckCircle, CreditCard, Zap } from 'lucide-react';

type BillingClientProps = {
    planName: string;
    planPrice: number;
    maxAgents: number;
    creditsPerMonth: number;
    creditsRemaining: number;
    creditsUsed: number;
    usagePercentage: number;
    currentPeriodEnd: Date;
    isActive: boolean;
};

export default function BillingClient({
    planName,
    planPrice,
    maxAgents,
    creditsPerMonth,
    creditsRemaining,
    creditsUsed,
    usagePercentage,
    currentPeriodEnd,
    isActive,
}: BillingClientProps) {
    const benefits = [
        `${creditsPerMonth.toLocaleString()} créditos mensuales incluidos`,
        `Hasta ${maxAgents} agentes activos`,
        'Conexión ilimitada de canales',
        'Soporte prioritario 24/7',
        'Entrenamientos ilimitados',
        'Acceso a todas las integraciones',
    ];

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="p-4 md:p-2 max-w-[1600px] mx-auto animate-fade-in">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-2">Facturación</h1>
                <p className="text-gray-500 font-medium leading-relaxed">Gestiona tu suscripción y créditos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Subscription Status */}
                <div className="md:col-span-2 bg-gradient-to-br from-[#21AC96] to-[#1a8a78] rounded-[2rem] p-8 md:p-10 text-white shadow-xl shadow-[#21AC96]/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-10">
                            <div>
                                <div className="flex items-center gap-2.5 mb-4 px-3 py-1.5 bg-white/10 rounded-xl w-fit backdrop-blur-md border border-white/10">
                                    <CheckCircle className="w-5 h-5 text-teal-100" />
                                    <span className="text-xs font-black uppercase tracking-widest text-teal-50">Estado de suscripción</span>
                                </div>
                                <h2 className="text-white mb-2 text-4xl font-black tracking-tight">{planName}</h2>
                                <p className="text-teal-50/70 font-bold text-lg">
                                    {isActive ? 'Tu suscripción está activa' : 'Suscripción inactiva'}
                                </p>
                            </div>
                            {isActive && (
                                <div className="px-5 py-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 w-fit">
                                    <p className="text-xs text-white font-black uppercase tracking-widest">Renovación automática</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-white/10">
                            <div>
                                <p className="text-xs text-teal-100/60 mb-2 font-black uppercase tracking-widest">Próximo cobro</p>
                                <p className="text-xl text-white font-black">{formatDate(currentPeriodEnd)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-teal-100/60 mb-2 font-black uppercase tracking-widest">Monto</p>
                                <p className="text-xl text-white font-black">${planPrice.toFixed(2)} USD <span className="text-sm font-bold opacity-60">/ mes</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Credit Balance */}
                <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-start justify-between mb-8">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                                <Zap className="w-7 h-7 text-[#21AC96]" />
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo de Créditos</p>
                                <h3 className="text-gray-900 text-3xl font-black tracking-tight">{creditsRemaining.toLocaleString()}</h3>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Usados este mes</span>
                                <span className="text-gray-900 font-black">{creditsUsed.toLocaleString()}</span>
                            </div>
                            <div className="relative pt-1">
                                <div className="w-full h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#21AC96] to-[#1a8a78] rounded-full transition-all duration-1000 ease-out shadow-sm"
                                        style={{ width: `${usagePercentage}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Uso del plan</span>
                                <span className="text-lg font-black text-[#21AC96]">{usagePercentage.toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Plan Benefits */}
                <div className="md:col-span-2 bg-white rounded-[2rem] p-8 md:p-10 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-[#21AC96]/5 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-[#21AC96]" />
                        </div>
                        <h3 className="text-gray-900 text-xl font-black tracking-tight">Beneficios del plan</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/50 border border-transparent hover:border-gray-100 transition-all group">
                                <div className="w-6 h-6 bg-[#21AC96] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-transform shadow-md shadow-[#21AC96]/20">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm text-gray-700 font-bold leading-snug">{benefit}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 pt-8 border-t border-gray-100 flex justify-center sm:justify-start">
                        <button className="px-8 py-3.5 text-[#21AC96] border-2 border-[#21AC96]/10 rounded-[1.25rem] hover:bg-[#21AC96]/5 hover:border-[#21AC96]/20 transition-all font-black text-xs uppercase tracking-widest cursor-pointer active:scale-95">
                            Ver todos los planes
                        </button>
                    </div>
                </div>

                {/* Payment Method */}
                <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <h3 className="text-gray-900 text-xl font-black tracking-tight">Método de pago</h3>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[1.5rem] p-6 text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-10">
                                    <CreditCard className="w-10 h-10 opacity-60" />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Tarjeta Predeterminada</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xl font-black tracking-widest tracking-[0.2em]">•••• 4242</p>
                                    <div className="flex justify-between items-center pt-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Expira</p>
                                        <p className="text-sm font-bold opacity-80">12/25</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button className="w-full px-6 py-4 text-gray-700 border-2 border-gray-100 rounded-[1.25rem] hover:bg-gray-50 hover:border-gray-200 transition-all text-xs font-black uppercase tracking-widest cursor-pointer active:scale-95">
                            Actualizar método
                        </button>
                    </div>
                </div>
            </div>

            {/* Buy Extra Credits */}
            <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                                <Zap className="w-5 h-5" />
                            </div>
                            <h3 className="text-gray-900 text-2xl font-black tracking-tight">Comprar créditos extras</h3>
                        </div>
                        <p className="text-gray-500 font-bold leading-relaxed">Añade créditos adicionales cuando los necesites para mantener tu flujo</p>
                    </div>
                    <div className="flex items-center gap-4 bg-gray-50 px-6 py-4 rounded-[1.25rem] border border-gray-100 w-fit">
                        <input type="checkbox" id="auto-credits" className="w-5 h-5 rounded border-gray-200 text-[#21AC96] focus:ring-[#21AC96] transition-all" />
                        <label htmlFor="auto-credits" className="text-[13px] text-gray-700 font-black uppercase tracking-widest cursor-pointer">Créditos automáticos</label>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
                    {[
                        { amount: 1000, price: 10, popular: false },
                        { amount: 5000, price: 45, popular: true },
                        { amount: 10000, price: 85, popular: false },
                        { amount: 25000, price: 200, popular: false },
                    ].map((pack) => (
                        <div
                            key={pack.amount}
                            className={`relative bg-white rounded-[1.75rem] p-8 border-2 transition-all transition-transform hover:scale-[1.02] cursor-pointer hover:shadow-2xl ${pack.popular
                                ? 'border-[#21AC96] shadow-xl shadow-[#21AC96]/10'
                                : 'border-gray-50 shadow-sm hover:border-[#21AC96]/20'
                                }`}
                        >
                            {pack.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#21AC96] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#21AC96]/20">
                                    Más popular
                                </div>
                            )}
                            <div className="text-center space-y-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Paquete de</p>
                                    <p className="text-4xl text-gray-900 font-black tracking-tight">{pack.amount.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400 font-bold tracking-tight">Créditos</p>
                                </div>
                                <div className="py-4 px-6 bg-gray-50 rounded-2xl w-fit mx-auto border border-gray-100">
                                    <p className="text-xl text-gray-900 font-black tracking-tight">${pack.price} <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">USD</span></p>
                                </div>
                                <button
                                    className={`w-full px-6 py-4 rounded-[1.25rem] text-xs font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95 ${pack.popular
                                        ? 'bg-[#21AC96] text-white hover:bg-[#1a8a78] shadow-lg shadow-[#21AC96]/20'
                                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    Comprar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-10 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <input
                                type="number"
                                placeholder="Carga personalizada..."
                                className="w-full pl-6 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.25rem] focus:outline-none focus:bg-white focus:border-[#21AC96] transition-all font-black text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-3 px-6 py-4 bg-[#21AC96]/5 rounded-2xl border border-[#21AC96]/10">
                            <Zap className="w-4 h-4 text-[#21AC96]" />
                            <span className="text-sm text-[#21AC96] font-black uppercase tracking-widest">$0.01 por crédito</span>
                        </div>
                    </div>
                    <button className="w-full md:w-auto px-12 py-4 bg-[#21AC96] text-white rounded-[1.25rem] hover:bg-[#1a8a78] transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-[#21AC96]/20 active:scale-95 cursor-pointer">
                        Comprar ahora
                    </button>
                </div>
            </div>
        </div>
    );
}
