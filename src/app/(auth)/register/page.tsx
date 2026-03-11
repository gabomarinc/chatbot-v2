'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { registerUser } from '@/lib/actions/auth';

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);
    const [success, setSuccess] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('STARTER');
    const [isTrial] = useState(true); // Mandatory trial
    const [showTrialModal, setShowTrialModal] = useState(false);

    const plans = [
        {
            id: 'BASIC',
            name: 'Basic',
            price: 75,
            description: 'La opción esencial para empezar.',
            features: [
                'Hasta 1,200 mensajes al mes',
                '1 Agente IA',
                '2 Usuarios de equipo',
                'Panel de analítica básica'
            ]
        },
        {
            id: 'STARTER',
            name: 'Starter',
            price: 135,
            description: 'Ideal para PYMES que inician a automatizar.',
            features: [
                'Hasta 2,500 mensajes al mes',
                '3 Agente IA',
                '4 Usuarios de equipo',
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
                '6 Agente IA',
                '8 Usuarios de equipo',
                'Soporte prioritario por Email y Chat'
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
                '12 Agente IA',
                '20 Usuarios de equipo',
                'Soporte por Email, Chat y videollamada'
            ]
        }
    ];

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Show the trial info modal before submitting if they haven't seen it
        // Or just submit while they know it's a trial. 
        // User asked for a popup when clicking plan or register.
        // Let's make it so they can see the info first.
        if (!showTrialModal) {
            setShowTrialModal(true);
            return;
        }

        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        formData.set('planType', selectedPlan);
        formData.set('trial', 'on'); // Always on

        try {
            const result = await registerUser(null, formData);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
                setShowTrialModal(false);
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto relative pb-10">
            {/* Trial Info Modal */}
            {showTrialModal && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 overflow-y-auto isolate">
                    {/* Decorative background elements for fullscreen feel */}
                    <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[#21AC96]/5 rounded-full blur-[100px] -mr-20 -mt-20 -z-10"></div>
                    <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#21AC96]/5 rounded-full blur-[100px] -ml-20 -mb-20 -z-10"></div>

                    <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in-95 duration-500">
                        <div>
                            <div className="w-20 h-20 bg-[#21AC96]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#21AC96]/10 rotate-3 transition-transform hover:rotate-0 duration-500">
                                <CheckCircle2 className="w-10 h-10 text-[#21AC96]" />
                            </div>

                            <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
                                Tu prueba gratuita <br /><span className="text-[#21AC96]">está lista</span>
                            </h3>

                            <p className="text-gray-500 text-lg font-medium leading-relaxed">
                                Obtendrás <span className="text-gray-900 font-bold">4 días de acceso total</span> a todas las herramientas de Kônsul sin costo inicial.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {[
                                'Acceso a todos los agentes IA',
                                'WhatsApp e integración Web',
                                'Sin permanencia obligatoria'
                            ].map((feature, i) => (
                                <div key={i} className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 group hover:border-[#21AC96]/20 transition-all duration-300">
                                    <div className="w-6 h-6 bg-[#21AC96] rounded-lg flex items-center justify-center shadow-lg shadow-[#21AC96]/20 group-hover:scale-110 transition-transform">
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-sm font-black text-gray-700 tracking-tight">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 space-y-4">
                            <button
                                onClick={() => {
                                    setShowTrialModal(false);
                                    const form = document.querySelector('form');
                                    if (form) form.requestSubmit();
                                }}
                                className="w-full py-5 bg-[#21AC96] hover:bg-[#1a8a78] text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-[#21AC96]/20 transition-all active:scale-[0.98] group flex items-center justify-center gap-3 h-16"
                            >
                                Empezar prueba ahora
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <button
                                onClick={() => setShowTrialModal(false)}
                                className="text-[10px] font-black text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-[0.2em] py-2"
                            >
                                Volver a revisar planes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="text-center mb-6">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">Crea tu cuenta profesional</h2>
                <div className="mt-4 inline-flex items-center gap-3 bg-[#21AC96]/5 border border-[#21AC96]/20 px-5 py-2 rounded-2xl">
                    <div className="w-6 h-6 bg-[#21AC96] rounded-lg flex items-center justify-center shadow-lg shadow-[#21AC96]/20">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <p className="text-xs font-black text-gray-900 tracking-tight">4 DÍAS DE FREE TRIAL INCLUIDO EN TODO</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Side: Plans Selection */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Selecciona tu plan</h3>
                        <div className="flex items-center gap-2 p-1.5 bg-gray-100/50 rounded-xl border border-gray-200/50 backdrop-blur-sm">
                            <div className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] bg-[#21AC96] text-white shadow-md shadow-[#21AC96]/10">
                                Trial Activo
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                onClick={() => {
                                    setSelectedPlan(plan.id);
                                    setShowTrialModal(true);
                                }}
                                className={`relative flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-[2rem] border-[2px] transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99] ${selectedPlan === plan.id
                                    ? 'border-[#21AC96] bg-[#21AC96]/5 shadow-xl shadow-[#21AC96]/5'
                                    : 'border-transparent bg-white hover:border-[#21AC96]/20 shadow-sm'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-6 px-4 py-1.5 bg-[#21AC96] text-white text-[9px] font-black uppercase tracking-[0.15em] rounded-full shadow-lg shadow-[#21AC96]/10 z-10">
                                        Más popular
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <h4 className={`text-xl font-black ${selectedPlan === plan.id ? 'text-[#21AC96]' : 'text-gray-900 group-hover:text-[#21AC96]'} transition-colors tracking-tight`}>
                                            {plan.name}
                                        </h4>
                                        <p className="text-gray-500 text-xs font-medium pr-6 leading-relaxed">{plan.description}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                                        {plan.features.slice(0, 2).map((feature, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${selectedPlan === plan.id ? 'bg-[#21AC96]/10' : 'bg-gray-100'}`}>
                                                    <CheckCircle2 className={`w-3 h-3 ${selectedPlan === plan.id ? 'text-[#21AC96]' : 'text-gray-400'}`} />
                                                </div>
                                                <span className="text-[10px] text-gray-600 font-bold tracking-tight">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-6 sm:mt-0 sm:text-right flex sm:flex-col items-center sm:items-end gap-5 sm:gap-1 pl-4 border-l border-dashed border-gray-100 sm:border-none">
                                    <div className="flex flex-col items-end leading-none">
                                        <span className="text-3xl font-black text-gray-900">
                                            ${plan.price}
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">/mes</span>
                                    </div>
                                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-[0.1em] rounded-lg shadow-sm border border-amber-200/50">
                                        4 Días Gratis
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Registration Form */}
                <div className="lg:col-span-5 bg-gray-100/30 rounded-[2.5rem] p-8 border border-gray-200/50 backdrop-blur-sm flex flex-col justify-center">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="mb-6">
                            <h3 className="text-xl font-black text-gray-900 mb-1 tracking-tight">Tus datos</h3>
                            <p className="text-gray-500 text-xs font-medium tracking-tight">Empieza tu prueba gratuita hoy.</p>
                        </div>

                        {error?.form && (
                            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-[1.25rem] text-[11px] flex items-center gap-3 animate-shake shadow-sm mb-4">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span className="font-bold">{error.form[0]}</span>
                            </div>
                        )}

                        <div className="group space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-[#21AC96]">Nombre completo</label>
                            <div className="relative isolate">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#21AC96] transition-all duration-300 z-10">
                                    <User className="w-4.5 h-4.5" />
                                </div>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    className={`block w-full pl-11 pr-4 py-3 bg-white border-2 ${error?.name ? 'border-red-300' : 'border-gray-100'} rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96] transition-all duration-300 text-gray-900 placeholder:text-gray-400 font-bold text-xs`}
                                    placeholder="Juan Pérez"
                                />
                            </div>
                        </div>

                        <div className="group space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-[#21AC96]">Email</label>
                            <div className="relative isolate">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#21AC96] transition-all duration-300 z-10">
                                    <Mail className="w-4.5 h-4.5" />
                                </div>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className={`block w-full pl-11 pr-4 py-3 bg-white border-2 ${error?.email ? 'border-red-300' : 'border-gray-100'} rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96] transition-all duration-300 text-gray-900 placeholder:text-gray-400 font-bold text-xs`}
                                    placeholder="nombre@empresa.com"
                                />
                            </div>
                        </div>

                        <div className="group space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-[#21AC96]">Contraseña</label>
                            <div className="relative isolate">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#21AC96] transition-all duration-300 z-10">
                                    <Lock className="w-4.5 h-4.5" />
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className={`block w-full pl-11 pr-4 py-3 bg-white border-2 ${error?.password ? 'border-red-300' : 'border-gray-100'} rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96] transition-all duration-300 text-gray-900 placeholder:text-gray-400 font-bold text-xs`}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative overflow-hidden group/btn flex items-center justify-center gap-2 py-4 px-6 bg-[#21AC96] hover:bg-[#1a8a78] text-white rounded-[1.25rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-[#21AC96]/10 transition-all active:scale-[0.98] disabled:opacity-70 mt-6 h-14"
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                            ) : (
                                <>
                                    <span className="relative z-10">Registrarse</span>
                                    <ArrowRight className="w-5 h-5 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-6 border-t border-gray-100 mt-8">
                        <p className="text-xs text-gray-500 font-bold">
                            ¿Ya tienes cuenta?{' '}
                            <Link href="/login" className="text-[#21AC96] font-black hover:underline ml-1">
                                Inicia sesión
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
