'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Plus, Clock, ExternalLink, Copy, CheckCircle2, Loader2, DollarSign, Wallet, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { createPaymentLink, getPaymentConfigs } from '@/lib/actions/payments';
import { toast } from 'sonner';

interface PaymentsTabProps {
    contactId: string;
    transactions: any[];
}

export function PaymentsTab({ contactId, transactions: initialTransactions }: PaymentsTabProps) {
    const [transactions, setTransactions] = useState(initialTransactions || []);
    const [configs, setConfigs] = useState<any[]>([]);
    const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);

    // New Link Form State
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [gateway, setGateway] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchConfigs = async () => {
            const result = await getPaymentConfigs();
            if (result.success) {
                setConfigs(result.configs || []);
                if (result.configs?.length > 0) {
                    setGateway(result.configs[0].gateway);
                }
            }
            setIsLoadingConfigs(false);
        };
        fetchConfigs();
    }, []);

    const handleCreateLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description || !gateway || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const result = await createPaymentLink({
                contactId,
                amount: parseFloat(amount),
                description,
                gateway: gateway as any
            });

            if (result.success) {
                setTransactions([result.transaction, ...transactions]);
                setAmount('');
                setDescription('');
                toast.success('¡Link de pago generado con éxito!');
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error('Error al generar el link');
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        toast.success('Link copiado al portapapeles');
    };

    if (isLoadingConfigs) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#21AC96]" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header / Config Check */}
            {configs.length === 0 ? (
                <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-amber-900 font-bold text-sm">Pasarelas no configuradas</h4>
                        <p className="text-amber-700 text-xs">Debes configurar al menos una pasarela (Stripe, PagueloFacil o Cuanto) en los ajustes del workspace.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* New Link Form */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#21AC96]/10 flex items-center justify-center text-[#21AC96]">
                                <Plus className="w-5 h-5" />
                            </div>
                            <h4 className="text-gray-900 font-black uppercase tracking-widest text-[12px]">Generar Link Inteligente</h4>
                        </div>

                        <form onSubmit={handleCreateLink} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1 mb-1 block">Pasarela</label>
                                <select
                                    value={gateway}
                                    onChange={(e) => setGateway(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-3 text-sm focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96]/20 transition-all"
                                >
                                    {configs.map(c => (
                                        <option key={c.gateway} value={c.gateway}>{c.gateway}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1 mb-1 block">Monto (USD)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-3 pl-9 text-sm focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96]/20 transition-all font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !amount || !description}
                                        className="w-full bg-[#21AC96] text-white py-3 rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                                        Crear Link
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1 mb-1 block">Descripción para el cliente</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ej: Pago de consultoría SEO - Mes de Marzo"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96]/20 transition-all min-h-[80px] resize-none"
                                />
                            </div>
                        </form>
                    </div>

                    {/* Stats / Info Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-gradient-to-br from-[#21AC96] to-[#1a8a78] p-8 rounded-[2.5rem] text-white shadow-xl shadow-[#21AC96]/20">
                            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Total Generado</h3>
                            <div className="text-4xl font-black mb-4">
                                ${transactions.reduce((acc, t) => acc + (t.status === 'SUCCESS' ? t.amount : 0), 0).toFixed(2)}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium opacity-90 bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/10 mt-4">
                                <CheckCircle2 className="w-3 h-3" />
                                {transactions.filter(t => t.status === 'SUCCESS').length} Cobros exitosos
                            </div>
                        </div>

                        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200">
                            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Links Pendientes</h3>
                            <div className="text-4xl font-black mb-4">
                                {transactions.filter(t => t.status === 'PENDING').length}
                            </div>
                            <p className="text-[10px] opacity-80 font-medium">Recuérdale a tu cliente que tiene un link activo para cerrar el trato.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Transactions History */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h4 className="text-gray-900 font-black uppercase tracking-widest text-[12px] flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#21AC96]" />
                        Historial de Enlaces
                    </h4>
                </div>

                <div className="space-y-3">
                    {transactions.length > 0 ? (
                        transactions.map((tx: any) => (
                            <div key={tx.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:border-[#21AC96]/20 transition-all group">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tx.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-500' :
                                                tx.status === 'FAILED' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                                            }`}>
                                            <CreditCard className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h5 className="font-black text-gray-900 text-base">${tx.amount.toFixed(2)}</h5>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${tx.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                                                        tx.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {tx.status === 'SUCCESS' ? 'Pagado' : tx.status === 'FAILED' ? 'Fallido' : 'Pendiente'}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 text-xs font-medium truncate max-w-[200px]">{tx.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="text-right mr-4 hidden md:block">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{tx.gateway}</p>
                                            <p className="text-[11px] font-bold text-gray-500">{format(new Date(tx.createdAt), "d MMM, HH:mm", { locale: es })}</p>
                                        </div>

                                        {tx.paymentUrl && (
                                            <>
                                                <button
                                                    onClick={() => copyToClipboard(tx.paymentUrl)}
                                                    className="p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 transition-all border border-gray-100"
                                                    title="Copiar Link"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <a
                                                    href={tx.paymentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-3 bg-[#21AC96]/10 text-[#21AC96] rounded-xl hover:bg-[#21AC96]/20 transition-all border border-[#21AC96]/10"
                                                    title="Ver Checkout"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
                            <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-bold">No hay transacciones registradas</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
