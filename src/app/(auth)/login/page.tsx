'use client'

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { setInitialPassword } from '@/lib/actions/auth';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { update } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSettingPassword, setIsSettingPassword] = useState(false);
    const [passwordSet, setPasswordSet] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Check if we're in "set password" mode
    useEffect(() => {
        const action = searchParams?.get('action');
        const email = searchParams?.get('email');
        if (action === 'set-password' && email) {
            setIsSettingPassword(true);
        }
    }, [searchParams]);

    const handleSetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        try {
            const result = await setInitialPassword(email, password, confirmPassword);

            if (result.error) {
                // Handle field-specific errors
                const errorMessages = Object.values(result.error).flat();
                setError(errorMessages[0] || 'Error al establecer la contraseña');
                setLoading(false);
            } else if (result.success) {
                setPasswordSet(true);
                // Automatically sign in after setting password
                setTimeout(async () => {
                    const signInResult = await signIn('credentials', {
                        email,
                        password,
                        redirect: false,
                    });

                    if (signInResult?.error) {
                        setError('Contraseña establecida, pero hubo un error al iniciar sesión. Por favor, intenta iniciar sesión manualmente.');
                        setPasswordSet(false);
                    } else {
                        // Refresh session to get updated user data
                        await update();
                        router.push('/dashboard');
                    }
                }, 1500);
            }
        } catch (err) {
            setError('Ocurrió un error al establecer la contraseña. Inténtalo de nuevo.');
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('Credenciales incorrectas. Por favor, verifica tu email y contraseña.');
                setLoading(false);
            } else {
                // Refresh session to get updated user data
                await update();
                router.push('/dashboard');
            }
        } catch (err) {
            setError('Ocurrió un error al iniciar sesión. Inténtalo de nuevo.');
            setLoading(false);
        }
    };

    // Show "Set Password" form
    if (isSettingPassword) {
        const email = searchParams?.get('email') || '';

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Establece tu contraseña</h2>
                    <p className="text-gray-500 text-sm mt-2 font-medium">
                        Crea una contraseña segura para tu cuenta
                    </p>
                </div>

                {passwordSet ? (
                    <div className="bg-green-50 border border-green-100 text-green-600 px-4 py-3 rounded-2xl text-sm flex items-center gap-3 shadow-sm">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">¡Contraseña establecida exitosamente! Redirigiendo...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSetPassword} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm flex items-center gap-3 animate-shake shadow-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        <div className="group space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 ml-1 transition-colors group-focus-within:text-[#21AC96]">Email</label>
                            <div className="relative isolate">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#21AC96] group-focus-within:scale-110 transition-all duration-300 z-10">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    name="email"
                                    type="email"
                                    defaultValue={email}
                                    required
                                    readOnly
                                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-gray-600 font-medium cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="group space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 ml-1 transition-colors group-focus-within:text-[#21AC96]">Nueva Contraseña</label>
                            <div className="relative isolate">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#21AC96] group-focus-within:scale-110 transition-all duration-300 z-10">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    minLength={6}
                                    className="block w-full pl-11 pr-11 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96] focus:bg-white transition-all duration-300 text-gray-900 placeholder:text-gray-400 font-medium"
                                    placeholder="Mínimo 6 caracteres"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#21AC96] transition-colors z-20"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="group space-y-1.5">
                            <label className="text-sm font-bold text-gray-700 ml-1 transition-colors group-focus-within:text-[#21AC96]">Confirmar Contraseña</label>
                            <div className="relative isolate">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#21AC96] group-focus-within:scale-110 transition-all duration-300 z-10">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    minLength={6}
                                    className="block w-full pl-11 pr-11 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96] focus:bg-white transition-all duration-300 text-gray-900 placeholder:text-gray-400 font-medium"
                                    placeholder="Repite la contraseña"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#21AC96] transition-colors z-20"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative overflow-hidden group/btn flex items-center justify-center gap-2 py-4 px-4 bg-[#21AC96] hover:bg-[#1a8a78] text-white rounded-2xl font-bold shadow-xl shadow-[#21AC96]/20 transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                            ) : (
                                <>
                                    <span className="relative z-10">Establecer Contraseña</span>
                                    <ArrowRight className="w-5 h-5 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                <div className="text-center pt-4">
                    <Link
                        href="/login"
                        className="text-sm text-[#21AC96] font-bold hover:text-[#1a8a78] transition-colors inline-flex items-center gap-1"
                    >
                        ← Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        );
    }

    // Show normal login form
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-[400px] mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-2">¡Bienvenido de nuevo!</h2>
                <p className="text-gray-400 text-xs font-black uppercase tracking-[0.2em]">Nos alegra verte otra vez</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-[10px] flex items-center gap-2 animate-shake">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="font-bold">{error}</span>
                    </div>
                )}

                <div className="group space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.1em] ml-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#21AC96]" />
                        <input
                            name="email"
                            type="email"
                            required
                            className="block w-full pl-10 pr-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:border-[#21AC96] text-gray-900 placeholder:text-gray-400 font-bold text-xs transition-all"
                            placeholder="nombre@empresa.com"
                        />
                    </div>
                </div>

                <div className="group space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.1em]">Contraseña</label>
                        <button type="button" className="text-[8px] font-black text-[#21AC96] hover:text-[#1a8a78] uppercase tracking-[0.05em] transition-colors">¿Olvidaste tu contraseña?</button>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#21AC96]" />
                        <input
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            className="block w-full pl-10 pr-10 py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:border-[#21AC96] text-gray-900 placeholder:text-gray-400 font-bold text-xs transition-all"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#21AC96] transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-[#21AC96] hover:bg-[#1a8a78] text-white rounded-xl font-black text-[11px] uppercase tracking-[0.15em] shadow-lg shadow-[#21AC96]/10 transition-all active:scale-[0.98] disabled:opacity-70 mt-4 h-14"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <span>Iniciar sesión</span>
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>

            <div className="text-center pt-6 border-t border-gray-50">
                <p className="text-[11px] text-gray-500 font-bold">
                    ¿No tienes una cuenta?{' '}
                    <Link href="/register" className="text-[#21AC96] font-black hover:underline underline-offset-4 ml-1">
                        Crea una gratis
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">¡Bienvenido de nuevo!</h2>
                    <p className="text-gray-500 text-sm mt-2 font-medium">Cargando...</p>
                </div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
