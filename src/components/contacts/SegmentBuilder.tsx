"use client";

import { useState, useEffect } from 'react';
import { Filter as FilterIcon, Search, Users, Plus, X, ChevronRight, Save, Play, Loader2 } from 'lucide-react';
import { CustomFieldDefinition } from '@prisma/client';
import { toast } from 'sonner';
import { getContacts, FilterCondition } from '@/lib/actions/contacts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { ContactSheet } from './ContactSheet';

interface SegmentBuilderProps {
    workspaceId: string;
    customFields: CustomFieldDefinition[];
}

export function SegmentBuilder({ workspaceId, customFields }: SegmentBuilderProps) {
    const [filters, setFilters] = useState<FilterCondition[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [totalResults, setTotalResults] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedContact, setSelectedContact] = useState<any>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const pageSize = 15;

    // Filter building state
    const [selectedField, setSelectedField] = useState('');
    const [selectedOperator, setSelectedOperator] = useState<FilterCondition['operator']>('equals');
    const [filterValue, setFilterValue] = useState('');

    const handleAddFilter = () => {
        if (!selectedField) return;
        if (!filterValue && selectedOperator !== 'isSet' && selectedOperator !== 'isNotSet') return;

        const newFilter: FilterCondition = {
            field: selectedField,
            operator: selectedOperator,
            value: filterValue
        };

        setFilters([...filters, newFilter]);
        setFilterValue('');
        setSelectedField('');
        // Reset page when filter changes
        setPage(1);
    };

    const removeFilter = (index: number) => {
        const newFilters = [...filters];
        newFilters.splice(index, 1);
        setFilters(newFilters);
        setPage(1);
    };

    const runQuery = async () => {
        setIsLoading(true);
        try {
            const res = await getContacts({
                workspaceId,
                filters: filters,
                page: page,
                pageSize: pageSize
            });
            setResults(res.contacts);
            setTotalResults(res.total);
            setHasSearched(true);
        } catch (error) {
            toast.error("Error running query");
        } finally {
            setIsLoading(false);
        }
    };

    // Re-run query when page changes (only if already searched)
    useEffect(() => {
        if (hasSearched) {
            runQuery();
        }
    }, [page]);

    // Reset page when filters change (handled in add/remove but good to be safe if other triggers exist)
    // Actually better not to auto-run on filter change until user clicks 'Execute', but we should reset page UI.

    const getFieldLabel = (key: string) => {
        if (key === 'name') return 'Nombre Completo';
        if (key === 'email') return 'Email';
        if (key === 'phone') return 'Teléfono';

        const field = customFields.find(f => f.key === key);
        return field ? field.label : key;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Filter Builder Panel */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-[#21AC96]/10 rounded-xl flex items-center justify-center text-[#21AC96]">
                            <FilterIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Filtros</h2>
                            <p className="text-xs text-gray-500 font-medium">Define tu segmento objetivo</p>
                        </div>
                    </div>

                    {/* Active Filters */}
                    <div className="space-y-3 mb-6">
                        {filters.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                                <p className="text-xs text-gray-400">No hay filtros activos</p>
                            </div>
                        )}
                        {filters.map((filter, idx) => (
                            <div key={idx} className="bg-gray-50 p-3 rounded-xl flex items-center justify-between border border-gray-100 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-700">{getFieldLabel(filter.field)}</span>
                                    <span className="text-gray-400 text-xs uppercase font-bold">{filter.operator}</span>
                                    <span className="text-[#21AC96] font-bold">"{filter.value}"</span>
                                </div>
                                <button onClick={() => removeFilter(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add Filter Form */}
                    <div className="space-y-3 pt-6 border-t border-gray-100">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Campo</label>
                            <select
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] text-sm"
                                value={selectedField}
                                onChange={e => setSelectedField(e.target.value)}
                            >
                                <option value="">Seleccionar campo...</option>
                                <optgroup label="Campos Estándar">
                                    <option value="name">Nombre Completo</option>
                                    <option value="email">Email</option>
                                    <option value="phone">Teléfono</option>
                                </optgroup>
                                <optgroup label="Campos Personalizados">
                                    {customFields.map(field => (
                                        <option key={field.id} value={field.key}>{field.label}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        {selectedField && (
                            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Operador</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] text-sm"
                                        value={selectedOperator}
                                        onChange={e => setSelectedOperator(e.target.value as any)}
                                    >
                                        <option value="equals">Es igual a</option>
                                        <option value="contains">Contiene</option>
                                        <option value="gt">Mayor que</option>
                                        <option value="lt">Menor que</option>
                                        <option value="isSet">Tiene valor (No está vacío)</option>
                                        <option value="isNotSet">No tiene valor (Vacío)</option>
                                    </select>
                                </div>
                                {selectedOperator !== 'isSet' && selectedOperator !== 'isNotSet' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Valor</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] text-sm"
                                            placeholder="Valor..."
                                            value={filterValue}
                                            onChange={e => setFilterValue(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddFilter()}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleAddFilter}
                            disabled={!selectedField || !filterValue}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            <Plus className="w-4 h-4" />
                            Agregar Filtro
                        </button>
                    </div>

                    <div className="pt-6 mt-6 border-t border-gray-100">
                        <button
                            onClick={runQuery}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-[#21AC96] text-white rounded-xl font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                            Ejecutar Segmentación
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-8">
                <div className="bg-white rounded-3xl min-h-[600px] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Resultados</h2>
                                <p className="text-xs text-gray-500 font-medium">
                                    {hasSearched ? `${totalResults} contactos encontrados` : 'Esperando búsqueda...'}
                                </p>
                            </div>
                        </div>

                        {hasSearched && totalResults > 0 && (
                            <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-gray-800 transition-all">
                                <Save className="w-4 h-4" />
                                Guardar Segmento
                            </button>
                        )}
                    </div>

                    <div className="flex-1 p-0 overflow-hidden">
                        {!hasSearched && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-10">
                                <Search className="w-16 h-16 mb-4 opacity-20" />
                                <p className="font-medium">Define los filtros y ejecuta la búsqueda</p>
                            </div>
                        )}

                        {hasSearched && results.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-10">
                                <Users className="w-16 h-16 mb-4 opacity-20" />
                                <p className="font-medium">No se encontraron contactos que coincidan con los filtros.</p>
                            </div>
                        )}

                        {hasSearched && results.length > 0 && (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4">Nombre</th>
                                                <th className="px-6 py-4">Email / Teléfono</th>
                                                {customFields.slice(0, 3).map(f => ( // Show first 3 custom fields
                                                    <th key={f.id} className="px-6 py-4">{f.label}</th>
                                                ))}
                                                <th className="px-6 py-4">Contactado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {results.map((contact) => (
                                                <tr
                                                    key={contact.id}
                                                    className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                                                    onClick={() => setSelectedContact(contact)}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900">{contact.name || 'Sin Nombre'}</div>
                                                        <div className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-[150px]">{contact.id}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {contact.email && <div className="text-sm text-gray-600">{contact.email}</div>}
                                                        {contact.phone && <div className="text-sm text-gray-500 font-mono">{contact.phone}</div>}
                                                    </td>
                                                    {customFields.slice(0, 3).map(f => (
                                                        <td key={f.id} className="px-6 py-4">
                                                            {contact.customData?.[f.key] ? (
                                                                <span className="px-2 py-1 bg-[#21AC96]/10 text-[#21AC96] rounded-lg text-xs font-bold">
                                                                    {String(contact.customData[f.key])}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-300">-</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="px-6 py-4 text-xs text-gray-500">
                                                        {format(new Date(contact.createdAt), "d MMM yyyy", { locale: es })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                                    <p className="text-xs text-gray-500">
                                        Mostrando {results.length} de {totalResults} resultados
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                            disabled={page === 1}
                                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                        >
                                            Anterior
                                        </button>
                                        <span className="text-xs font-bold text-gray-700 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                            Página {page}
                                        </span>
                                        <button
                                            onClick={() => setPage(prev => prev + 1)}
                                            disabled={results.length < pageSize}
                                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Contact Details Sheet */}
            <ContactSheet
                contactId={selectedContact?.id || null}
                initialData={selectedContact}
                isOpen={!!selectedContact}
                onClose={() => setSelectedContact(null)}
                customFields={customFields}
                workspaceId={workspaceId}
                onUpdate={runQuery} // Refresh query results on update
            />
        </div >
    );
}
