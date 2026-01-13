'use client';

import { useEffect, useState } from 'react';
import { Loader2, Instagram, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getInstagramAccounts, connectInstagramAccount } from '@/lib/actions/instagram-auth';

interface InstagramEmbeddedSignupProps {
    appId: string;
    agentId: string;
    onSuccess?: () => void;
}

declare global {
    interface Window {
        fbAsyncInit: () => void;
        FB: any;
    }
}

export function InstagramEmbeddedSignup({ appId, agentId, onSuccess }: InstagramEmbeddedSignupProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [showAccountSelection, setShowAccountSelection] = useState(false);

    useEffect(() => {
        // Verificar HTTPS
        if (typeof window !== 'undefined' && window.location.protocol !== 'https:') {
            console.warn('Facebook SDK requiere HTTPS.');
        }

        const loadSDK = () => {
            if (document.getElementById('facebook-jssdk')) {
                // Si ya existe, esperar a que FB esté listo
                const checkFB = setInterval(() => {
                    if (window.FB) {
                        setIsLoaded(true);
                        clearInterval(checkFB);
                    }
                }, 100);
                setTimeout(() => clearInterval(checkFB), 5000);
                return;
            }

            window.fbAsyncInit = function () {
                window.FB.init({
                    appId: appId,
                    cookie: true,
                    xfbml: true,
                    version: 'v21.0'
                });
                setIsLoaded(true);
            };

            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = "https://connect.facebook.net/en_US/sdk.js";
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
        };

        loadSDK();
    }, [appId]);

    const launchLogin = () => {
        if (!window.FB) return;

        setIsProcessing(true);

        window.FB.login((response: any) => {
            if (response.authResponse) {
                const accessToken = response.authResponse.accessToken;
                handleAuth(accessToken);
            } else {
                setIsProcessing(false);
                if (response.error) {
                    toast.error(`Error: ${response.error.message}`);
                } else {
                    toast.error('Inicio de sesión cancelado.');
                }
            }
        }, {
            scope: 'instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_manage_metadata,public_profile,business_management',
            return_scopes: true
        });
    };

    const handleAuth = async (accessToken: string) => {
        try {
            // 1. Obtener cuentas disponibles
            const result = await getInstagramAccounts(accessToken);

            if (result.error) {
                throw new Error(result.error);
            }

            if (result.accounts && result.accounts.length > 0) {
                // Si hay cuentas, mostrar selección (incluso si es solo 1, para confirmar)
                setAccounts(result.accounts);
                setShowAccountSelection(true);
            } else {
                toast.error('No se encontraron cuentas de Instagram Business conectadas a tus Páginas de Facebook.');
            }
        } catch (error: any) {
            console.error('Error de autenticación:', error);
            toast.error(error.message || 'Error al conectar con Instagram');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSelectAccount = async (account: any) => {
        setIsProcessing(true);
        try {
            const result = await connectInstagramAccount({
                agentId,
                accountId: account.id, // Instagram Business Account ID
                pageId: account.pageId,
                pageAccessToken: account.pageAccessToken,
                name: account.name
            });

            if (result.success) {
                toast.success('¡Instagram conectado correctamente! 🎉');
                if (onSuccess) onSuccess();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al guardar la configuración');
        } finally {
            setIsProcessing(false);
            setShowAccountSelection(false);
        }
    };

    if (showAccountSelection) {
        return (
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6 animate-fade-in">
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-black text-gray-900">Selecciona una cuenta</h3>
                    <p className="text-gray-500 text-sm">Elige qué cuenta de Instagram quieres conectar a este agente.</p>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {accounts.map((acc) => (
                        <button
                            key={acc.id}
                            onClick={() => handleSelectAccount(acc)}
                            className="w-full p-4 flex items-center gap-4 bg-gray-50 hover:bg-pink-50 border border-transparent hover:border-pink-200 rounded-2xl transition-all group text-left"
                        >
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-pink-500 group-hover:scale-110 transition-transform">
                                <Instagram className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">{acc.name}</h4>
                                <p className="text-xs text-gray-500">ID: {acc.id}</p>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="text-center pt-2">
                    <button
                        onClick={() => setShowAccountSelection(false)}
                        className="text-gray-400 text-xs font-bold hover:text-gray-600 uppercase tracking-widest"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-purple-900 to-pink-900 overflow-hidden relative group rounded-[2.5rem] shadow-2xl">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/20 blur-[80px] -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 blur-[80px] -ml-32 -mb-32"></div>

            <div className="relative p-10 flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-pink-500/20 group-hover:scale-110 transition-transform duration-500 border border-white/10">
                    <Instagram className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                    <h3 className="text-white font-black text-2xl tracking-tight">Conexión Instantánea</h3>
                    <p className="text-pink-100/80 text-sm font-medium max-w-sm leading-relaxed">
                        Olvídate de tokens y configuraciones manuales. Conecta tu cuenta oficial de Instagram con un solo clic.
                    </p>
                </div>

                <button
                    onClick={launchLogin}
                    disabled={!isLoaded || isProcessing}
                    className="w-full py-4 bg-white text-pink-900 rounded-2xl text-sm font-black shadow-lg shadow-black/20 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 group-hover:ring-4 ring-white/20"
                >
                    {isProcessing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <ShieldCheck className="w-5 h-5" />
                            <span>CONECTAR INSTAGRAM</span>
                        </>
                    )}
                </button>

                {!isLoaded && (
                    <p className="text-[10px] text-pink-200/60 font-bold uppercase tracking-widest animate-pulse">
                        Sincronizando con Meta...
                    </p>
                )}

                <div className="pt-4 flex flex-col gap-2">
                    <div className="flex items-center justify-center gap-2 text-pink-200/60 text-[10px] font-bold uppercase tracking-widest">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        Método Oficial y Seguro
                    </div>
                </div>
            </div>
        </div>
    );
}
