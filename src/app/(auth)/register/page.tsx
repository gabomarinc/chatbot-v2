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
    const [isTrial] = useState(true); // Mandatory trial
    const [showTrialModal, setShowTrialModal] = useState(false);

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
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto relative">
            {/* Trial Info Modal */}
            {showTrialModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-black/20 p-8 md:p-12 max-w-lg w-full relative overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Decorative background elements for modal */}
                        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#21AC96]/5 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#21AC96]/5 rounded-full blur-3xl"></div>

                        <div className="relative z-10 text-center">
                            <div className="w-20 h-20 bg-[#21AC96]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3 transform hover:rotate-0 transition-transform duration-500 shadow-lg shadow-[#21AC96]/10">
                                <CheckCircle2 className="w-10 h-10 text-[#21AC96]" />
                            </div>

                            <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
                                ¡Tu prueba gratuita <br /><span className="text-[#21AC96]">está lista!</span>
                            </h3>

                            <p className="text-gray-500 text-lg font-medium mb-8 leading-relaxed">
                                Al registrarte hoy, obtendrás <span className="text-gray-900 font-bold">4 días de acceso total</span> a todas las herramientas de Kônsul sin costo alguno.
                            </p>

                            <div className="space-y-4 mb-10">
                                {[
                                    'Acceso a todos los agentes IA',
                                    'Integración con WhatsApp y Web',
                                    'Sin compromiso de permanencia'
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <div className="flex-shrink-0 w-6 h-6 bg-[#21AC96]/10 rounded-full flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-[#21AC96]" />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => {
                                    setShowTrialModal(false);
                                    // Trigger form submission manually if modal was opened by submit button
                                    const form = document.querySelector('form');
                                    if (form) form.requestSubmit();
                                }}
                                className="w-full py-5 bg-[#21AC96] hover:bg-[#1a8a78] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#21AC96]/30 transition-all active:scale-[0.98] group flex items-center justify-center gap-3 h-16"
                            >
                                Empezar mi prueba ahora
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <button
                                onClick={() => setShowTrialModal(false)}
                                className="mt-4 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
                            >
                                Volver y revisar planes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="text-center mb-10">
                <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">Crea tu cuenta profesional</h2>
                <p className="text-gray-500 text-lg mt-3 font-medium">Únete a la nueva era de la automatización con IA</p>

                {/* Mandatory Trial Banner */}
                <div className="mt-8 inline-flex items-center gap-4 bg-[#21AC96]/5 border border-[#21AC96]/20 px-6 py-3 rounded-2xl animate-pulse cursor-default group hover:bg-[#21AC96]/10 transition-colors">
                    <div className="w-8 h-8 bg-[#21AC96] rounded-xl flex items-center justify-center shadow-lg shadow-[#21AC96]/20">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black text-[#21AC96] uppercase tracking-[0.2em] leading-none mb-1">Oferta especial</p>
                        <p className="text-sm font-black text-gray-900 leading-none">4 DÍAS DE FREE TRIAL EN CUALQUIER PLAN</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Left Side: Plans Selection */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center justify-between mb-6 px-1">
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Selecciona tu plan</h3>
                        <div className="flex items-center gap-2 p-1.5 bg-gray-100/50 rounded-2xl border border-gray-200/50 backdrop-blur-sm">
                            <div className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-[#21AC96] text-white shadow-lg shadow-[#21AC96]/20">
                                Free Trial Activo
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-5">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                onClick={() => {
                                    setSelectedPlan(plan.id);
                                    setShowTrialModal(true);
                                }}
                                className={`relative flex flex-col lg:flex-row lg:items-center justify-between p-8 rounded-[2.5rem] border-[3px] transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99] ${selectedPlan === plan.id
                                    ? 'border-[#21AC96] bg-[#21AC96]/5 shadow-2xl shadow-[#21AC96]/10'
                                    : 'border-transparent bg-white hover:border-[#21AC96]/20 shadow-sm'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-8 px-5 py-2 bg-[#21AC96] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl shadow-[#21AC96]/20 z-10">
                                        Más popular
                                    </div>
                                )}

                                <div className="space-y-5">
                                    <div>
                                        <h4 className={`text-2xl font-black ${selectedPlan === plan.id ? 'text-[#21AC96]' : 'text-gray-900 group-hover:text-[#21AC96]'} transition-colors tracking-tight`}>
                                            {plan.name}
                                        </h4>
                                        <p className="text-gray-500 text-sm font-medium mt-1 pr-6 leading-relaxed">{plan.description}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-x-8 gap-y-3">
                                        {plan.features.slice(0, 2).map((feature, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedPlan === plan.id ? 'bg-[#21AC96]/10' : 'bg-gray-100 group-hover:bg-[#21AC96]/5'}`}>
                                                    <CheckCircle2 className={`w-3 h-3 ${selectedPlan === plan.id ? 'text-[#21AC96]' : 'text-gray-400 group-hover:text-[#21AC96]/50'}`} />
                                                </div>
                                                <span className="text-xs text-gray-600 font-bold tracking-tight">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-8 lg:mt-0 lg:text-right flex lg:flex-col items-center lg:items-end gap-5 lg:gap-1 pl-4 border-l-2 border-dashed border-gray-100 lg:border-none">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black text-gray-900 leading-none">
                                            $0
                                        </span>
                                        <div className="flex flex-col items-start leading-none gap-1">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded-md">
                                                /4 días
                                            </span>
                                        </div>
                                    </div>
                                    <span className="px-4 py-1.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-sm border border-amber-200/50">
                                        Trial
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Registration Form */}
                <div className="lg:col-span-5 bg-gray-100/30 rounded-[3rem] p-10 border border-gray-200/50 backdrop-blur-sm self-stretch flex flex-col justify-center">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="mb-10">
                            <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Tus datos</h3>
                            <p className="text-gray-500 text-sm font-medium leading-normal tracking-tight">Completa tu información para empezar tu prueba gratuita sin compromisos.</p>
                        </div>

                        {error?.form && (
                            <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-3xl text-sm flex items-center gap-4 animate-shake shadow-sm mb-4">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="font-bold">{error.form[0]}</span>
                            </div>
                        )}

                        <div className="group space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-[#21AC96]">Nombre completo</label>
                            <div className="relative isolate">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#21AC96] group-focus-within:scale-110 transition-all duration-300 z-10">
                                    <User className="w-5 h-5" />
                                </div>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    className={`block w-full pl-14 pr-5 py-4.5 bg-white border-2 ${error?.name ? 'border-red-300' : 'border-gray-100'} rounded-[1.5rem] focus:outline-none focus:ring-8 focus:ring-[#21AC96]/5 focus:border-[#21AC96] transition-all duration-300 text-gray-900 placeholder:text-gray-400 font-bold text-sm shadow-sm`}
                                    placeholder="Juan Pérez"
                                />
                            </div>
                            {error?.name && <p className="text-[10px] text-red-500 mt-1 ml-2 font-black uppercase tracking-widest leading-none">{error.name[0]}</p>}
                        </div>

                        <div className="group space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-[#21AC96]">Email</label>
                            <div className="relative isolate">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#21AC96] group-focus-within:scale-110 transition-all duration-300 z-10">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className={`block w-full pl-14 pr-5 py-4.5 bg-white border-2 ${error?.email ? 'border-red-300' : 'border-gray-100'} rounded-[1.5rem] focus:outline-none focus:ring-8 focus:ring-[#21AC96]/5 focus:border-[#21AC96] transition-all duration-300 text-gray-900 placeholder:text-gray-400 font-bold text-sm shadow-sm`}
                                    placeholder="nombre@empresa.com"
                                />
                            </div>
                            {error?.email && <p className="text-[10px] text-red-500 mt-1 ml-2 font-black uppercase tracking-widest leading-none">{error.email[0]}</p>}
                        </div>

                        <div className="group space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-[#21AC96]">Contraseña</label>
                            <div className="relative isolate">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#21AC96] group-focus-within:scale-110 transition-all duration-300 z-10">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className={`block w-full pl-14 pr-5 py-4.5 bg-white border-2 ${error?.password ? 'border-red-300' : 'border-gray-100'} rounded-[1.5rem] focus:outline-none focus:ring-8 focus:ring-[#21AC96]/5 focus:border-[#21AC96] transition-all duration-300 text-gray-900 placeholder:text-gray-400 font-bold text-sm shadow-sm`}
                                    placeholder="••••••••"
                                />
                            </div>
                            {error?.password && <p className="text-[10px] text-red-500 mt-1 ml-2 font-black uppercase tracking-widest leading-none">{error.password[0]}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative overflow-hidden group/btn flex items-center justify-center gap-3 py-5 px-6 bg-[#21AC96] hover:bg-[#1a8a78] text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.25em] shadow-2xl shadow-[#21AC96]/30 transition-all active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed mt-10 h-20"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin relative z-10" />
                            ) : (
                                <>
                                    <span className="relative z-10 text-[13px]">Registrarse</span>
                                    <ArrowRight className="w-6 h-6 relative z-10 group-hover/btn:translate-x-1.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-8 border-t-2 border-dashed border-gray-100 mt-10">
                        <p className="text-sm text-gray-500 font-bold">
                            ¿Ya tienes una cuenta?{' '}
                            <Link href="/login" className="text-[#21AC96] font-black hover:text-[#1a8a78] transition-all inline-flex items-center gap-1 group/link ml-1 underline underline-offset-4 decoration-2 decoration-[#21AC96]/30">
                                Inicia sesión
                                <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
