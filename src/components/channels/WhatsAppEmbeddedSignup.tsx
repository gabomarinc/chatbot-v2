'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageSquare, ShieldCheck, Check, Smartphone, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleEmbeddedSignupV2, finishWhatsAppSetup } from '@/lib/actions/whatsapp-auth';
import { cn } from '@/lib/utils';

interface WhatsAppEmbeddedSignupProps {
    appId: string;
    agentId: string;
    configId?: string;
    onSuccess?: () => void;
}

declare global {
    interface Window {
        fbAsyncInit: () => void;
        FB: any;
    }
}

export function WhatsAppEmbeddedSignup({ appId, agentId, configId, onSuccess }: WhatsAppEmbeddedSignupProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // State for multiple accounts selection
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
    const [longLivedToken, setLongLivedToken] = useState<string>('');

    useEffect(() => {
        if (!appId) {
            console.error('Missing Facebook App ID');
            toast.error('Realtos Chatbot Error: Falta configurar el App ID de Facebook.');
            return;
        }

        // Verificar HTTPS
        if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            console.warn('Facebook SDK requiere HTTPS. Para desarrollo local, usa ngrok.');
            return;
        }

        const initSDK = () => {
            if (window.FB) {
                console.log('Inicializando Facebook SDK con App ID:', appId);
                window.FB.init({
                    appId: appId,
                    autoLogAppEvents: true,
                    xfbml: true,
                    version: 'v21.0'
                });
                setIsLoaded(true);
            }
        };

        // Always Setup callback
        window.fbAsyncInit = function () {
            initSDK();
        };

        // Load SDK if not present
        if (!document.getElementById('facebook-jssdk')) {
            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = "https://connect.facebook.net/en_US/sdk.js";
            script.async = true;
            script.defer = true;
            script.onload = () => {
                // Should trigger fbAsyncInit
            };
            document.body.appendChild(script);
        } else {
            // Script already exists
            if (window.FB) {
                initSDK();
            } else {
                const interval = setInterval(() => {
                    if (window.FB) {
                        initSDK();
                        clearInterval(interval);
                    }
                }, 500);
                setTimeout(() => clearInterval(interval), 5000);
            }
        }
    }, [appId]);



    // --- Manual OAuth Popup Implementation (Strict Mode Fix) ---
    // Because Meta Strict Mode rejects the SDK's internal redirect_uri (mismatch or domain error),
    // we use a manual popup where we explicitly control the redirect_uri to be the CLEAN current URL.

    const [callbackMode, setCallbackMode] = useState(false);
    const router = useRouter();

    const onPopupCodeReceived = async (code: string) => {
        setIsProcessing(true);
        try {
            // The redirect_uri used in the manual dialog is EXACTLY this (clean):
            const currentUrl = window.location.origin + window.location.pathname;

            const result = await handleEmbeddedSignupV2({
                code: code,
                redirectUri: currentUrl,
                agentId
            });

            if (result.success) {
                toast.success('¡WhatsApp conectado correctamente!');
                setIsProcessing(false);
                if (onSuccess) onSuccess();

                // If we are in the child window (callbackMode) OR we simply have a code in URL and no opener
                // We force a redirect to ensure the user ends up in the app
                if (window.location.search.includes('code=')) {
                    // Force hard redirection/navigation to channels
                    router.push('/dashboard/channels');
                }
            }
            else if ('requiresSelection' in result && result.requiresSelection) {
                setAvailableAccounts((result as any).accounts);
                setLongLivedToken((result as any).accessToken || '');
                setShowSelectionModal(true);
            }
            else {
                const errorMsg = 'error' in result ? result.error : 'Error al conectar WhatsApp';
                toast.error(errorMsg);
            }
        } catch (err) {
            console.error('Error processing code:', err);
            toast.error('Error procesando la conexión.');
        } finally {
            // setIsProcessing(false); // Handled in success/error branches or modal
        }
    };

    useEffect(() => {
        // Child Mode: If this component is loaded inside the popup with a code
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
            setCallbackMode(true);

            // Scenario 1: Parent window exists (Popup Mode)
            if (window.opener) {
                console.log('Sending Code to parent:', code);
                window.opener.postMessage({ type: 'WA_OAUTH_CODE', code }, window.location.origin);
                setTimeout(() => window.close(), 1500);
            }
            // Scenario 2: No parent window (New Tab Mode)
            else {
                console.log('No parent window found. Processing in current tab...');
                // Trigger processing directly!
                onPopupCodeReceived(code);
            }
            return;
        }

        // Parent Mode: Listen for the code
        const handleMessage = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            if (e.data?.type === 'WA_OAUTH_CODE' && e.data?.code) {
                console.log('Received Code from popup:', e.data.code);
                onPopupCodeReceived(e.data.code);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    if (callbackMode) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-white h-screen w-full fixed inset-0 z-50">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-pulse mb-6">
                    <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Finalizando Conexión...</h2>
                <p className="text-gray-500 text-center max-w-md font-medium">
                    Estamos configurando tu canal de WhatsApp.
                    <br />
                    Por favor no cierres esta ventana.
                </p>

                {/* Selection Modal inside Callback Mode if needed */}
                {showSelectionModal && (
                    <div className="mt-8 bg-white p-6 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                        <h3 className="font-bold text-lg mb-4 text-center">Selecciona un Número</h3>
                        <div className="space-y-3">
                            {availableAccounts.map((account, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAccountSelection(account)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-green-500 hover:bg-green-50 text-left transition-all"
                                >
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <Smartphone className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-sm">{account.displayName}</p>
                                        <p className="text-xs text-gray-500">{account.phoneNumber}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const launchSignup = () => {
        // Manually construct the OAuth URL
        // Redirect URI: Must be the CLEAN path (no params) to match Allowlist + Strict Mode
        const redirectUri = window.location.origin + window.location.pathname;

        let url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

        if (configId) {
            console.log('Usando Config ID (Manual Flow):', configId);
            url += `&config_id=${configId}`;

            // Extras for Coexistence
            // Note: Passing 'extras' directly in URL works for Tech Provider flow manual URL
            const extras = {
                "setup": {},
                "featureType": "whatsapp_business_app_onboarding",
                "sessionInfoVersion": "3"
            };
            url += `&extras=${encodeURIComponent(JSON.stringify(extras))}`;

            console.log('Manual OAuth URL:', url);

        } else {
            // Manual Scopes Fallback
            url += `&scope=whatsapp_business_management,whatsapp_business_messaging,business_management`;
        }


        // Pass agentId in state to persist across redirect
        if (agentId) {
            url += `&state=${agentId}`;
        }

        const width = 600;
        const height = 700;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        window.open(url, 'fb_oauth', `width=${width},height=${height},top=${top},left=${left}`);
    };

    const handleAccountSelection = async (account: any) => {
        // Keep isProcessing true
        try {
            const result = await finishWhatsAppSetup({
                accessToken: longLivedToken,
                wabaId: account.wabaId,
                phoneNumberId: account.phoneNumberId,
                agentId,
                displayName: account.displayName
            });

            if (result.success) {
                toast.success(`Conectado a ${account.phoneNumber}`);
                setShowSelectionModal(false);
                if (onSuccess) onSuccess();
            } else {
                toast.error(result.error || 'Error al finalizar la conexión');
            }
        } catch (error) {
            toast.error('Error al finalizar la conexión');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <div className="bg-slate-900 overflow-hidden relative group rounded-[2.5rem]">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[80px] -mr-32 -mt-32"></div>

                <div className="relative p-10 flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 bg-green-500/20 rounded-[2rem] flex items-center justify-center text-green-500 shadow-xl shadow-green-500/10 group-hover:scale-110 transition-transform duration-500">
                        <MessageSquare className="w-10 h-10" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-white font-black text-2xl tracking-tight">Conexión Profesional</h3>
                        <p className="text-slate-400 text-sm font-medium max-w-sm">
                            Conecta tu número oficial de WhatsApp en segundos sin configuraciones técnicas complejas.
                        </p>
                    </div>

                    <button
                        onClick={launchSignup}
                        disabled={!isLoaded || isProcessing}
                        className="w-full py-4 bg-green-500 text-slate-900 rounded-2xl text-sm font-black shadow-lg shadow-green-500/30 hover:bg-green-400 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 group-hover:ring-4 ring-green-500/20"
                    >
                        {isProcessing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <ShieldCheck className="w-5 h-5" />
                                <span>CONECTAR CON WHATSAPP</span>
                            </>
                        )}
                    </button>

                    {!isLoaded && (
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">
                            Sincronizando con Meta...
                        </p>
                    )}

                    <div className="pt-2">
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            Método Oficial y Seguro
                        </div>
                    </div>
                </div>
            </div>

            {/* Account Selection Modal */}
            {showSelectionModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-lg w-full animate-in zoom-in-95 duration-200 relative">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900">Selecciona un Número</h3>
                            <p className="text-gray-500 text-sm mt-1">
                                Encontramos varias cuentas asociadas. Elige cuál quieres conectar.
                            </p>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            {availableAccounts.map((account, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAccountSelection(account)}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-green-500 hover:bg-green-50/50 transition-all text-left group"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-green-100 group-hover:text-green-600">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 group-hover:text-green-700">
                                            {account.displayName}
                                        </p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <span className="font-medium text-gray-400">
                                                {account.phoneNumber}
                                                {account.wabaName && account.wabaName !== account.displayName && (
                                                    <span className="ml-1 opacity-70">({account.wabaName})</span>
                                                )}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-green-600">
                                        <Check className="w-5 h-5" />
                                    </div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => {
                                setShowSelectionModal(false);
                                setIsProcessing(false);
                            }}
                            className="mt-6 w-full py-3 text-gray-400 font-bold text-sm hover:text-gray-600"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
