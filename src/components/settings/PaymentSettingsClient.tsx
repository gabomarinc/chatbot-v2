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
        <div className="space-y-10 animate-fade-in max-w-5xl mx-auto pb-20">
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-900 rounded-2xl">
                        <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-gray-900 text-3xl font-black tracking-tight">Pasarelas de Pago</h1>
                </div>
                <p className="text-gray-500 font-medium text-lg">Configura tus cuentas oficiales para habilitar cobros automáticos mediante el Chatbot.</p>
            </div>

            <div className="grid grid-cols-1 gap-10">
                {/* PagueloFacil */}
                <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-gray-100 shadow-xl shadow-gray-100/50 relative overflow-hidden group transition-all hover:border-orange-200">
                    <div className="absolute top-0 right-0 p-8">
                        <div className="bg-orange-50 text-orange-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100">
                            Recomendado: Tarjetas
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-orange-50 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner border border-orange-100/50 shrink-0">
                                🇵🇦
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">PagueloFacil</h2>
                                <p className="text-sm text-gray-400 font-bold max-w-xs">Procesa todas las tarjetas de crédito y débito con una sola integración.</p>
                            </div>
                        </div>

                        <Dialog>
                            <DialogTrigger asChild>
                                <button type="button" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-600 bg-orange-50 py-3 px-6 rounded-2xl hover:bg-orange-100 transition-all border border-orange-100 outline-none focus:ring-2 focus:ring-orange-500/20 active:scale-95 cursor-pointer z-10">
                                    <HelpCircle className="w-4 h-4 pointer-events-none" />
                                    <span className="pointer-events-none">¿Cómo funciona?</span>
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white outline-none">
                                <DialogHeader className="sr-only">
                                    <DialogTitle>Instrucciones PagueloFacil</DialogTitle>
                                    <DialogDescription>Pasos para integrar PagueloFacil</DialogDescription>
                                </DialogHeader>
                                <div className="bg-orange-600 p-8 text-white">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Zap className="w-6 h-6 fill-white" />
                                        <h3 className="text-2xl font-black uppercase tracking-tight">Integración PagueloFacil</h3>
                                    </div>
                                    <p className="opacity-80 font-bold">Automatiza tus cobros con tarjetas en minutos.</p>
                                </div>
                                <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">¿Qué necesitas?</h4>
                                        <div className="grid gap-4">
                                            <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <Building2 className="w-5 h-5 text-orange-600 shrink-0" />
                                                <p className="text-sm font-bold text-gray-700 leading-relaxed">Tener una cuenta activa en PagueloFacil (Persona Natural o Jurídica).</p>
                                            </div>
                                            <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <Info className="w-5 h-5 text-orange-600 shrink-0" />
                                                <p className="text-sm font-bold text-gray-700 leading-relaxed">Obtener tu código CCLW desde el portal de proveedores.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Paso a paso</h4>
                                        <ul className="space-y-3">
                                            {['Inicia sesión en PagueloFacil', 'Ve a ajustes de integración', 'Copia tu ID de usuario (CCLW)', 'Pégalo aquí y guarda'].map((step, i) => (
                                                <li key={i} className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] shrink-0">{i + 1}</div>
                                                    {step}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 line-relaxed">
                                        <p className="text-xs text-orange-700 font-bold"><strong>Beneficios:</strong> Tus clientes podrán pagar sin salir del chat, recibirás confirmación instantánea y el dinero caerá directo a tu cuenta de PagueloFacil.</p>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="space-y-8">
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
                                <p className="text-base font-black text-gray-900">Modo Sandbox (Pruebas)</p>
                                <p className="text-sm text-gray-400 font-bold leading-relaxed">Usa el entorno de simulación para validar el flujo del bot sin cargos reales.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPagueloFacil({ ...pagueloFacil, isSandbox: !pagueloFacil.isSandbox })}
                                className={`w-16 h-9 rounded-full transition-all relative p-1 ${pagueloFacil.isSandbox ? 'bg-orange-500 shadow-lg shadow-orange-200' : 'bg-gray-200'}`}
                            >
                                <div className={`w-7 h-7 bg-white rounded-full transition-all shadow-sm ${pagueloFacil.isSandbox ? 'translate-x-7' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleSave('PAGUELOFACIL', pagueloFacil)}
                            disabled={isLoading === 'PAGUELOFACIL' || !pagueloFacil.cclw}
                            className="w-full h-16 bg-gray-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-black hover:scale-[1.01] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-gray-300 disabled:opacity-50 active:scale-95"
                        >
                            {isLoading === 'PAGUELOFACIL' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-orange-400" />}
                            Guardar Configuración
                        </button>
                    </div>
                </div>

                {/* Yappy Comercial */}
                <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-blue-50 shadow-xl shadow-blue-100/30 relative overflow-hidden group transition-all hover:border-blue-200">
                    <div className="absolute top-0 right-0 p-8">
                        <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                            Mas Popular en Panamá
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner border border-blue-100/50 shrink-0">
                                🇵🇦
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    Yappy Comercial
                                </h2>
                                <p className="text-sm text-gray-400 font-bold max-w-xs">Ofrece el método de pago favorito de Panamá de forma 100% automatizada.</p>
                            </div>
                        </div>

                        <Dialog>
                            <DialogTrigger asChild>
                                <button type="button" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 py-3 px-6 rounded-2xl hover:bg-blue-100 transition-all border border-blue-100 outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95 cursor-pointer z-10">
                                    <HelpCircle className="w-4 h-4 pointer-events-none" />
                                    <span className="pointer-events-none">¿Cómo funciona?</span>
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white outline-none">
                                <DialogHeader className="sr-only">
                                    <DialogTitle>Instrucciones Yappy</DialogTitle>
                                    <DialogDescription>Pasos para integrar Yappy Comercial</DialogDescription>
                                </DialogHeader>
                                <div className="bg-blue-600 p-8 text-white">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Smartphone className="w-6 h-6" />
                                        <h3 className="text-2xl font-black uppercase tracking-tight">Integración Yappy Comercial</h3>
                                    </div>
                                    <p className="opacity-80 font-bold">Cobrar por Yappy nunca fue tan profesional.</p>
                                </div>
                                <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Requisitos Previos</h4>
                                        <div className="grid gap-4">
                                            <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <UserCheck className="w-5 h-5 text-blue-600 shrink-0" />
                                                <p className="text-sm font-bold text-gray-700 leading-relaxed">Tener cuenta de empresa en Banco General y contrato de Yappy Comercial.</p>
                                            </div>
                                            <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                                                <p className="text-sm font-bold text-gray-700 leading-relaxed">Solicitar acceso al "Botón de Pago" en el portal administrativo de Yappy.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">¿Qué obtienes de aquí?</h4>
                                        <p className="text-sm font-bold text-gray-600 leading-relaxed">
                                            Al configurar el <strong>Merchant ID</strong> y <strong>Secret Key</strong>, el bot podrá generar códigos QR únicos y links para que tus clientes paguen desde su propia App de Banco General en segundos.
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 text-blue-700 font-bold text-xs leading-relaxed">
                                        <strong>Beneficios de Yappy:</strong> Dinero al instante, confianza del cliente local y tasas de comisión competitivas. ¡Es el pago que todos en Panamá ya tienen en el bolsillo!
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1 group-focus-within:text-blue-600 transition-colors">Merchant ID</label>
                            <input
                                type="text"
                                placeholder="..."
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-[2rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                                value={yappy.merchantId}
                                onChange={(e) => setYappy({ ...yappy, merchantId: e.target.value })}
                            />
                        </div>
                        <div className="group space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1 group-focus-within:text-blue-600 transition-colors">Secret Key</label>
                            <input
                                type="password"
                                placeholder="••••••••••••"
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-[2rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                                value={yappy.secretKey}
                                onChange={(e) => setYappy({ ...yappy, secretKey: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mt-8">
                        <button
                            type="button"
                            onClick={() => handleSave('YAPPY', yappy)}
                            disabled={isLoading === 'YAPPY' || !yappy.merchantId || !yappy.secretKey}
                            className="w-full h-16 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 hover:scale-[1.01] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-200 disabled:opacity-50 active:scale-95"
                        >
                            {isLoading === 'YAPPY' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Habilitar Yappy Comercial
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-indigo-50/50 p-10 rounded-[3rem] border border-indigo-100 flex flex-col md:flex-row gap-8 items-center mt-16 max-w-4xl mx-auto shadow-sm">
                <div className="w-20 h-20 shrink-0 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-indigo-200">
                    <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h3 className="text-indigo-900 font-black text-xl mb-2 tracking-tight">Seguridad de Nivel Bancario</h3>
                    <p className="text-indigo-600/70 text-base font-medium leading-relaxed">
                        Tus credenciales se almacenan mediante encriptación AES-256. El sistema solo tiene permisos para consultar estados de órdenes y generar links, nunca para retirar fondos de tus cuentas. Toda la operativa financiera ocurre dentro de las plataformas oficiales de PagueloFacil y Banco General.
                    </p>
                </div>
            </div>
        </div>
    );
}
