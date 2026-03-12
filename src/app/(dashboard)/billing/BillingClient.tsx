"use client"

import { CheckCircle, CreditCard, Zap, AlertCircle, Loader2, X, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createCustomerPortal, buyCredits } from '@/lib/actions/billing';
import { toast } from 'sonner';
import { useSearchParams, useRouter } from 'next/navigation';

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
    isOverdue?: boolean;
    isTrial?: boolean;
    cardDetails?: {
        last4: string;
        brand: string;
        expMonth: number;
        expYear: number;
    } | null;
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
    isOverdue = false,
    isTrial = false,
    cardDetails,
}: BillingClientProps) {
    const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
    const [isLoadingPortal, setIsLoadingPortal] = useState(false);
    const [isLoadingCredits, setIsLoadingCredits] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [selectedPlanDetails, setSelectedPlanDetails] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        if (searchParams.get('success')) {
            toast.success("¡Créditos añadidos con éxito!");
            router.replace('/billing');
        }
        if (searchParams.get('canceled')) {
            toast.error("Compra cancelada");
            router.replace('/billing');
        }
    }, [searchParams, router]);

    const PLAN_DETAILS = {
        'BASIC': {
            price: 75,
            benefits: [
                '1,200 mensajes mensuales incluidos',
                '1 Agente IA activo',
                '2 Usuarios de equipo',
                'Entrenamientos ilimitados',
                'Soporte por Email',
                'Acceso a integraciones básicas'
            ]
        },
        'STARTER': {
            price: 135,
            benefits: [
                'Hasta 2,500 mensajes al mes',
                '3 Agentes IA activos',
                '6 Usuarios de equipo',
                'Integración con Web, WhatsApp, Instagram y Facebook',
                'Procesamiento de notas de voz e imágenes',
                'Conexión con calendarios para agendamientos',
                'Filtrado de prospectos por campos personalizados',
                'Capacidad de envío de WhatsApp masivos de forma oficial con META',
                'Función de análisis y revisión de 1 bandeja de email',
                'Conexión con Paguelo Facil y Yappy comercial para cobros (BETA)',
                'Soporte por Email y Chat',
                'Panel de analítica avanzada'
            ]
        },
        'BUSINESS': {
            price: 245,
            benefits: [
                'Hasta 7,500 mensajes al mes',
                '6 Agentes IA activos',
                '12 Usuarios de equipo',
                'Integración con Web, WhatsApp, Instagram y Facebook',
                'Procesamiento de notas de voz e imágenes',
                'Conexión con calendarios para agendamientos',
                'Filtrado de prospectos por campos personalizados',
                'Capacidad de envío de WhatsApp masivos de forma oficial con META',
                'Función de análisis y revisión de 1 bandeja de email',
                'Conexión con Paguelo Facil y Yappy comercial para cobros (BETA)',
                'Soporte prioritario por Email y Chat',
                'Panel de analítica avanzada'
            ]
        },
        'ENTERPRISE': {
            price: 475,
            benefits: [
                'Hasta 25,000 mensajes al mes',
                '12 Agentes IA activos',
                '20 Usuarios de equipo',
                'Integración con Web, WhatsApp, Instagram y Facebook',
                'Procesamiento de notas de voz e imágenes',
                'Conexión con calendarios para agendamientos',
                'Filtrado de prospectos por campos personalizados',
                'Capacidad de envío de WhatsApp masivos de forma oficial con META',
                'Función de análisis y revisión de 1 bandeja de email',
                'Conexión con Paguelo Facil y Yappy comercial para cobros (BETA)',
                'Soporte prioritario por Email, Chat y videollamada',
                'Panel de analítica avanzada'
            ]
        }
    };

    // Mapping for whitelist or legacy plans to normalized names
    const normalizedPlanName = (name: string) => {
        const n = name.toUpperCase();
        if (n.includes('BUSINESS')) return 'BUSINESS';
        if (n.includes('ENTERPRISE')) return 'ENTERPRISE';
        if (n.includes('STARTER')) return 'STARTER';
        if (n.includes('BASIC')) return 'BASIC';
        return 'STARTER'; // Default/Fallback
    };

    const currentPlanKey = normalizedPlanName(planName);
    const benefits = PLAN_DETAILS[currentPlanKey as keyof typeof PLAN_DETAILS]?.benefits || [
        `${creditsPerMonth.toLocaleString()} créditos mensuales incluidos`,
        `Hasta ${maxAgents} agentes activos`,
        'Conexión ilimitada de canales',
    ];

    const getPlanPriority = (key: string) => {
        const priorities: Record<string, number> = { 'BASIC': 1, 'STARTER': 2, 'BUSINESS': 3, 'ENTERPRISE': 4 };
        return priorities[key] || 0;
    };

    const getPlanButtonText = (planKey: string) => {
        if (planKey === currentPlanKey) return 'Mi plan actual';
        
        const currentPriority = getPlanPriority(currentPlanKey);
        const targetPriority = getPlanPriority(planKey);
        
        if (targetPriority > currentPriority) return 'Mejorar Plan';
        return 'Cambiar a este plan';
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleOpenPortal = async () => {
        try {
            setIsLoadingPortal(true);
            const result = await createCustomerPortal();
            if (result.url) {
                window.location.href = result.url;
            }
        } catch (error: any) {
            toast.error(error.message || "No se pudo abrir el portal de pagos");
        } finally {
            setIsLoadingPortal(false);
        }
    };

    const handleBuyCredits = async (amount: number) => {
        if (!amount || amount <= 0) {
            toast.error("Por favor ingresa un monto válido");
            return;
        }
        try {
            setIsLoadingCredits(amount);
            const result = await buyCredits(amount);
            if (result.url) {
                window.location.href = result.url;
            }
        } catch (error: any) {
            toast.error(error.message || "No se pudo iniciar la compra");
        } finally {
            setIsLoadingCredits(null);
        }
    };

    return (
        <div className="p-4 md:p-2 max-w-[1600px] mx-auto animate-fade-in relative">
            <div className="mb-10">
                <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-2">Facturación</h1>
                <p className="text-gray-500 font-medium leading-relaxed">Gestiona tu suscripción y créditos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className={`md:col-span-2 rounded-[2rem] p-8 md:p-10 text-white shadow-xl relative overflow-hidden transition-all duration-500 ${
                    isOverdue 
                    ? 'bg-gradient-to-br from-red-600 via-red-800 to-black shadow-red-900/20' 
                    : 'bg-gradient-to-br from-[#21AC96] to-[#1a8a78] shadow-[#21AC96]/10'
                }`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-10">
                            <div>
                                <div className="flex items-center gap-2.5 mb-4 px-3 py-1.5 bg-white/10 rounded-xl w-fit backdrop-blur-md border border-white/10">
                                    {isOverdue ? <AlertCircle className="w-5 h-5 text-red-200" /> : <CheckCircle className="w-5 h-5 text-teal-100" />}
                                    <span className="text-xs font-black uppercase tracking-widest text-teal-50">Estado de suscripción</span>
                                </div>
                                <div className="flex items-center gap-4 mb-2">
                                    <h2 className="text-white text-4xl font-black tracking-tight">{planName}</h2>
                                    {isOverdue && (
                                        <div className="px-3 py-1 bg-white text-red-600 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                            Pago Pendiente
                                        </div>
                                    )}
                                </div>
                                <p className={`font-bold text-lg ${isOverdue ? 'text-red-200' : 'text-teal-50/70'}`}>
                                    {isOverdue 
                                        ? 'Acción requerida: Tu pago ha fallado' 
                                        : isActive 
                                            ? (isTrial ? 'Estás probando Kônsul' : 'Tu suscripción está activa') 
                                            : 'Suscripción inactiva'}
                                </p>
                            </div>
                            {isActive && !isOverdue && (
                                <div className="px-5 py-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 w-fit">
                                    <p className="text-xs text-white font-black uppercase tracking-widest">Renovación automática</p>
                                </div>
                            )}
                            {isOverdue && (
                                <button 
                                    onClick={handleOpenPortal}
                                    disabled={isLoadingPortal}
                                    className="px-6 py-3 bg-white text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    {isLoadingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                    Regularizar Pago
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-white/10">
                            <div>
                                <p className={`text-xs mb-2 font-black uppercase tracking-widest ${isOverdue ? 'text-red-200/60' : 'text-teal-100/60'}`}>
                                    {isOverdue ? 'Pago atrasado desde' : 'Próximo cobro'}
                                </p>
                                <p className="text-xl text-white font-black">{formatDate(currentPeriodEnd)}</p>
                            </div>
                            <div>
                                <p className={`text-xs mb-2 font-black uppercase tracking-widest ${isOverdue ? 'text-red-200/60' : 'text-teal-100/60'}`}>Monto</p>
                                <p className="text-xl text-white font-black">${planPrice.toFixed(2)} USD <span className="text-sm font-bold opacity-60">/ mes</span></p>
                            </div>
                        </div>
                    </div>
                </div>

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
                        <button 
                            onClick={() => setIsPlansModalOpen(true)}
                            className="px-8 py-3.5 text-[#21AC96] border-2 border-[#21AC96]/10 rounded-[1.25rem] hover:bg-[#21AC96]/5 hover:border-[#21AC96]/20 transition-all font-black text-xs uppercase tracking-widest cursor-pointer active:scale-95 flex items-center gap-2"
                        >
                            Ver todos los planes
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="relative overflow-hidden bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <h3 className="text-gray-900 text-xl font-black tracking-tight">Método de pago</h3>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className={`rounded-[1.5rem] p-6 text-white shadow-xl relative overflow-hidden group transition-all duration-500 ${isOverdue ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gradient-to-br from-indigo-500 to-indigo-700'}`}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-10">
                                    <div className="flex flex-col items-start gap-1">
                                        <CreditCard className={`w-10 h-10 ${isOverdue ? 'animate-pulse text-white' : 'opacity-60'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-2">{cardDetails?.brand || 'TARJETA'}</span>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Tarjeta Predeterminada</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xl font-black tracking-widest tracking-[0.2em]">
                                        {cardDetails ? `•••• ${cardDetails.last4}` : '•••• •••• •••• ••••'}
                                    </p>
                                    <div className="flex justify-between items-center pt-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Expira</p>
                                        <p className="text-sm font-bold opacity-80">
                                            {cardDetails ? `${cardDetails.expMonth}/${cardDetails.expYear.toString().slice(-2)}` : '•• / ••'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleOpenPortal}
                            disabled={isLoadingPortal}
                            className={`w-full px-6 py-4 rounded-[1.25rem] transition-all text-xs font-black uppercase tracking-widest cursor-pointer active:scale-95 flex items-center justify-center gap-2 ${
                                isOverdue 
                                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20' 
                                : 'text-gray-700 border-2 border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                            }`}
                        >
                            {isLoadingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                            {isOverdue ? 'Saldar Deuda ahora' : 'Actualizar método'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="relative overflow-hidden bg-white rounded-[2rem] p-8 md:p-12 border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
                    {[
                        { amount: 500, price: 25, popular: false },
                        { amount: 1000, price: 50, popular: false },
                        { amount: 2000, price: 95, popular: true },
                        { amount: 5000, price: 150, popular: false },
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
                                    disabled={isLoadingCredits !== null}
                                    onClick={() => handleBuyCredits(pack.amount)}
                                    className={`w-full px-6 py-4 rounded-[1.25rem] text-xs font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 ${pack.popular
                                        ? 'bg-[#21AC96] text-white hover:bg-[#1a8a78] shadow-lg shadow-[#21AC96]/20'
                                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    {isLoadingCredits === pack.amount ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                placeholder="Carga personalizada..."
                                className="w-full pl-6 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.25rem] focus:outline-none focus:bg-white focus:border-[#21AC96] transition-all font-black text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <Zap className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-500 font-black uppercase tracking-widest">$0.05 <span className="text-[10px] opacity-60">por crédito</span></span>
                            </div>
                            {customAmount && parseInt(customAmount) > 0 && (
                                <div className="flex items-center gap-3 px-6 py-4 bg-[#21AC96]/5 rounded-2xl border border-[#21AC96]/20 animate-in fade-in slide-in-from-left-4 duration-500">
                                    <span className="text-xs text-[#21AC96] font-bold uppercase tracking-widest">Total:</span>
                                    <span className="text-lg text-[#21AC96] font-black">${(parseInt(customAmount) * 0.05).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <button 
                        disabled={isLoadingCredits !== null || !customAmount || parseInt(customAmount) <= 0}
                        onClick={() => handleBuyCredits(parseInt(customAmount))}
                        className="w-full md:w-auto px-12 py-4 bg-[#21AC96] text-white rounded-[1.25rem] hover:bg-[#1a8a78] transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-[#21AC96]/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                    >
                        {isLoadingCredits === parseInt(customAmount) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Comprar ahora
                    </button>
                </div>
            </div>
            {/* Modal de Planes */}
            {isPlansModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsPlansModalOpen(false)}></div>
                    <div className="relative bg-[#F3F4F6] w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-[2.5rem] shadow-2xl p-6 md:p-10 animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setIsPlansModalOpen(false)}
                            className="absolute top-8 right-8 p-2 bg-white rounded-full text-gray-400 hover:text-gray-900 transition-colors z-10"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Top: Basic Plan Horizontal */}
                        <div 
                            onClick={() => setSelectedPlanDetails('BASIC')}
                            className={`mb-8 bg-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-2 shadow-sm transition-all hover:scale-[1.01] cursor-pointer ${currentPlanKey === 'BASIC' ? 'border-[#21AC96] bg-teal-50/10' : 'border-gray-100 hover:border-[#21AC96]/50'}`}
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-2xl font-black text-gray-900">Basic</h3>
                                    {currentPlanKey === 'BASIC' && (
                                        <span className="px-2 py-0.5 bg-[#21AC96] text-white text-[8px] font-black uppercase rounded-md">Tu Plan</span>
                                    )}
                                </div>
                                <p className="text-gray-500 text-sm font-medium">Ideal para quienes no tienen mucho volumen de consultas o leads.</p>
                                <div className="flex flex-wrap gap-4 mt-4">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-800 rounded-xl text-xs font-black">
                                        <CheckCircle className="w-3.5 h-3.5 text-[#21AC96]" />
                                        1,200 mensajes/mes
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-800 rounded-xl text-xs font-black">
                                        <CheckCircle className="w-3.5 h-3.5 text-[#21AC96]" />
                                        1 Agente IA
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-800 rounded-xl text-xs font-black">
                                        <CheckCircle className="w-3.5 h-3.5 text-[#21AC96]" />
                                        2 Usuarios de equipo
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-[#21AC96] font-bold uppercase underline decoration-2 underline-offset-4 ml-auto">
                                        Ver todos los detalles
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <p className="text-4xl font-black text-gray-900">$75 <span className="text-sm font-bold text-gray-400">/mes</span></p>
                                </div>
                                <button 
                                    disabled={isLoadingPortal}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenPortal();
                                    }}
                                    className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 border-2 ${
                                        currentPlanKey === 'BASIC' 
                                        ? 'bg-white text-[#21AC96] border-[#21AC96] shadow-md' 
                                        : 'bg-white text-[#21AC96] border-[#21AC96] hover:bg-[#21AC96] hover:text-white'
                                    }`}
                                >
                                    {isLoadingPortal && currentPlanKey === 'BASIC' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {getPlanButtonText('BASIC')}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { 
                                    key: 'STARTER',
                                    name: 'Starter', 
                                    price: 135, 
                                    desc: 'Ideal para PYMES que inician a automatizar.', 
                                    popular: false,
                                    bullets: [
                                        'Hasta 2,500 mensajes al mes',
                                        '3 Agente IA',
                                        '4 Usuarios de equipo',
                                        'Panel de analítica avanzada'
                                    ]
                                },
                                { 
                                    key: 'BUSINESS',
                                    name: 'Business', 
                                    price: 245, 
                                    desc: 'El favorito de empresas listas para escalar.', 
                                    popular: true,
                                    bullets: [
                                        'Hasta 7,500 mensajes al mes',
                                        '6 Agente IA',
                                        '8 Usuarios de equipo',
                                        'Soporte prioritario Email/Chat'
                                    ]
                                },
                                { 
                                    key: 'ENTERPRISE',
                                    name: 'Enterprise', 
                                    price: 475, 
                                    desc: 'Potencia total para tu negocio.', 
                                    popular: false,
                                    bullets: [
                                        'Hasta 25,000 mensajes al mes',
                                        '12 Agente IA',
                                        '20 Usuarios de equipo',
                                        'Soporte avanzado'
                                    ]
                                }
                            ].map((plan) => (
                                <div 
                                    key={plan.name} 
                                    onClick={() => setSelectedPlanDetails(plan.key)}
                                    className={`relative bg-white rounded-[2.5rem] p-8 flex flex-col border-2 transition-all hover:translate-y-[-8px] cursor-pointer ${plan.popular || plan.key === currentPlanKey ? 'border-[#21AC96] shadow-xl' : 'border-gray-100 shadow-sm hover:border-[#21AC96]/50'} ${plan.key === currentPlanKey ? 'bg-teal-50/5' : ''}`}
                                >
                                    {plan.popular && plan.key !== currentPlanKey && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#21AC96] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                                            MÁS POPULAR
                                        </div>
                                    )}
                                    {plan.key === currentPlanKey && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#1e293b] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border-2 border-white">
                                            TU PLAN ACTUAL
                                        </div>
                                    )}
                                    <div className="mb-4">
                                        <h3 className="text-2xl font-black text-gray-900 mb-1">{plan.name}</h3>
                                        <p className="text-4xl font-black text-gray-900 mb-2">${plan.price} <span className="text-sm font-bold text-gray-400">/mes</span></p>
                                        <p className="text-gray-500 text-[13px] font-medium leading-relaxed">{plan.desc}</p>
                                    </div>
                                    
                                    <div className="space-y-4 mb-8 flex-1">
                                        {plan.bullets.map((bullet, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.key === currentPlanKey || plan.popular ? 'text-[#21AC96]' : 'text-gray-300'}`} />
                                                <span className="text-[13px] text-gray-600 font-bold leading-tight">{bullet}</span>
                                            </div>
                                        ))}
                                        <div className="pt-2 text-[10px] text-[#21AC96] font-black uppercase tracking-widest underline decoration-2 underline-offset-4">
                                            Ver todos los beneficios
                                        </div>
                                    </div>

                                    <button 
                                        disabled={isLoadingPortal}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenPortal();
                                        }}
                                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border-2 ${
                                            plan.key === currentPlanKey
                                            ? 'bg-transparent text-[#21AC96] border-[#21AC96] hover:bg-[#21AC96]/5'
                                            : 'bg-white text-[#21AC96] border-[#21AC96] hover:bg-[#21AC96] hover:text-white'
                                        }`}
                                    >
                                        {isLoadingPortal && plan.key === currentPlanKey ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        {getPlanButtonText(plan.key)}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalles del Plan */}
            {selectedPlanDetails && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedPlanDetails(null)}></div>
                    <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 md:p-12 animate-in zoom-in-95 duration-200 overflow-hidden">
                        <button 
                            onClick={() => setSelectedPlanDetails(null)}
                            className="absolute top-8 right-8 p-2 text-gray-400 hover:text-gray-900 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="mb-8 text-center">
                            <h2 className="text-4xl font-black text-gray-900 mb-2">{selectedPlanDetails}</h2>
                            <p className="text-[#21AC96] text-5xl font-black">
                                ${PLAN_DETAILS[selectedPlanDetails as keyof typeof PLAN_DETAILS]?.price}
                                <span className="text-base font-bold text-gray-400 ml-1">USD/mes</span>
                            </p>
                        </div>

                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
                            {PLAN_DETAILS[selectedPlanDetails as keyof typeof PLAN_DETAILS]?.benefits.map((benefit, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 group transition-colors hover:bg-teal-50/30 hover:border-teal-100">
                                    <div className="w-6 h-6 bg-[#21AC96] rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-[#21AC96]/20">
                                        <CheckCircle className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-sm text-gray-700 font-bold leading-snug">{benefit}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10">
                            <button
                                onClick={() => {
                                    setSelectedPlanDetails(null);
                                    handleOpenPortal();
                                }}
                                className="w-full py-5 bg-[#21AC96] text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-[#21AC96]/30 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                {selectedPlanDetails === currentPlanKey ? 'Ir a mi panel de pagos' : 'Cambiar a este plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
