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
    const [selectedPlan, setSelectedPlan] = useState('FRESHIE');
    const [isTrial, setIsTrial] = useState(false);

    const plans = [
        {
            id: 'FRESHIE',
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
            id: 'MONEY_HONEY',
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
            id: 'WOLF_OF_WALLSTREET',
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
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        // Ensure the selected plan and trial state are included
        formData.set('planType', selectedPlan);
        if (isTrial) formData.set('trial', 'on');

        try {
            const result = await registerUser(null, formData);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
            } else if (result?.success) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            }
        } catch (err) {
            setError({ form: ['Ocurrió un error al registrarse. Inténtalo de nuevo.'] });
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500 max-w-md mx-auto">
                <div className="w-24 h-24 bg-[#21AC96]/10 rounded-full flex items-center justify-center mb-8 relative">
                    <div className="absolute inset-0 bg-[#21AC96]/20 rounded-full animate-ping opacity-20"></div>
                    <CheckCircle2 className="w-14 h-14 text-[#21AC96] relative z-10" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">¡Bienvenido a Kônsul!</h2>
                <p className="text-gray-500 font-medium">Tu cuenta ha sido creada con éxito.</p>
                <p className="text-gray-400 text-sm mt-1">Redirigiéndote para que inicies sesión...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Crea tu cuenta profesional</h2>
                <p className="text-gray-500 text-lg mt-2 font-medium">Únete a la nueva era de la automatización con IA</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Left Side: Plans Selection */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center justify-between mb-6 px-1">
                        <h3 className="text-xl font-bold text-gray-800">Selecciona tu plan</h3>
                        <div className="flex items-center gap-3 p-1.5 bg-gray-100 rounded-2xl border border-gray-200">
                            <button
                                type="button"
                                onClick={() => setIsTrial(false)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isTrial ? 'bg-white text-[#21AC96] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Suscripción
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsTrial(true)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isTrial ? 'bg-[#21AC96] text-white shadow-lg shadow-[#21AC96]/20 animate-pulse' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Free Trial
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-4">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                onClick={() => setSelectedPlan(plan.id)}
                                className={`relative flex flex-col lg:flex-row lg:items-center justify-between p-6 rounded-3xl border-2 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98] ${selectedPlan === plan.id
                                    ? 'border-[#21AC96] bg-[#21AC96]/5 shadow-xl shadow-[#21AC96]/10'
                                    : 'border-gray-100 bg-white hover:border-[#21AC96]/30 hover:bg-gray-50/50 shadow-sm'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-6 px-3 py-1 bg-[#21AC96] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-[#21AC96]/20">
                                        Más popular
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <h4 className={`text-xl font-black ${selectedPlan === plan.id ? 'text-[#21AC96]' : 'text-gray-900 group-hover:text-[#21AC96]'} transition-colors`}>
                                            {plan.name}
                                        </h4>
                                        <p className="text-gray-500 text-xs font-medium mt-1 pr-4">{plan.description}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                                        {plan.features.slice(0, 2).map((feature, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <CheckCircle2 className={`w-4 h-4 ${selectedPlan === plan.id ? 'text-[#21AC96]' : 'text-gray-300'}`} />
                                                <span className="text-[11px] text-gray-600 font-bold">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 lg:mt-0 lg:text-right flex lg:flex-col items-center lg:items-end gap-3 lg:gap-1">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-gray-900">
                                            ${isTrial ? '0' : plan.price}
                                        </span>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            /{isTrial ? '4 días' : 'mes'}
                                        </span>
                                    </div>
                                    {isTrial && (
                                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                            Trial
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Registration Form */}
                <div className="lg:col-span-5 bg-gray-50/50 rounded-[2rem] p-8 border border-gray-100/50">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-gray-800 mb-1">Tus datos</h3>
                            <p className="text-gray-500 text-sm font-medium tracking-tight">Completa tu información para empezar</p>
                        </div>

                        {error?.form && (
                            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm flex items-center gap-3 animate-shake shadow-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="font-medium">{error.form[0]}</span>
                            </div>
                        )}

                        <div className="group space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 ml-1 transition-colors group-focus-within:text-[#21AC96]">Nombre completo</label>
                            <div className="relative isolate">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#21AC96] group-focus-within:scale-110 transition-all duration-300 z-10">
                                    <User className="w-5 h-5" />
                                </div>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    className={`block w-full pl-11 pr-4 py-3.5 bg-white border ${error?.name ? 'border-red-300' : 'border-gray-200'} rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96] transition-all duration-300 text-gray-900 placeholder:text-gray-400 font-medium`}
                                    placeholder="Juan Pérez"
                                />
                            </div>
                            {error?.name && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{error.name[0]}</p>}
                        </div>

                        <div className="group space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 ml-1 transition-colors group-focus-within:text-[#21AC96]">Email</label>
                            <div className="relative isolate">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#21AC96] group-focus-within:scale-110 transition-all duration-300 z-10">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className={`block w-full pl-11 pr-4 py-3.5 bg-white border ${error?.email ? 'border-red-300' : 'border-gray-200'} rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96] transition-all duration-300 text-gray-900 placeholder:text-gray-400 font-medium`}
                                    placeholder="nombre@empresa.com"
                                />
                            </div>
                            {error?.email && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{error.email[0]}</p>}
                        </div>

                        <div className="group space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 ml-1 transition-colors group-focus-within:text-[#21AC96]">Contraseña</label>
                            <div className="relative isolate">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#21AC96] group-focus-within:scale-110 transition-all duration-300 z-10">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className={`block w-full pl-11 pr-4 py-3.5 bg-white border ${error?.password ? 'border-red-300' : 'border-gray-200'} rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96] transition-all duration-300 text-gray-900 placeholder:text-gray-400 font-medium`}
                                    placeholder="••••••••"
                                />
                            </div>
                            {error?.password && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{error.password[0]}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative overflow-hidden group/btn flex items-center justify-center gap-2 py-4 px-4 bg-[#21AC96] hover:bg-[#1a8a78] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.15em] shadow-xl shadow-[#21AC96]/20 transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-8 h-14"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
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

                    <div className="text-center pt-8 border-t border-gray-100 mt-8">
                        <p className="text-sm text-gray-500 font-medium">
                            ¿Ya tienes una cuenta?{' '}
                            <Link href="/login" className="text-[#21AC96] font-bold hover:text-[#1a8a78] transition-colors inline-flex items-center gap-1 group/link">
                                Inicia sesión
                                <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
