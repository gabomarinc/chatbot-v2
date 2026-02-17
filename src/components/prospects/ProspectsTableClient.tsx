'use client';

import { useState, useMemo } from 'react';
import { UserCircle, Search, Filter, MoreVertical, MessageSquare, Calendar, Phone, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProspectDetailsModal } from './ProspectDetailsModal';
import { getProspectDetails } from '@/lib/actions/dashboard';
import { toast } from 'sonner';
import Link from 'next/link';

interface ProspectsTableClientProps {
    initialProspects: any[];
    workspaceId?: string;
    customFields?: any[];
}

export function ProspectsTableClient({ initialProspects, workspaceId, customFields }: ProspectsTableClientProps) {
    const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
    const [modalData, setModalData] = useState<any>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Client-side filtering
    const filteredProspects = useMemo(() => {
        if (!searchQuery.trim()) return initialProspects;

        const query = searchQuery.toLowerCase().trim();
        return initialProspects.filter(p =>
            (p.name?.toLowerCase().includes(query)) ||
            (p.phone?.toLowerCase().includes(query)) ||
            (p.email?.toLowerCase().includes(query))
        );
    }, [initialProspects, searchQuery]);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const prospects = filteredProspects; // Export filtered results
            if (prospects.length === 0) {
                toast.error("No hay contactos para exportar");
                return;
            }

            // Headers
            const headers = [
                'Nombre',
                'Email',
                'Telefono',
                'Canal',
                'Estado',
                'Agente',
                'Mensajes',
                'Etiquetas',
                'Fecha Captacion',
                'Ultima Interaccion'
            ];

            // Add custom field headers
            const relevantFields = customFields || [];
            if (relevantFields.length > 0) {
                headers.push(...relevantFields.map((f: any) => f.label));
            }

            const csvRows = [headers.join(',')];

            prospects.forEach(p => {
                const tags = (p.tags || []).join(', ');
                const row = [
                    `"${(p.name || '').replace(/"/g, '""')}"`,
                    p.email || '',
                    p.phone || '',
                    p.channelType || 'WEBCHAT',
                    p.status || 'OPEN',
                    `"${(p.agentName || '').replace(/"/g, '""')}"`,
                    p.messagesCount || 0,
                    `"${tags.replace(/"/g, '""')}"`,
                    format(new Date(p.createdAt), 'yyyy-MM-dd HH:mm'),
                    format(new Date(p.lastContact), 'yyyy-MM-dd HH:mm')
                ];

                relevantFields.forEach((f: any) => {
                    const value = p.customData?.[f.key] ?? '';
                    row.push(`"${String(value).replace(/"/g, '""')}"`);
                });

                csvRows.push(row.join(','));
            });

            const csvContent = "\uFEFF" + csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `contactos_global_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success(`${prospects.length} contactos exportados correctamente`);
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Error al exportar contactos");
        } finally {
            setIsExporting(false);
        }
    };

    const handleRowClick = async (prospectId: string) => {
        setSelectedProspectId(prospectId);
        setIsLoadingDetails(true);
        setModalData(null);

        try {
            const data = await getProspectDetails(prospectId);
            setModalData(data);
        } catch (error) {
            console.error("Error fetching prospect details:", error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleCloseModal = () => {
        setSelectedProspectId(null);
        setModalData(null);
    };

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-end gap-3 mb-8">
                {/* Unified Action Bar */}
                <div className="relative group min-w-[320px]">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#21AC96] transition-all" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o teléfono..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96] transition-all shadow-sm"
                    />
                </div>

                <Link
                    href="/prospects"
                    className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-100 rounded-2xl text-sm text-gray-700 hover:shadow-md hover:border-gray-200 transition-all font-bold group shadow-sm"
                >
                    <Filter className="w-4 h-4 text-gray-400 group-hover:text-[#21AC96]" />
                    Filtros
                </Link>

                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-6 py-3 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all cursor-pointer disabled:opacity-50"
                >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Exportar CSV
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-50">
                                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Nombre / Contacto</th>
                                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Última Interacción</th>
                                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Agente Asignado</th>
                                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Mensajes</th>
                                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredProspects.length > 0 ? (
                                filteredProspects.map((prospect) => (
                                    <tr
                                        key={prospect.id}
                                        onClick={() => handleRowClick(prospect.id)}
                                        className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-[#21AC96]/5 flex items-center justify-center text-[#21AC96] group-hover:scale-110 transition-transform shadow-sm">
                                                    <UserCircle className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-gray-900 font-extrabold tracking-tight">{prospect.name}</span>
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                                        <Phone className="w-3 h-3" />
                                                        {prospect.phone}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-700 font-bold">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    {format(new Date(prospect.lastContact), "d MMM, yyyy", { locale: es })}
                                                </div>
                                                <span className="text-xs text-gray-400 font-medium mt-0.5">
                                                    {format(new Date(prospect.lastContact), "HH:mm 'hs'")}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                                                {prospect.agentName}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="inline-flex items-center gap-1.5 text-sm font-extrabold text-gray-900">
                                                <MessageSquare className="w-4 h-4 text-[#21AC96]" />
                                                {prospect.messagesCount}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <button
                                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Dropdown logic here if needed
                                                }}
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
                                                <UserCircle className="w-10 h-10 text-gray-200" />
                                            </div>
                                            <h3 className="text-gray-900 font-extrabold text-xl tracking-tight mb-2">No se encontraron contactos</h3>
                                            <p className="text-gray-400 font-medium max-w-sm">
                                                No hay resultados para tu búsqueda actual. Prueba con otros términos.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ProspectDetailsModal
                isOpen={!!selectedProspectId}
                onClose={handleCloseModal}
                prospectData={modalData}
                isLoading={isLoadingDetails}
            />
        </>
    );
}
