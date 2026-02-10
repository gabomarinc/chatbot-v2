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

export function InstagramEmbeddedSignup({ appId, agentId, onSuccess }: InstagramEmbeddedSignupProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [showAccountSelection, setShowAccountSelection] = useState(false);

    // Check for Instagram token in URL params (from OAuth callback)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('instagram_token');
        const authSuccess = params.get('instagram_auth');

        if (token && authSuccess === 'success') {
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
            // Handle authentication with the token
            handleAuth(token);
        }
    }, []);

    const buildInstagramOAuthUrl = () => {
        const redirectUri = `${window.location.origin}/api/oauth/instagram/callback`;
        const state = JSON.stringify({ agentId });

        // Use official Instagram OAuth endpoint
        const params = new URLSearchParams({
            client_id: appId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'instagram_business_manage_comments,instagram_business_manage_messages',
            state: state
        });

        return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
    };

    const launchLogin = () => {
        setIsProcessing(true);

        try {
            const oauthUrl = buildInstagramOAuthUrl();
            console.log('Instagram OAuth URL:', oauthUrl);
            console.log('App ID:', appId);

            // Open in popup window
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            const popup = window.open(
                oauthUrl,
                'instagram_oauth',
                `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
            );

            if (!popup) {
                toast.error('Por favor, permite ventanas emergentes para continuar.');
                setIsProcessing(false);
                return;
            }

            // Check if popup was closed
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    setIsProcessing(false);
                }
            }, 1000);

        } catch (error: any) {
            console.error('Error launching Instagram OAuth:', error);
            toast.error('Error al iniciar autenticación');
            setIsProcessing(false);
        }
    };

    const handleAuth = async (accessToken: string) => {
        let result: any = null;
        try {
            // 1. Obtener cuentas disponibles
            result = await getInstagramAccounts(accessToken);

            if (result.error) {
                // If we have debug info in the error result, attach it to the thrown error or log it here
                if (result.debug) {
                    console.log("DEBUG LOGS:\n", result.debug.join('\n'));
                }
                throw new Error(result.error);
            }

            if (result.accounts && result.accounts.length > 0) {
                // Si hay cuentas, mostrar selección (incluso si es solo 1, para confirmar)
                setAccounts(result.accounts);
                setShowAccountSelection(true);
            } else {
                if (result.debug) {
                    console.log("DEBUG LOGS (Empty Accounts):\n", result.debug.join('\n'));
                }
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
                    disabled={isProcessing}
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
