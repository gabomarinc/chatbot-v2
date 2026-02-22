'use client';

import { useState } from 'react';
import { CreditCard, Save, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { savePaymentConfig } from '@/lib/actions/payments';
import { toast } from 'sonner';

interface PaymentSettingsClientProps {
    existingConfigs: any[];
}

export function PaymentSettingsClient({ existingConfigs }: PaymentSettingsClientProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null);

    // PagueloFacil State
    const pfConfig = existingConfigs.find(c => c.gateway === 'PAGUELOFACIL')?.config || {};
    const [pagueloFacil, setPagueloFacil] = useState({
        cclw: pfConfig.cclw || '',
        isSandbox: pfConfig.isSandbox ?? true
    });

    // Cuanto State
    const cuantoConfig = existingConfigs.find(c => c.gateway === 'CUANTO')?.config || {};
    const [cuanto, setCuanto] = useState({
        apiKey: cuantoConfig.apiKey || '',
        isSandbox: cuantoConfig.isSandbox ?? true
    });

    const handleSave = async (gateway: 'PAGUELOFACIL' | 'CUANTO' | 'STRIPE', config: any) => {
        setIsLoading(gateway);
        try {
            const res = await savePaymentConfig(gateway, config);
            if (res.success) {
                toast.success(`Configuración de ${gateway} guardada con éxito`);
            } else {
                toast.error(res.error || 'Error al guardar');
            }
        } catch (error) {
            toast.error('Ocurrío un error inesperado');
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col gap-2">
                <h1 className="text-gray-900 text-2xl font-black tracking-tight">Pasarelas de Pago</h1>
                <p className="text-gray-500 font-medium">Configura tus cuentas para que el bot pueda cobrar automáticamente.</p>
            </div>

            <div className="grid grid-cols-1 gap-8 max-w-4xl">
                {/* PagueloFacil */}
                <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6">
                        <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100">
                            Panamá & Latam
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-3xl">
                            🇵🇦
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">PagueloFacil</h2>
                            <p className="text-sm text-gray-400 font-bold">Cobros rápidos con tarjetas de crédito y débito.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="group space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1 group-focus-within:text-orange-600 transition-colors">
                                CCLW (Código de Cliente)
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: 1234-5678-..."
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono"
                                value={pagueloFacil.cclw}
                                onChange={(e) => setPagueloFacil({ ...pagueloFacil, cclw: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="flex-1">
                                <p className="text-sm font-black text-gray-900">Modo Sandbox (Pruebas)</p>
                                <p className="text-xs text-gray-400 font-bold">Usa el entorno de pruebas para no procesar cargos reales.</p>
                            </div>
                            <button
                                onClick={() => setPagueloFacil({ ...pagueloFacil, isSandbox: !pagueloFacil.isSandbox })}
                                className={`w-14 h-8 rounded-full transition-all relative ${pagueloFacil.isSandbox ? 'bg-orange-500' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${pagueloFacil.isSandbox ? 'right-1' : 'left-1 shadow-sm'}`} />
                            </button>
                        </div>

                        <button
                            onClick={() => handleSave('PAGUELOFACIL', pagueloFacil)}
                            disabled={isLoading === 'PAGUELOFACIL' || !pagueloFacil.cclw}
                            className="w-full h-14 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-gray-200 disabled:opacity-50"
                        >
                            {isLoading === 'PAGUELOFACIL' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Guardar Configuración
                        </button>
                    </div>
                </div>

                {/* Cuanto (Próximamente/Placeholder) */}
                <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-sm opacity-60">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl">
                            💰
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Cuanto</h2>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[8px] font-black uppercase tracking-tighter">Próximamente</span>
                            </div>
                            <p className="text-sm text-gray-400 font-bold">Integración directa con el App de Cuanto.</p>
                        </div>
                    </div>
                    <div className="h-20 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl">
                        <p className="text-xs font-black text-gray-300 uppercase tracking-widest">En desarrollo</p>
                    </div>
                </div>
            </div>

            <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 max-w-4xl flex gap-6 mt-12">
                <div className="w-12 h-12 shrink-0 bg-indigo-600 rounded-2xl flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h3 className="text-indigo-900 font-black text-lg mb-1 tracking-tight">Seguridad de tus Credenciales</h3>
                    <p className="text-indigo-600/70 text-sm font-medium leading-relaxed">
                        Tus API Keys están encriptadas en reposo y nunca se comparten con terceros. Solo el bot las utiliza para generar links de pago oficiales a través de las APIs seguras de cada pasarela.
                    </p>
                </div>
            </div>
        </div>
    );
}
