'use client';

import { useState } from 'react';
import { CreditCard, Save, Loader2, ShieldCheck, HelpCircle, Info, Zap, Building2, UserCheck, Smartphone } from 'lucide-react';
import { savePaymentConfig } from '@/lib/actions/payments';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface PaymentSettingsClientProps {
    existingConfigs: any[];
}

export function PaymentSettingsClient({ existingConfigs }: PaymentSettingsClientProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);

    // PagueloFacil State
    const pfConfig = existingConfigs.find(c => c.gateway === 'PAGUELOFACIL')?.config || {};
    const [pagueloFacil, setPagueloFacil] = useState({
        cclw: pfConfig.cclw || '',
        isSandbox: pfConfig.isSandbox ?? true
    });

    // Yappy State
    const yappyConfig = existingConfigs.find(c => c.gateway === 'YAPPY')?.config || {};
    const [yappy, setYappy] = useState({
        merchantId: yappyConfig.merchantId || '',
        secretKey: yappyConfig.secretKey || '',
        isSandbox: yappyConfig.isSandbox ?? true
    });

    const handleSave = async (gateway: 'PAGUELOFACIL' | 'YAPPY', config: any) => {
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
        <div className="max-w-[1600px] mx-auto animate-fade-in p-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-2">Pasarelas de Pago</h1>
                    <p className="text-gray-500 font-medium font-bold">Configura tus cuentas oficiales para habilitar cobros automáticos mediante el Chatbot.</p>
                </div>
            </div>

            {/* Banner de Educación Premium */}
            <div className="relative overflow-hidden bg-gray-900 rounded-[2.5rem] p-8 md:p-10 mb-10 shadow-2xl group border border-white/5">
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-[#21AC96]/10 rounded-full blur-[80px] group-hover:bg-[#21AC96]/20 transition-all duration-700"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-700"></div>

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="flex-1 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#21AC96]/20 to-transparent rounded-full border border-[#21AC96]/20 text-[#21AC96] text-xs font-black uppercase tracking-widest mb-6 shadow-sm">
                            <Zap className="w-4 h-4 animate-pulse fill-[#21AC96]" />
                            Nuevo: Cobros Automáticos
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4 leading-tight lg:max-w-3xl">
                            ¿Sabes cómo cobrar con tus <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#21AC96] to-emerald-400">Pasarelas de Pago</span>?
                        </h2>
                        <p className="text-gray-400 text-lg font-medium max-w-2xl mx-auto lg:mx-0">
                            Conecta tus cuentas de PagueloFacil o Yappy y permite que tu Chatbot cierre ventas y genere enlaces de pago al instante.
                        </p>
                    </div>

                    <div className="shrink-0">
                        <button
                            onClick={() => setIsTutorialOpen(true)}
                            className="group relative flex items-center gap-4 bg-white hover:bg-[#21AC96] text-gray-900 hover:text-white px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm transition-all shadow-2xl hover:shadow-[#21AC96]/40 active:scale-95"
                        >
                            <UserCheck className="w-6 h-6" />
                            Ver Guía de Integración
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* PagueloFacil */}
                <div className="bg-white rounded-[3rem] p-8 md:p-10 border border-gray-100 shadow-xl shadow-gray-100/50 relative overflow-hidden group transition-all hover:border-orange-200 h-full flex flex-col">
                    <div className="absolute top-0 right-0 p-8">
                        <div className="bg-orange-50 text-orange-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100">
                            Recomendado: Tarjetas
                        </div>
                    </div>

                    <div className="flex items-center gap-6 mb-10">
                        <div className="w-20 h-20 bg-orange-50 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner border border-orange-100/50 shrink-0">
                            🇵🇦
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">PagueloFacil</h2>
                            <p className="text-sm text-gray-400 font-bold max-w-xs">Tarjetas de crédito y débito integradas.</p>
                        </div>
                    </div>

                    <div className="space-y-8 flex-1">
                        <div className="group space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1 group-focus-within:text-orange-600 transition-colors flex items-center gap-2">
                                CCLW (Código de Cliente)
                                <span className="text-[10px] bg-orange-50 text-orange-400 px-2 py-0.5 rounded-full">Requerido</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: 1234-5678-..."
                                className="w-full px-8 py-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-mono shadow-inner"
                                value={pagueloFacil.cclw}
                                onChange={(e) => setPagueloFacil({ ...pagueloFacil, cclw: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center gap-8 p-6 bg-gray-50 rounded-[2rem] border border-gray-100 shadow-inner">
                            <div className="flex-1">
                                <p className="text-base font-black text-gray-900">Modo Sandbox</p>
                                <p className="text-sm text-gray-400 font-bold leading-relaxed">Entorno de simulación sin cargos reales.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPagueloFacil({ ...pagueloFacil, isSandbox: !pagueloFacil.isSandbox })}
                                className={`w-16 h-9 rounded-full transition-all relative p-1 ${pagueloFacil.isSandbox ? 'bg-orange-500 shadow-lg shadow-orange-200' : 'bg-gray-200'}`}
                            >
                                <div className={`w-7 h-7 bg-white rounded-full transition-all shadow-sm ${pagueloFacil.isSandbox ? 'translate-x-7' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-8">
                        <button
                            type="button"
                            onClick={() => handleSave('PAGUELOFACIL', pagueloFacil)}
                            disabled={isLoading === 'PAGUELOFACIL' || !pagueloFacil.cclw}
                            className="w-full h-16 bg-gray-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-black hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 shadow-lg shadow-gray-200"
                        >
                            {isLoading === 'PAGUELOFACIL' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-orange-400" />}
                            Guardar Configuración
                        </button>
                    </div>
                </div>

                {/* Yappy Comercial */}
                <div className="bg-white rounded-[3rem] p-8 md:p-10 border border-blue-50 shadow-xl shadow-blue-100/30 relative overflow-hidden group transition-all hover:border-blue-200 h-full flex flex-col">
                    <div className="absolute top-0 right-0 p-8">
                        <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                            Mas Popular en Panamá
                        </div>
                    </div>

                    <div className="flex items-center gap-6 mb-10">
                        <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner border border-blue-100/50 shrink-0">
                            🇵🇦
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">Yappy Comercial</h2>
                            <p className="text-sm text-gray-400 font-bold max-w-xs">El método favorito de Panamá.</p>
                        </div>
                    </div>

                    <div className="space-y-8 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="group space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1 group-focus-within:text-blue-600 transition-colors">Merchant ID</label>
                                <input
                                    type="text"
                                    placeholder="..."
                                    className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono shadow-inner"
                                    value={yappy.merchantId}
                                    onChange={(e) => setYappy({ ...yappy, merchantId: e.target.value })}
                                />
                            </div>
                            <div className="group space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1 group-focus-within:text-blue-600 transition-colors">Secret Key</label>
                                <input
                                    type="password"
                                    placeholder="••••••••••••"
                                    className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono shadow-inner"
                                    value={yappy.secretKey}
                                    onChange={(e) => setYappy({ ...yappy, secretKey: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-8 p-6 bg-gray-50 rounded-[2rem] border border-gray-100 shadow-inner">
                            <div className="flex-1">
                                <p className="text-base font-black text-gray-900">Yappy Sandbox</p>
                                <p className="text-sm text-gray-400 font-bold leading-relaxed">Activa para pruebas de integración.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setYappy({ ...yappy, isSandbox: !yappy.isSandbox })}
                                className={`w-16 h-9 rounded-full transition-all relative p-1 ${yappy.isSandbox ? 'bg-blue-600 shadow-lg shadow-blue-200' : 'bg-gray-200'}`}
                            >
                                <div className={`w-7 h-7 bg-white rounded-full transition-all shadow-sm ${yappy.isSandbox ? 'translate-x-7' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-8">
                        <button
                            type="button"
                            onClick={() => handleSave('YAPPY', yappy)}
                            disabled={isLoading === 'YAPPY' || !yappy.merchantId || !yappy.secretKey}
                            className="w-full h-16 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-blue-700 hover:shadow-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-100 disabled:opacity-50 active:scale-95"
                        >
                            {isLoading === 'YAPPY' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Habilitar Yappy Comercial
                        </button>
                    </div>
                </div>
            </div>

            {/* Seguridad */}
            <div className="mt-16 bg-gradient-to-br from-indigo-50/50 to-white p-10 rounded-[3.5rem] border border-indigo-100 flex flex-col md:flex-row gap-10 items-center max-w-7xl shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="w-24 h-24 shrink-0 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-200 border border-indigo-50">
                    <ShieldCheck className="w-10 h-10 text-indigo-600" />
                </div>
                <div className="relative z-10 flex-1">
                    <h3 className="text-indigo-900 font-black text-2xl mb-3 tracking-tight">Seguridad de Nivel Bancario</h3>
                    <p className="text-indigo-600/70 text-lg font-bold leading-relaxed max-w-5xl">
                        Tus credenciales se almacenan mediante encriptación de grado militar AES-256. El sistema solo genera enlaces de pago y consulta estados de transacciones, nunca tiene acceso a tus fondos. La operativa financiera ocurre exclusivamente dentro de los sistemas oficiales.
                    </p>
                </div>
            </div>

            {/* Modal de Tutorial Unificado */}
            <Dialog open={isTutorialOpen} onOpenChange={setIsTutorialOpen}>
                <DialogContent className="max-w-4xl bg-white border-none shadow-2xl rounded-[3rem] p-0 overflow-hidden outline-none">
                    <div className="bg-gray-900 p-12 text-white relative">
                        <div className="flex flex-col items-center text-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-6">
                                Tutorial de Integración
                            </div>
                            <h3 className="text-4xl font-black tracking-tight mb-4 leading-tight">Domina tus Cobros en Línea</h3>
                            <p className="text-gray-400 font-bold text-lg max-w-xl">Aprende a conectar PagueloFacil y Yappy en menos de 5 minutos.</p>
                        </div>
                    </div>

                    <div className="p-10 space-y-12 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {/* Seccion PagueloFacil */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 font-black">1</div>
                                <h4 className="text-xl font-black text-gray-900 tracking-tight">Integrando PagueloFacil (Tarjetas)</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex gap-4 p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                                        <Building2 className="w-6 h-6 text-orange-600 shrink-0" />
                                        <div>
                                            <p className="text-sm font-black text-gray-900 mb-1">Cuenta Activa</p>
                                            <p className="text-xs font-bold text-gray-500">Debes tener una cuenta oficial en PagueloFacil.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                                        <Info className="w-6 h-6 text-orange-600 shrink-0" />
                                        <div>
                                            <p className="text-sm font-black text-gray-900 mb-1">Código CCLW</p>
                                            <p className="text-xs font-bold text-gray-500">Lo encuentras en tu portal administrativo de PF.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100 space-y-3">
                                    <p className="text-xs font-black text-orange-700 uppercase tracking-widest">Paso a paso express:</p>
                                    <ul className="space-y-2">
                                        {['Login en PagueloFacil', 'Ajustes > Integración', 'Copia tu CCLW', 'Pégalo en el panel'].map((step, i) => (
                                            <li key={i} className="flex items-center gap-3 text-xs font-bold text-orange-600/80">
                                                <div className="w-5 h-5 rounded-full bg-white text-orange-600 flex items-center justify-center text-[10px] shrink-0 font-black">{i + 1}</div>
                                                {step}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Seccion Yappy */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black">2</div>
                                <h4 className="text-xl font-black text-gray-900 tracking-tight">Integrando Yappy Comercial</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex gap-4 p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                                        <Smartphone className="w-6 h-6 text-blue-600 shrink-0" />
                                        <div>
                                            <p className="text-sm font-black text-gray-900 mb-1">Botón de Pago</p>
                                            <p className="text-xs font-bold text-gray-500">Activa el "Botón de Pago" en tu administrativo de Yappy.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                                        <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
                                        <div>
                                            <p className="text-sm font-black text-gray-900 mb-1">Llaves de API</p>
                                            <p className="text-xs font-bold text-gray-500">Genera tu Merchant ID y Secret Key.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 space-y-3">
                                    <p className="text-xs font-black text-blue-700 uppercase tracking-widest">Ventajas locales:</p>
                                    <p className="text-xs font-bold text-blue-600/80 leading-relaxed">
                                        Yappy es el método más rápido en Panamá. Al integrarlo, el Chatbot envía un link directo que abre la App de Banco General del cliente para confirmar el pago al instante.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 bg-gray-50 flex items-center justify-between gap-6 border-t border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-gray-900 border border-gray-100">
                                <HelpCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-gray-900 font-black text-sm">¿Dudas adicionales?</p>
                                <p className="text-gray-500 text-xs font-bold">Contacta a soporte técnico.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsTutorialOpen(false)}
                            className="bg-gray-900 text-white px-10 py-4 rounded-[1.2rem] font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl active:scale-95"
                        >
                            ¡Entendido!
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
