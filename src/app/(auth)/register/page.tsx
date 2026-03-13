'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { registerUser } from '@/lib/actions/auth';

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: Plans, 2: Form
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);
    const [success, setSuccess] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('STARTER');
    const [selectedPlanDetails, setSelectedPlanDetails] = useState<any>(null);

    const plans = [
        {
            id: 'BASIC',
            name: 'Basic',
            price: 75,
            description: 'La opción esencial para empezar.',
            features: [
                '1,200 mensajes mensuales',
                '1 Agente IA activo',
                '2 Usuarios de equipo',
                'Soporte por Email'
            ],
            benefits: [
                '1,200 mensajes mensuales incluidos',
                '1 Agente IA activo',
                '2 Usuarios de equipo',
                'Entrenamientos ilimitados',
                'Soporte por Email',
                'Acceso a integraciones básicas'
            ]
        },
        {
            id: 'STARTER',
            name: 'Starter',
            price: 135,
            description: 'Ideal para PYMES que inician a automatizar.',
            features: [
                'Hasta 2,500 mensajes al mes',
                '3 Agentes IA activos',
                '6 Usuarios de equipo',
                'Soporte (2 Canales)'
            ],
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
        {
            id: 'BUSINESS',
            name: 'Business',
            price: 245,
            description: 'El favorito de empresas listas para escalar.',
            features: [
                'Hasta 7,500 mensajes al mes',
                '6 Agentes IA activos',
                '12 Usuarios de equipo',
                'Soporte Prioritario (2 Canales)'
            ],
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
            ],
            popular: true
        },
        {
            id: 'ENTERPRISE',
            name: 'Enterprise',
            price: 475,
            description: 'Potencia total para tu negocio.',
            features: [
                'Hasta 25,000 mensajes al mes',
                '12 Agentes IA activos',
                '20 Usuarios de equipo',
                'Soporte Prioritario(3 Canales)'
            ],
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
    ];

    const currentPlan = plans.find(p => p.id === selectedPlan);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        formData.set('planType', selectedPlan);
        formData.set('trial', 'on');

        try {
            const result = await registerUser(null, formData);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
            } else if (result?.success) {
                if (result.checkoutUrl) {
                    window.location.href = result.checkoutUrl;
                } else {
                    setSuccess(true);
                    setTimeout(() => {
                        router.push('/login');
                    }, 2000);
                }
            }
        } catch (err) {
            setError({ form: ['Ocurrió un error al registrarse. Inténtalo de nuevo.'] });
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500 max-w-md mx-auto">
                <div className="w-20 h-20 bg-[#21AC96]/10 rounded-full flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 bg-[#21AC96]/20 rounded-full animate-ping opacity-20"></div>
                    <CheckCircle2 className="w-12 h-12 text-[#21AC96] relative z-10" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">¡Bienvenido a Kônsul!</h2>
                <p className="text-gray-500 text-sm font-medium">Tu cuenta ha sido creada con éxito.</p>
                <p className="text-gray-400 text-xs mt-1">Redirigiéndote...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1200px] mx-auto relative">
            {/* Plan Details Modal */}
            {selectedPlanDetails && (
                <div 
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setSelectedPlanDetails(null)}
                >
                    <div 
                        className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-8 pb-4 flex justify-between items-start">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-2">
                                    Plan {selectedPlanDetails.name}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-[#21AC96]">${selectedPlanDetails.price}</span>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">/mes</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedPlanDetails(null)}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="px-8 py-4 overflow-y-auto flex-grow">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Lo que incluye este plan:</p>
                            <div className="grid grid-cols-1 gap-y-4">
                                {selectedPlanDetails.benefits.map((benefit: string, i: number) => (
                                    <div key={i} className="flex items-start gap-4 group">
                                        <div className="w-6 h-6 rounded-lg bg-[#21AC96]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#21AC96] transition-colors">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-[#21AC96] group-hover:text-white transition-colors" />
                                        </div>
                                        <span className="text-sm text-gray-700 font-bold leading-tight pt-0.5">{benefit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 pt-4">
                            <button
                                onClick={() => {
                                    setSelectedPlan(selectedPlanDetails.id);
                                    setSelectedPlanDetails(null);
                                    setStep(2);
                                }}
                                className="w-full py-5 bg-[#21AC96] hover:bg-[#1a8a78] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#21AC96]/20 transition-all active:scale-[0.98]"
                            >
                                Seleccionar este plan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">Automatiza y Vende Más</h2>
                <div className="mt-5 inline-flex items-center gap-2.5 bg-[#21AC96]/10 border border-[#21AC96]/20 px-6 py-2.5 rounded-full shadow-[0_4px_20px_rgba(33,172,150,0.08)] transition-all hover:scale-[1.02] cursor-default animate-in slide-in-from-top-2 duration-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#21AC96]" />
                    <span className="text-[10px] font-black text-gray-900 tracking-[0.2em] uppercase">4 DÍAS DE PRUEBA GRATIS INCLUIDOS</span>
                </div>
            </div>

            {step === 1 ? (
                <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between mb-2 px-4">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Selecciona tu plan</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`relative flex flex-col p-6 rounded-[2rem] border-[3px] transition-all group h-full ${selectedPlan === plan.id
                                    ? 'border-[#21AC96] bg-[#21AC96]/5 shadow-xl shadow-[#21AC96]/5'
                                    : 'border-[#21AC96]/10 bg-white hover:border-[#21AC96]/30 shadow-sm'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-6 px-4 py-1.5 bg-[#21AC96] text-white text-[9px] font-black uppercase tracking-[0.15em] rounded-full shadow-lg z-10">
                                        Más popular
                                    </div>
                                )}

                                <div className="mb-4 flex justify-between items-start">
                                    <div>
                                        <h4 className={`text-xl font-black ${selectedPlan === plan.id ? 'text-[#21AC96]' : 'text-gray-900 group-hover:text-[#21AC96]'} transition-colors tracking-tight mb-1`}>
                                            {plan.name}
                                        </h4>
                                        <p className="text-gray-500 text-[10px] font-medium leading-tight max-w-[150px]">{plan.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-gray-900 leading-none">${plan.price}</div>
                                        <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">/mes</div>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6 flex-grow">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${selectedPlan === plan.id ? 'bg-[#21AC96]/10' : 'bg-gray-100'}`}>
                                                <CheckCircle2 className={`w-2.5 h-2.5 ${selectedPlan === plan.id ? 'text-[#21AC96]' : 'text-gray-400'}`} />
                                            </div>
                                            <span className="text-[10px] text-gray-600 font-bold tracking-tight">{feature}</span>
                                        </div>
                                    ))}
                                    
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPlanDetails(plan);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#21AC96]/5 hover:bg-[#21AC96]/10 text-[9px] font-black text-[#21AC96] uppercase mt-2 tracking-widest rounded-lg transition-all"
                                    >
                                        <AlertCircle className="w-3 h-3" />
                                        Ver detalles
                                    </button>
                                </div>

                                <button 
                                    onClick={() => {
                                        setSelectedPlan(plan.id);
                                        setStep(2);
                                    }}
                                    className={`w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] transition-all border-2 ${
                                        selectedPlan === plan.id 
                                        ? 'bg-[#21AC96] text-white border-[#21AC96] shadow-lg shadow-[#21AC96]/10' 
                                        : 'bg-white text-[#21AC96] border-[#21AC96] hover:bg-[#21AC96] hover:text-white shadow-sm'
                                    }`}
                                >
                                    Elegir Plan
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="text-center pt-4">
                        <Link href="/login" className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-[0.15em] transition-colors">
                            Regresar a inicio de sesión
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="max-w-[1000px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Left Side: Selected Plan Compact Card */}
                        <div className="space-y-4">
                            <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-100 shadow-xl shadow-gray-100/50">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[#21AC96] rounded-xl flex items-center justify-center font-black text-lg text-white shadow-lg shadow-[#21AC96]/20">
                                            {currentPlan?.name[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 text-base tracking-tight leading-tight">Plan {currentPlan?.name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#21AC96] animate-pulse"></div>
                                                <p className="text-[8px] text-[#21AC96] font-black uppercase tracking-widest">Plan Seleccionado</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setStep(1)}
                                        className="text-[9px] font-black text-gray-400 hover:text-[#21AC96] uppercase tracking-widest px-3 py-1.5 bg-gray-50 hover:bg-[#21AC96]/5 rounded-lg transition-all"
                                    >
                                        Cambiar
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-y-3 mb-6">
                                    {currentPlan?.features.slice(0, 4).map((feature, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-[#21AC96]" />
                                            <span className="text-[11px] text-gray-600 font-bold tracking-tight">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                                    <div>
                                        <span className="text-3xl font-black text-gray-900 leading-none">${currentPlan?.price}</span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">/mes</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-[#21AC96]/5 p-4 rounded-2xl border border-[#21AC96]/10">
                                <p className="text-[10px] text-gray-500 font-bold leading-relaxed text-center">
                                    No se realizará ningún cobro hoy. <br />
                                    <span className="text-[#21AC96]">Comienza a automatizar ahora.</span>
                                </p>
                            </div>
                        </div>

                        {/* Right Side: Form Compact */}
                        <div className="bg-gray-50 p-8 lg:p-10 rounded-[2.5rem] border border-gray-100">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="mb-4">
                                    <h3 className="text-xl font-black text-gray-900 mb-1 tracking-tight">Tus datos</h3>
                                    <p className="text-gray-500 text-[11px] font-medium tracking-tight">Registra tu cuenta ahora.</p>
                                </div>

                                {error?.form && (
                                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-xl text-[10px] flex items-center gap-2 animate-shake">
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="font-bold">{error.form[0]}</span>
                                    </div>
                                )}

                                <div className="group space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.1em] ml-1">Nombre completo</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#21AC96]" />
                                        <input
                                            name="name"
                                            type="text"
                                            required
                                            className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:border-[#21AC96] text-gray-900 placeholder:text-gray-400 font-bold text-xs transition-all"
                                            placeholder="Juan Pérez"
                                        />
                                    </div>
                                </div>

                                <div className="group space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.1em] ml-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#21AC96]" />
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:border-[#21AC96] text-gray-900 placeholder:text-gray-400 font-bold text-xs transition-all"
                                            placeholder="nombre@empresa.com"
                                        />
                                    </div>
                                </div>

                                <div className="group space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.1em] ml-1">Contraseña</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#21AC96]" />
                                        <input
                                            name="password"
                                            type="password"
                                            required
                                            className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:border-[#21AC96] text-gray-900 placeholder:text-gray-400 font-bold text-xs transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-[#21AC96] hover:bg-[#1a8a78] text-white rounded-xl font-black text-[11px] uppercase tracking-[0.15em] shadow-lg shadow-[#21AC96]/10 transition-all active:scale-[0.98] disabled:opacity-70 mt-4"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Crear cuenta</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
