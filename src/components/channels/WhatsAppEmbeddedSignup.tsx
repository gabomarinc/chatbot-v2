'use client';

import { useEffect, useState } from 'react';
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

    const launchSignup = () => {
        if (!window.FB) {
            toast.error('El SDK de Facebook aún no está cargado. Por favor, espera unos segundos e intenta de nuevo.');
            return;
        }

        // Verificar HTTPS (Permitir localhost para pruebas)
        if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            toast.error('Meta requiere HTTPS para conectar WhatsApp. (Use ngrok o localhost)');
            return;
        }

        setIsProcessing(true);

        try {
            // Safety Re-init just before login call (sometimes necessary in SPA transitions)
            if (window.FB) {
                window.FB.init({
                    appId: appId,
                    autoLogAppEvents: true,
                    xfbml: true,
                    version: 'v21.0'
                });
            }

            console.log('Iniciando FB.login con config:', { configId, appId });

            // Para Embedded Signup con config_id (Recomendado) o Scopes manuales
            const loginOptions: any = {};

            if (configId) {
                // Si tenemos Config ID, Meta maneja los permisos automáticamente
                console.log('Usando Config ID para login:', configId);
                loginOptions.config_id = configId;

                // Tech Provider / Embedded Signup V2 Standard
                loginOptions.response_type = 'code';
                loginOptions.override_default_response_type = true; // Force SDK to use our response_type

                // COEXISTENCE MODE: Enable WhatsApp Business App Onboarding
                // This allows the user to keep using the mobile app while connected to the API.

                loginOptions.extras = {
                    "setup": {
                        // "mode": "MIGRATION" // Optional: force migration
                    },
                    "featureType": "whatsapp_business_app_onboarding",
                    "sessionInfoVersion": "3"
                };

            } else {
                // Fallback manual (More reliable for standard Business Apps)
                console.log('Usando Scopes manuales (Standard Flow + Business Management)');
                loginOptions.scope = 'whatsapp_business_management,whatsapp_business_messaging,business_management';

                // COEXISTENCE MODE: Enable WhatsApp Business App Onboarding
                loginOptions.extras = {
                    "featureType": "whatsapp_business_app_onboarding"
                };
            }

            window.FB.login((response: any) => {
                console.log('FB Login Response:', response);

                // Tech Provider flow returns 'code' inside authResponse sometimes or at top level
                // We must check all possible locations
                const accessToken = response.authResponse?.accessToken;
                const code = response.code || response.authResponse?.code;

                if (accessToken || code) {
                    // 2. Send token/code to server to exchange and fetch WABAs
                    // Wrap async logic in an IIFE to satisfy FB SDK's synchronous callback requirement
                    (async () => {
                        try {
                            const result = await handleEmbeddedSignupV2({
                                accessToken: accessToken,
                                code: code,
                                agentId
                            });

                            if (result.success) {
                                toast.success('¡WhatsApp conectado correctamente!');
                                setIsProcessing(false);
                                if (onSuccess) onSuccess();
                            }
                            else if ('requiresSelection' in result && result.requiresSelection) {
                                // Show selection modal
                                setAvailableAccounts((result as any).accounts);
                                setLongLivedToken((result as any).accessToken || accessToken);
                                setShowSelectionModal(true);
                            }
                            else {
                                const errorMsg = 'error' in result ? result.error : 'Error al conectar WhatsApp';
                                toast.error(errorMsg);
                            }
                        } catch (err) {
                            console.error('Error in async login handler:', err);
                            toast.error('Error procesando la respuesta del servidor.');
                        }
                    })();
                } else {
                    setIsProcessing(false);
                    toast.error('No se recibió el token de acceso. Intenta de nuevo.');
                }
            } else {
                setIsProcessing(false);
                    if(response.error) {
                console.error('Error de Facebook:', response.error);
                toast.error(`Error: ${response.error.message || 'Error desconocido'}`);
            } else {
                // User cancelled
            }
        }
            }, loginOptions);
} catch (error: any) {
    setIsProcessing(false);
    console.error('Error en FB.login:', error);
    toast.error(`Error al iniciar sesión con Facebook: ${error.message || 'Error desconocido'}. Verifica que no tengas bloqueadores de anuncios activos.`);
}
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
