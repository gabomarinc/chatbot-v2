'use client';

import { useState } from 'react';
import { Loader2, Key, Smartphone, Check, ArrowRight, ShieldCheck } from 'lucide-react';
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
    const [step, setStep] = useState<'API_KEY' | 'SELECT_NUMBER'>('API_KEY');
    const [isLoading, setIsLoading] = useState(false);

    const [apiKey, setApiKey] = useState(existingChannel?.configJson?.apiKey || '');
    const [wabas, setWabas] = useState<YcloudWABA[]>([]);
    const [selectedWabaId, setSelectedWabaId] = useState('');

    const [phoneNumbers, setPhoneNumbers] = useState<YcloudPhoneNumber[]>([]);
    const [selectedPhone, setSelectedPhone] = useState<YcloudPhoneNumber | null>(null);

    const handleVerifyKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiKey) {
            toast.error('Ingresa tu API Key de Ycloud');
            return;
        }

        setIsLoading(true);
        try {
            // Support DEMO mode for testing
            if (apiKey === 'demo') {
                setWabas([{ id: 'waba_demo', name: 'Demo Business', currency: 'USD', timezone_id: 'UTC', message_template_namespace: 'ns' }]);
                setStep('SELECT_NUMBER');
                setIsLoading(false);
                return;
            }

            const result = await fetchYcloudWABAsAction(apiKey);

            if (result.success && result.accounts) {
                if (result.accounts.length === 0) {
                    // If no accounts found, we still proceed to see if we can find numbers (rare but possible) or just show empty state
                    // But strictly speaking we need a WABA to proceed to next step in UI ideally.
                    // However, passing specific error message might be better.
                    // Or just showing empty list in next step?
                    // Let's set empty array.
                    setWabas([]);
                    // Also try fetching numbers directly just in case the user has numbers but WABA listing is restricted
                    const numResult = await fetchYcloudPhoneNumbersAction(apiKey, 'none');
                    if (numResult.success && numResult.numbers && numResult.numbers.length > 0) {
                        // Create a virtual WABA to hold these numbers
                        setWabas([{ id: 'direct', name: 'Direct Access', currency: 'USD', timezone_id: 'UTC', message_template_namespace: '' }]);
                    } else {
                        toast.warning('La API Key funciona, pero no se encontraron cuentas de WhatsApp.');
                    }
                } else {
                    setWabas(result.accounts);
                }
                setStep('SELECT_NUMBER');
            } else {
                toast.error(result.error || 'Error al verificar la API Key');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFetchNumbers = async (wabaId: string) => {
        setSelectedWabaId(wabaId);
        setIsLoading(true);
        try {
            if (apiKey === 'demo') {
                setTimeout(() => {
                    setPhoneNumbers([
                        { id: 'phone_1', display_phone_number: '+1 555 0123', verified_name: 'My Business', quality_rating: 'GREEN', code_verification_status: 'VERIFIED' },
                        { id: 'phone_2', display_phone_number: '+1 555 0199', verified_name: 'Support Line', quality_rating: 'GREEN', code_verification_status: 'VERIFIED' }
                    ]);
                    setIsLoading(false);
                }, 500);
                return;
            }

            const result = await fetchYcloudPhoneNumbersAction(apiKey, wabaId);
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
        if (!selectedPhone || !apiKey) return;

        setIsLoading(true);
        try {
            const payload = {
                agentId: agentId,
                displayName: selectedPhone.verified_name || selectedPhone.display_phone_number,
                type: 'WHATSAPP' as const,
                configJson: {
                    provider: 'YCLOUD',
                    apiKey: apiKey,
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

    return (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-[#0057FF]/5 border-b border-[#0057FF]/10 p-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#0057FF] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#0057FF]/20">
                        <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900">Conexión Ycloud</h3>
                        <p className="text-gray-500 text-sm font-medium">WhatsApp Business API High-Performance</p>
                    </div>
                </div>
                {step === 'SELECT_NUMBER' && (
                    <button
                        onClick={() => setStep('API_KEY')}
                        className="text-xs font-bold text-[#0057FF] hover:underline"
                    >
                        Cambiar API Key
                    </button>
                )}
            </div>

            <div className="p-8">
                {step === 'API_KEY' ? (
                    <form onSubmit={handleVerifyKey} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                                Ycloud API Key
                            </label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Pegue su API Key aquí..."
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 font-medium focus:ring-4 focus:ring-[#0057FF]/10 focus:border-[#0057FF] transition-all"
                                    required
                                />
                            </div>
                            <p className="text-xs text-gray-400 pl-1">
                                Puede encontrar su API Key en el <a href="https://console.ycloud.com" target="_blank" className="text-[#0057FF] font-bold hover:underline">Dashboard de Ycloud</a>.
                            </p>
                        </div>

                        <div className="flex gap-4 pt-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !apiKey}
                                className="flex-[2] py-4 bg-[#0057FF] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#0057FF]/20 hover:bg-[#0046CC] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                                Verificar y Continuar
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6">
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
                                onClick={() => setStep('API_KEY')}
                                className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-all"
                            >
                                Atrás
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
                )}
            </div>
        </div>
    );
}
