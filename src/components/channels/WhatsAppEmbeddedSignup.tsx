'use client';

import { useEffect, useState } from 'react';
import { Loader2, MessageSquare, ShieldCheck, Check, Smartphone, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleEmbeddedSignup, finishWhatsAppSetup } from '@/lib/actions/whatsapp-auth';
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
        // Verificar HTTPS - Meta requiere HTTPS incluso en localhost
        if (typeof window !== 'undefined' && window.location.protocol !== 'https:') {
            console.warn('Facebook SDK requiere HTTPS. Para desarrollo local, usa ngrok.');
            // No mostramos error aquí, solo en launchSignup cuando el usuario intente conectar
            return;
        }

        // Load Facebook SDK
        const loadSDK = () => {
            // Si ya existe el script, verificar si FB está disponible
            const existingScript = document.getElementById('facebook-jssdk');
            if (existingScript) {
                // Esperar un poco y verificar si FB se inicializó
                const checkFB = setInterval(() => {
                    if (window.FB) {
                        setIsLoaded(true);
                        clearInterval(checkFB);
                    }
                }, 100);

                // Timeout después de 5 segundos
                setTimeout(() => {
                    clearInterval(checkFB);
                    if (!window.FB) {
                        console.warn('SDK de Facebook no se inicializó después de 5 segundos');
                    }
                }, 5000);
                return;
            }

            // Configurar fbAsyncInit antes de cargar el script
            window.fbAsyncInit = function () {
                if (window.FB) {
                    window.FB.init({
                        appId: appId,
                        autoLogAppEvents: true,
                        xfbml: true,
                        version: 'v21.0'
                    });
                    setIsLoaded(true);
                    console.log('Facebook SDK inicializado correctamente');
                }
            };

            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = "https://connect.facebook.net/en_US/sdk.js";
            script.async = true;
            script.defer = true;

            script.onload = () => {
                console.log('Script de Facebook SDK cargado');
                // El SDK debería llamar a fbAsyncInit automáticamente
                // Pero verificamos después de un tiempo por si acaso
                setTimeout(() => {
                    if (window.FB) {
                        setIsLoaded(true);
                    }
                }, 1000);
            };

            script.onerror = (error) => {
                console.error('Error al cargar el SDK de Facebook:', error);
                toast.error('Error al cargar el SDK de Facebook. Verifica tu conexión o desactiva bloqueadores de anuncios.');
            };

            document.body.appendChild(script);

            // Timeout de seguridad: si después de 10 segundos no se cargó, mostrar advertencia
            setTimeout(() => {
                if (!window.FB) {
                    console.warn('El SDK de Facebook no se cargó después de 10 segundos');
                    toast.error('El SDK de Facebook está tardando en cargar. Verifica tu conexión o desactiva bloqueadores de anuncios.');
                }
            }, 10000);
        };

        loadSDK();
    }, [appId]);

    const launchSignup = () => {
        if (!window.FB) {
            toast.error('El SDK de Facebook aún no está cargado. Por favor, espera unos segundos e intenta de nuevo.');
            console.warn('FB no está disponible:', { FB: window.FB });
            return;
        }

        // Verificar HTTPS - Meta requiere HTTPS incluso en localhost para FB.login
        if (typeof window !== 'undefined' && window.location.protocol !== 'https:') {
            toast.error('Meta requiere HTTPS para conectar WhatsApp. Para desarrollo local, usa ngrok (consulta NGROK_SETUP.md)');
            console.error('FB.login requiere HTTPS. URL actual:', window.location.href);
            return;
        }

        setIsProcessing(true);

        try {
            console.log('Iniciando FB.login con config:', { configId, appId });

            // Para Embedded Signup con config_id, no necesitamos redirect_uri explícito
            // Meta maneja el redirect internamente cuando se usa config_id
            // Usar flujo de Token (implícito) para evitar problemas de redirect_uri
            const loginOptions: any = {
                scope: 'whatsapp_business_management,whatsapp_business_messaging',
                extras: {
                    feature: 'whatsapp_embedded_signup',
                    setup: {}
                }
            };

            // Solo agregar config_id si está disponible
            if (configId) {
                loginOptions.config_id = configId;
            }

            window.FB.login((response: any) => {
                console.log('Respuesta de FB.login:', response);
                if (response.authResponse) {
                    // Ahora recibimos un accessToken directamente
                    const accessToken = response.authResponse.accessToken;
                    if (accessToken) {
                        processMetaToken(accessToken);
                    } else {
                        setIsProcessing(false);
                        toast.error('No se recibió el token de acceso. Intenta de nuevo.');
                    }
                } else {
                    setIsProcessing(false);
                    if (response.error) {
                        console.error('Error de Facebook:', response.error);
                        toast.error(`Error: ${response.error.message || 'Error desconocido'}`);
                    } else {
                        // User cancelled
                        // toast.error('El usuario canceló el inicio de sesión o no autorizó la aplicación.');
                    }
                }
            }, loginOptions);
        } catch (error: any) {
            setIsProcessing(false);
            console.error('Error en FB.login:', error);
            toast.error(`Error al iniciar sesión con Facebook: ${error.message || 'Error desconocido'}. Verifica que no tengas bloqueadores de anuncios activos.`);
        }
    };

    const processMetaToken = async (accessToken: string) => {
        try {
            // Ya no necesitamos currentUrl ni redirect_uri
            const result = await handleEmbeddedSignup({ accessToken, agentId });

            if (result.success) {
                toast.success('¡WhatsApp conectado correctamente!');
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
        } catch (error) {
            toast.error('Error procesando la conexión');
        } finally {
            if (!showSelectionModal) {
                setIsProcessing(false);
            }
        }
    };

    const handleAccountSelection = async (account: any) => {
        // Keep isProcessing true
        try {
            const result = await finishWhatsAppSetup({
                accessToken: longLivedToken,
                wabaId: account.wabaId,
                phoneNumberId: account.phoneNumberId,
                agentId
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
                                            {account.phoneNumber}
                                        </p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <span className="font-medium text-gray-400">{account.wabaName}</span>
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
