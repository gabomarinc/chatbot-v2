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
    agents: { id: string; name: string; avatarUrl?: string | null }[];
}

export function SegmentBuilder({ workspaceId, customFields, agents }: SegmentBuilderProps) {
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
        if (key === 'agentId') return 'Agente Asignado';

        const field = customFields.find(f => f.key === key);
        return field ? field.label : key;
    };

    const getAgentName = (id: string) => {
        const agent = agents.find(a => a.id === id);
        return agent ? agent.name : id;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Filter Builder Panel */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/20 backdrop-blur-sm bg-white/80">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#21AC96] to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                            <FilterIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Filtros</h2>
                            <p className="text-xs text-gray-500 font-medium">Define tu segmento objetivo</p>
                        </div>
                    </div>

                    {/* Active Filters */}
                    <div className="space-y-3 mb-6">
                        {filters.length === 0 && (
                            <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                                <FilterIcon className="w-8 h-8 text-gray-300 mx-auto mb-2 opacity-50" />
                                <p className="text-xs font-medium text-gray-400">No hay filtros activos</p>
                            </div>
                        )}
                        {filters.map((filter, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl flex items-center justify-between border border-gray-100 text-sm shadow-sm hover:shadow-md transition-all group">
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-gray-800 text-xs uppercase tracking-wide">{getFieldLabel(filter.field)}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 text-xs lowercase bg-gray-50 px-2 py-0.5 rounded-md">{filter.operator}</span>
                                        <span className="text-[#21AC96] font-bold">
                                            {filter.field === 'agentId' ? getAgentName(filter.value) : `"${filter.value}"`}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFilter(idx)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add Filter Form */}
                    <div className="space-y-4 pt-6 border-t border-gray-100">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Campo</label>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent hover:border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] text-sm transition-all appearance-none cursor-pointer font-medium text-gray-700"
                                    value={selectedField}
                                    onChange={e => {
                                        setSelectedField(e.target.value);
                                        // Reset operator and value when field changes
                                        if (e.target.value === 'agentId') {
                                            setSelectedOperator('equals');
                                        } else {
                                            setSelectedOperator('equals');
                                        }
                                        setFilterValue('');
                                    }}
                                >
                                    <option value="">Seleccionar campo...</option>
                                    <optgroup label="Campos Estándar">
                                        <option value="name">Nombre Completo</option>
                                        <option value="email">Email</option>
                                        <option value="phone">Teléfono</option>
                                        <option value="agentId">Agente Asignado</option>
                                    </optgroup>
                                    <optgroup label="Campos Personalizados">
                                        {customFields.map(field => (
                                            <option key={field.id} value={field.key}>{field.label}</option>
                                        ))}
                                    </optgroup>
                                </select>
                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
                            </div>
                        </div>

                        {selectedField && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Operador</label>
                                    <div className="relative">
                                        <select
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent hover:border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] text-sm transition-all appearance-none cursor-pointer font-medium text-gray-700"
                                            value={selectedOperator}
                                            onChange={e => setSelectedOperator(e.target.value as any)}
                                        >
                                            {selectedField === 'agentId' ? (
                                                <option value="equals">Es (Conversó con)</option>
                                            ) : (
                                                <>
                                                    <option value="equals">Es igual a</option>
                                                    <option value="contains">Contiene</option>
                                                    <option value="gt">Mayor que</option>
                                                    <option value="lt">Menor que</option>
                                                    <option value="isSet">Tiene valor (No está vacío)</option>
                                                    <option value="isNotSet">No tiene valor (Vacío)</option>
                                                </>
                                            )}
                                        </select>
                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
                                    </div>
                                </div>

                                {selectedOperator !== 'isSet' && selectedOperator !== 'isNotSet' && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Valor</label>
                                        {selectedField === 'agentId' ? (
                                            <div className="relative">
                                                <select
                                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent hover:border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] text-sm transition-all appearance-none cursor-pointer font-medium text-gray-700"
                                                    value={filterValue}
                                                    onChange={e => setFilterValue(e.target.value)}
                                                >
                                                    <option value="">Seleccionar Agente...</option>
                                                    {agents.map(agent => (
                                                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-gray-50 border border-transparent hover:border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] text-sm transition-all font-medium text-gray-700 placeholder:text-gray-300"
                                                placeholder="Escribe el valor..."
                                                value={filterValue}
                                                onChange={e => setFilterValue(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddFilter()}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleAddFilter}
                            disabled={!selectedField || (!filterValue && selectedOperator !== 'isSet' && selectedOperator !== 'isNotSet')}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 hover:border-gray-200 hover:text-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 group"
                        >
                            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            Agregar Filtro
                        </button>
                    </div>

                    <div className="pt-6 mt-6 border-t border-gray-100">
                        <button
                            onClick={runQuery}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#21AC96] to-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                            Ejecutar Segmentación
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-8">
                <div className="bg-white rounded-3xl min-h-[600px] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col backdrop-blur-sm bg-white/80">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Resultados</h2>
                                <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">
                                    {hasSearched ? `${totalResults} contactos encontrados` : 'Esperando búsqueda...'}
                                </p>
                            </div>
                        </div>

                        {hasSearched && totalResults > 0 && (
                            <button className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-gray-800 hover:-translate-y-0.5 transition-all">
                                <Save className="w-4 h-4" />
                                Guardar Segmento
                            </button>
                        )}
                    </div>

                    <div className="flex-1 p-0 overflow-hidden relative">
                        {!hasSearched && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-10 animate-fade-in">
                                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                    <Search className="w-10 h-10 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Comienza a filtrar</h3>
                                <p className="font-medium text-gray-500 max-w-xs text-center">Define los filtros en el panel izquierdo y ejecuta la búsqueda para ver resultados.</p>
                            </div>
                        )}

                        {hasSearched && results.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-10 animate-fade-in">
                                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                    <Users className="w-10 h-10 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Sin resultados</h3>
                                <p className="font-medium text-gray-500 max-w-xs text-center">No se encontraron contactos que coincidan con los filtros seleccionados.</p>
                            </div>
                        )}

                        {hasSearched && results.length > 0 && (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50/50 text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                                            <tr>
                                                <th className="px-8 py-5">Nombre</th>
                                                <th className="px-6 py-5">Email / Teléfono</th>
                                                {customFields.slice(0, 3).map(f => ( // Show first 3 custom fields
                                                    <th key={f.id} className="px-6 py-5">{f.label}</th>
                                                ))}
                                                <th className="px-6 py-5">Contactado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {results.map((contact, idx) => (
                                                <tr
                                                    key={contact.id}
                                                    className="group hover:bg-indigo-50/30 transition-colors cursor-pointer"
                                                    onClick={() => setSelectedContact(contact)}
                                                    style={{ animationDelay: `${idx * 0.05}s` }}
                                                >
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-200">
                                                                {(contact.name?.[0] || contact.id[0] || 'U').toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900">{contact.name || 'Sin Nombre'}</div>
                                                                <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-[100px] bg-gray-100 px-1.5 py-0.5 rounded-md inline-block">{contact.id.slice(-6)}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        {contact.email && <div className="text-sm font-medium text-gray-700">{contact.email}</div>}
                                                        {contact.phone && <div className="text-xs text-gray-500 font-mono mt-0.5">{contact.phone}</div>}
                                                    </td>
                                                    {customFields.slice(0, 3).map(f => (
                                                        <td key={f.id} className="px-6 py-5">
                                                            {contact.customData?.[f.key] ? (
                                                                <span className="px-2.5 py-1.5 bg-[#21AC96]/10 text-[#21AC96] rounded-lg text-xs font-bold inline-block border border-[#21AC96]/20">
                                                                    {String(contact.customData[f.key])}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-300">-</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="px-6 py-5 text-xs text-gray-500 font-medium">
                                                        {format(new Date(contact.createdAt), "d MMM yyyy", { locale: es })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                                    <p className="text-xs font-medium text-gray-500">
                                        Mostrando <span className="text-gray-900 font-bold">{results.length}</span> de <span className="text-gray-900 font-bold">{totalResults}</span> resultados
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                            disabled={page === 1}
                                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                                        >
                                            Anterior
                                        </button>
                                        <span className="text-xs font-bold text-gray-900 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm min-w-[80px] text-center">
                                            Página {page}
                                        </span>
                                        <button
                                            onClick={() => setPage(prev => prev + 1)}
                                            disabled={results.length < pageSize}
                                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
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
