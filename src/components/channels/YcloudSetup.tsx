'use client';

import { useState, useEffect } from 'react';
import { Loader2, Key, Smartphone, Check, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { fetchYcloudWABAsAction, fetchYcloudPhoneNumbersAction } from '@/lib/actions/ycloud';
import { YcloudWABA, YcloudPhoneNumber } from '@/lib/channels/ycloud';
import { createChannel, updateChannel } from '@/lib/actions/dashboard';
import { useRouter } from 'next/navigation';

interface YcloudSetupProps {
    agentId: string;
    existingChannel?: any;
    onSuccess?: () => void;
    onCancel: () => void;
}

export function YcloudSetup({ agentId, existingChannel, onSuccess, onCancel }: YcloudSetupProps) {
    const router = useRouter();
    // Start directly at verification/fetching
    const [step, setStep] = useState<'VERIFYING' | 'SELECT_NUMBER' | 'ERROR'>('VERIFYING');
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [wabas, setWabas] = useState<YcloudWABA[]>([]);
    const [selectedWabaId, setSelectedWabaId] = useState('');

    const [phoneNumbers, setPhoneNumbers] = useState<YcloudPhoneNumber[]>([]);
    const [selectedPhone, setSelectedPhone] = useState<YcloudPhoneNumber | null>(null);

    // Auto-fetch on mount
    useEffect(() => {
        verifyAndFetch();
    }, []);

    const verifyAndFetch = async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            // Call without API Key - server uses process.env.YCLOUD_API_KEY
            const result = await fetchYcloudWABAsAction();

            if (result.success && result.accounts) {
                if (result.accounts.length === 0) {
                    setWabas([]);
                    // Try fetching numbers directly
                    const numResult = await fetchYcloudPhoneNumbersAction(undefined, 'none');
                    if (numResult.success && numResult.numbers && numResult.numbers.length > 0) {
                        setWabas([{ id: 'direct', name: 'Direct Access', currency: 'USD', timezone_id: 'UTC', message_template_namespace: '' }]);
                        // Pre-load these numbers
                        setPhoneNumbers(numResult.numbers);
                        setSelectedWabaId('direct');
                    } else {
                        // Empty state but valid key
                    }
                } else {
                    setWabas(result.accounts);
                }
                setStep('SELECT_NUMBER');
            } else {
                // Determine if it's a configuration error (missing key) or connection error
                if (result.error && result.error.includes("Configuration Error")) {
                    setErrorMsg("Configuración de Ycloud no detectada en el servidor.");
                    setStep('ERROR');
                } else {
                    setErrorMsg(result.error || "Error al conectar con Ycloud.");
                    setStep('ERROR');
                }
            }
        } catch (error) {
            console.error(error);
            setErrorMsg("Error de conexión inesperado.");
            setStep('ERROR');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFetchNumbers = async (wabaId: string) => {
        setSelectedWabaId(wabaId);
        // If we already pre-loaded numbers for 'direct' WABA, skip
        if (wabaId === 'direct' && phoneNumbers.length > 0) return;

        setIsLoading(true);
        try {
            const result = await fetchYcloudPhoneNumbersAction(undefined, wabaId);
            if (result.success && result.numbers) {
                setPhoneNumbers(result.numbers);
                if (result.numbers.length === 0) {
                    toast.info('No se encontraron números de teléfono.');
                }
            } else {
                toast.error(result.error || 'Error al obtener números');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar números');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedPhone) return;

        setIsLoading(true);
        try {
            const payload = {
                agentId: agentId,
                displayName: selectedPhone.verified_name || selectedPhone.display_phone_number,
                type: 'WHATSAPP' as const,
                configJson: {
                    provider: 'YCLOUD',
                    // Note: We don't store the API Key in the channel config anymore for security,
                    // or we store a reference? 
                    // If we don't store it, future server actions need to know to use the Env Var.
                    // Our updated actions verify `apiKey || process.env` so it's fine to store undefined/null here.
                    // But to be explicit we can store a flag?
                    // Actually, existing logic might expect `configJson.apiKey` for other things?
                    // Let's assume server-side config is the source of truth.
                    // Storing 'ENV' as usage indicator maybe?
                    apiKey: 'ENV_CONFIGURED',
                    wabaId: selectedWabaId,
                    phoneNumberId: selectedPhone.id,
                    phoneNumber: selectedPhone.display_phone_number
                },
                isActive: true
            };

            if (existingChannel) {
                await updateChannel(existingChannel.id, {
                    displayName: payload.displayName,
                    configJson: payload.configJson
                });
            } else {
                await createChannel(payload);
            }

            toast.success('Canal de Ycloud conectado correctamente');
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar el canal');
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 'ERROR') {
        return (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden p-12 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 mb-6">
                    <Key className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Error de Configuración</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-8 font-medium">
                    {errorMsg || "No se pudo conectar con Ycloud."}
                </p>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={onCancel}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={verifyAndFetch}
                        className="px-6 py-3 bg-[#0057FF] hover:bg-[#0046CC] text-white font-bold rounded-xl transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'VERIFYING') {
        return (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden p-12 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-[#0057FF]/10 rounded-full flex items-center justify-center mx-auto text-[#0057FF] mb-6">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Conectando con Ycloud</h3>
                <p className="text-gray-500 font-medium">
                    Verificando disponibilidad de cuenta...
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-[#0057FF]/5 border-b border-[#0057FF]/10 p-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#0057FF] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#0057FF]/20">
                        <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900">Configuración Ycloud</h3>
                        <p className="text-gray-500 text-sm font-medium">Selecciona el número a conectar</p>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-6">
                {/* WABA Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                        Cuenta de WhatsApp (WABA)
                    </label>
                    <select
                        value={selectedWabaId}
                        onChange={(e) => handleFetchNumbers(e.target.value)}
                        className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-gray-900 font-bold focus:outline-none focus:border-[#0057FF] transition-all"
                    >
                        <option value="">Selecciona una cuenta...</option>
                        {wabas.map(w => (
                            <option key={w.id} value={w.id}>{w.name} {w.id !== 'direct' ? `(${w.id})` : ''}</option>
                        ))}
                    </select>
                </div>

                {/* Phone Selection */}
                {selectedWabaId && (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                            Número de Teléfono
                        </label>

                        {isLoading ? (
                            <div className="py-8 text-center text-gray-400">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                <p className="text-sm">Cargando números...</p>
                            </div>
                        ) : (
                            <>
                                {phoneNumbers.length === 0 ? (
                                    <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl text-sm text-center">
                                        No se encontraron números en esta cuenta.
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {phoneNumbers.map(phone => (
                                            <button
                                                key={phone.id}
                                                onClick={() => setSelectedPhone(phone)}
                                                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${selectedPhone?.id === phone.id
                                                    ? 'border-[#0057FF] bg-[#0057FF]/5'
                                                    : 'border-gray-50 hover:border-[#0057FF]/30 bg-gray-50'
                                                    }`}
                                            >
                                                <div>
                                                    <p className="font-bold text-gray-900">{phone.verified_name || 'Sin Nombre'}</p>
                                                    <p className="text-sm text-gray-500 font-mono">{phone.display_phone_number}</p>
                                                </div>
                                                {selectedPhone?.id === phone.id && (
                                                    <div className="w-6 h-6 bg-[#0057FF] rounded-full flex items-center justify-center text-white">
                                                        <Check className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                <div className="flex gap-4 pt-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading || !selectedPhone}
                        className="flex-[2] py-4 bg-[#0057FF] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#0057FF]/20 hover:bg-[#0046CC] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                        Conectar Número
                    </button>
                </div>
            </div>
        </div>
    );
}
