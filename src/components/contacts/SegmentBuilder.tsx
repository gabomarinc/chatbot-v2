"use client";

import { useState, useEffect } from 'react';
import { Filter as FilterIcon, Search, Users, Plus, X, ChevronRight, Save, Play, Loader2, UserCircle, Phone, Download, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomFieldDefinition } from '@prisma/client';
import { toast } from 'sonner';
import { getContacts, FilterCondition } from '@/lib/actions/contacts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { ContactSheet } from './ContactSheet';
import { CampaignWizard } from './CampaignWizard';

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
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
    const [isCampaignWizardOpen, setIsCampaignWizardOpen] = useState(false);

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

    const handleExport = async () => {
        setIsLoading(true);
        try {
            const res = await getContacts({
                workspaceId,
                filters: filters,
                page: 1,
                pageSize: 5000
            });

            if (res.success === false) {
                toast.error(res.error || "Error exportando contactos");
                return;
            }

            const contacts = res.contacts;
            if (contacts.length === 0) {
                toast.error("No hay contactos para exportar");
                return;
            }

            const headers = ['Nombre', 'Email', 'Telefono', 'Agente', 'Interacciones', 'Etiquetas', 'Fecha Captacion', 'ID Interno'];
            const relevantFields = customFields.filter(f =>
                contacts.some(c => (c.customData as any)?.[f.key] !== undefined)
            );
            headers.push(...relevantFields.map(f => f.label));

            const csvRows = [headers.join(',')];

            contacts.forEach(c => {
                const lastAgent = (c as any).conversations?.[0]?.agent?.name || 'N/A';
                const interactions = c._count?.conversations || 0;
                const tags = (c.tags || []).join(', ');

                const row = [
                    `"${(c.name || '').replace(/"/g, '""')}"`,
                    c.email || '',
                    c.phone || '',
                    `"${lastAgent.replace(/"/g, '""')}"`,
                    interactions,
                    `"${tags.replace(/"/g, '""')}"`,
                    format(new Date(c.createdAt), 'yyyy-MM-dd HH:mm'),
                    c.id
                ];

                relevantFields.forEach(f => {
                    const value = (c.customData as any)?.[f.key] ?? '';
                    row.push(`"${String(value).replace(/"/g, '""')}"`);
                });

                csvRows.push(row.join(','));
            });

            const csvContent = "\uFEFF" + csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `segmento_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success(`${contacts.length} contactos exportados correctamente`);
        } catch (error: any) {
            console.error("Export error:", error);
            toast.error("Error al generar el archivo");
        } finally {
            setIsLoading(false);
        }
    };

    const runQuery = async () => {
        setIsLoading(true);

        // AUTO-ADD DRAFT: If the user has a field selected but forgot to click 'Add', add it for them
        let currentFilters = [...filters];
        if (selectedField && (filterValue || selectedOperator === 'isSet' || selectedOperator === 'isNotSet')) {
            const draftFilter: FilterCondition = {
                field: selectedField,
                operator: selectedOperator,
                value: filterValue
            };

            const exists = filters.some(f => f.field === draftFilter.field && f.operator === draftFilter.operator && f.value === draftFilter.value);
            if (!exists) {
                currentFilters = [...filters, draftFilter];
                setFilters(currentFilters);
                setFilterValue('');
                setSelectedField('');
            }
        }

        try {
            const res = await getContacts({
                workspaceId,
                filters: currentFilters,
                page: page,
                pageSize: pageSize
            });
            if (res.success === false) {
                toast.error(res.error || "Error running query");
                return;
            }
            setResults(res.contacts);
            setTotalResults(res.total);
            setHasSearched(true);
        } catch (error: any) {
            console.error("Filter error:", error);
            toast.error(error.message || "Error running query");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasSearched) {
            runQuery();
        }
    }, [page]);

    const getFieldLabel = (key: string) => {
        if (key === 'name') return 'Nombre Completo';
        if (key === 'email') return 'Email';
        if (key === 'phone') return 'Teléfono';
        if (key === 'agentId') return 'Agente Asignado';

        const field = customFields.find(f => f.key === key);
        return field ? field.label : key;
    };

    const activeAgentFilter = filters.find(f => f.field === 'agentId' && f.operator === 'equals');
    const activeAgentId = activeAgentFilter ? activeAgentFilter.value : null;

    const availableCustomFields = activeAgentId
        ? customFields.filter(f => f.agentId === activeAgentId)
        : Array.from(new Map(customFields.map(f => [f.key, f])).values());

    const toggleSelectAll = () => {
        if (selectedContactIds.size === results.length) {
            setSelectedContactIds(new Set());
        } else {
            setSelectedContactIds(new Set(results.map(c => c.id)));
        }
    };

    const toggleSelectContact = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSet = new Set(selectedContactIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedContactIds(newSet);
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

                    {/* Dedicated Agent Filter */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Filtrar por Agente</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => {
                                    const newFilters = filters.filter(f => f.field !== 'agentId');
                                    setFilters(newFilters);
                                }}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${!filters.find(f => f.field === 'agentId')
                                    ? 'bg-[#21AC96] text-white border-[#21AC96] shadow-lg shadow-[#21AC96]/20'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                Todos
                            </button>
                            {agents.map(agent => {
                                const isActive = filters.some(f => f.field === 'agentId' && f.value === agent.id);
                                return (
                                    <button
                                        key={agent.id}
                                        onClick={() => {
                                            const newFilters = filters.filter(f => f.field !== 'agentId');
                                            newFilters.push({ field: 'agentId', operator: 'equals', value: agent.id });
                                            setFilters(newFilters);
                                            setPage(1);
                                        }}
                                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${isActive
                                            ? 'bg-[#21AC96] text-white border-[#21AC96] shadow-lg shadow-[#21AC96]/20'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {agent.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Active Filters (Generic) */}
                    <div className="space-y-3 mb-6">
                        {filters.filter(f => f.field !== 'agentId').length === 0 && !selectedField && (
                            <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                                <FilterIcon className="w-8 h-8 text-gray-300 mx-auto mb-2 opacity-50" />
                                <p className="text-xs font-medium text-gray-400">No hay otros filtros activos</p>
                            </div>
                        )}

                        {/* Draft Filter Visualization */}
                        {selectedField && (
                            <div className="bg-[#21AC96]/5 p-4 rounded-xl flex items-center justify-between border-2 border-dashed border-[#21AC96]/20 text-sm animate-pulse">
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-[#21AC96] text-xs uppercase tracking-wide flex items-center gap-2">
                                        <Plus className="w-3 h-3" /> Pendiente: {getFieldLabel(selectedField)}
                                    </span>
                                    <div className="flex items-center gap-2 opacity-60">
                                        <span className="text-gray-400 text-xs lowercase">
                                            {selectedOperator === 'equals' && 'Es igual a'}
                                            {selectedOperator === 'contains' && 'Contiene'}
                                            {selectedOperator === 'gt' && 'Mayor que'}
                                            {selectedOperator === 'lt' && 'Menor que'}
                                            {selectedOperator === 'isSet' && 'Tiene valor'}
                                            {selectedOperator === 'isNotSet' && 'Vacío'}
                                        </span>
                                        {selectedOperator !== 'isSet' && selectedOperator !== 'isNotSet' && filterValue && (
                                            <span className="text-[#21AC96] font-bold">
                                                {`"${filterValue}"`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-[10px] font-black text-[#21AC96] uppercase bg-white px-2 py-1 rounded-lg border border-[#21AC96]/10">
                                    Borrador
                                </div>
                            </div>
                        )}

                        {filters.filter(f => f.field !== 'agentId').map((filter, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl flex items-center justify-between border border-gray-100 text-sm shadow-sm hover:shadow-md transition-all group">
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-gray-800 text-xs uppercase tracking-wide">{getFieldLabel(filter.field)}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 text-xs lowercase bg-gray-50 px-2 py-0.5 rounded-md">
                                            {filter.operator === 'equals' && 'Es igual a'}
                                            {filter.operator === 'contains' && 'Contiene'}
                                            {filter.operator === 'gt' && 'Mayor que'}
                                            {filter.operator === 'lt' && 'Menor que'}
                                            {filter.operator === 'isSet' && 'Tiene valor'}
                                            {filter.operator === 'isNotSet' && 'Vacío'}
                                        </span>
                                        {filter.operator !== 'isSet' && filter.operator !== 'isNotSet' && (
                                            <span className="text-[#21AC96] font-bold">
                                                {`"${filter.value}"`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const realIdx = filters.indexOf(filter);
                                        removeFilter(realIdx);
                                    }}
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
                                        setSelectedOperator('equals');
                                        setFilterValue('');
                                    }}
                                >
                                    <option value="">Seleccionar campo...</option>
                                    <optgroup label="Campos Estándar">
                                        <option value="name">Nombre Completo</option>
                                        <option value="email">Email</option>
                                        <option value="phone">Teléfono</option>
                                    </optgroup>
                                    <optgroup label="Campos Personalizados">
                                        {availableCustomFields.map(field => (
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
                            className={cn(
                                "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all mt-4 group",
                                selectedField && (filterValue || selectedOperator === 'isSet' || selectedOperator === 'isNotSet')
                                    ? "bg-[#21AC96] text-white shadow-lg shadow-[#21AC96]/20 hover:bg-[#1E9A86] hover:-translate-y-0.5 animate-in fade-in"
                                    : "bg-white border-2 border-gray-100 text-gray-400 hover:border-gray-200"
                            )}
                        >
                            <Plus className={cn("w-5 h-5 transition-transform", selectedField && "group-hover:rotate-90")} />
                            {selectedField ? 'Confirmar Filtro' : 'Agregar Filtro'}
                        </button>
                    </div>

                    <div className="pt-6 mt-6 border-t border-gray-100">
                        <button
                            onClick={runQuery}
                            disabled={isLoading}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:translate-y-0",
                                selectedField
                                    ? "bg-amber-500 text-white shadow-xl shadow-amber-500/20 hover:bg-amber-600"
                                    : "bg-gradient-to-r from-[#21AC96] to-emerald-600 text-white shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-0.5"
                            )}
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {selectedField ? <Plus className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                                    <span>{selectedField ? 'Sumar y Ejecutar' : 'Ejecutar Segmentación'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-8">
                <div className="bg-white rounded-3xl min-h-[600px] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col backdrop-blur-sm bg-white/80">
                    <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 shrink-0">
                                <Users className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-bold text-gray-900 truncate">Resultados</h2>
                                <p className="text-xs text-gray-500 font-medium tracking-wide uppercase truncate">
                                    {hasSearched ? `${totalResults} contactos encontrados` : 'Esperando búsqueda...'}
                                </p>
                            </div>
                        </div>

                        {hasSearched && totalResults > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={handleExport}
                                    disabled={isLoading}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-100 text-gray-700 rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:border-gray-200 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-[#21AC96]" />}
                                    <span className="whitespace-nowrap">Exportar Excel</span>
                                </button>
                                <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-gray-800 transition-all">
                                    <Save className="w-4 h-4" />
                                    <span className="whitespace-nowrap">Guardar Segmento</span>
                                </button>
                            </div>
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
                                                <th className="px-6 py-5 w-10">
                                                    <div className="flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={results.length > 0 && selectedContactIds.size === results.length}
                                                            onChange={toggleSelectAll}
                                                            className="w-4 h-4 rounded border-gray-300 text-[#21AC96] focus:ring-[#21AC96]/20 transition-all cursor-pointer"
                                                        />
                                                    </div>
                                                </th>
                                                <th className="px-4 py-5 font-black">Nombre</th>
                                                <th className="px-6 py-5 font-black">Email / Teléfono</th>
                                                <th className="px-6 py-5 font-black">Agente</th>
                                                <th className="px-6 py-5 text-center font-black">Interacciones</th>
                                                <th className="px-6 py-5 font-black">Contactado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {results.map((contact, idx) => (
                                                <tr
                                                    key={contact.id}
                                                    className={cn(
                                                        "group transition-all cursor-pointer",
                                                        selectedContactIds.has(contact.id)
                                                            ? "bg-[#21AC96]/5 hover:bg-[#21AC96]/10"
                                                            : "hover:bg-indigo-50/30"
                                                    )}
                                                    onClick={() => setSelectedContact(contact)}
                                                >
                                                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedContactIds.has(contact.id)}
                                                                onChange={(e) => toggleSelectContact(contact.id, e as any)}
                                                                className="w-4 h-4 rounded border-gray-300 text-[#21AC96] focus:ring-[#21AC96]/20 transition-all cursor-pointer"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 transition-transform group-hover:scale-110",
                                                                selectedContactIds.has(contact.id)
                                                                    ? "bg-[#21AC96] text-white"
                                                                    : "bg-[#21AC96]/5 text-[#21AC96]"
                                                            )}>
                                                                <UserCircle className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <div className="font-extrabold text-gray-900 tracking-tight truncate">{contact.name || 'Sin Nombre'}</div>
                                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold mt-0.5">
                                                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded-md font-mono">
                                                                        #{contact.id.slice(-6)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        {contact.email && <div className="text-[13px] font-bold text-gray-700 truncate max-w-[150px]">{contact.email}</div>}
                                                        {contact.phone && <div className="text-[11px] text-gray-400 font-mono mt-0.5">{contact.phone}</div>}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-black uppercase tracking-tighter whitespace-nowrap">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                                                            {contact.conversations?.[0]?.agent?.name || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className="text-sm font-black text-gray-900">{contact._count?.conversations || 0}</span>
                                                    </td>
                                                    <td className="px-6 py-5 text-[11px] text-gray-400 font-bold uppercase tracking-tighter">
                                                        {format(new Date(contact.createdAt), "d MMM yyyy", { locale: es })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/30">
                                    <p className="text-xs font-medium text-gray-500 order-2 sm:order-1">
                                        Mostrando <span className="text-gray-900 font-bold">{results.length}</span> de <span className="text-gray-900 font-bold">{totalResults}</span> resultados
                                    </p>
                                    <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
                                        <button
                                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                            disabled={page === 1}
                                            className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                                        >
                                            Ant.
                                        </button>
                                        <span className="text-xs font-bold text-gray-900 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm min-w-[80px] text-center">
                                            {page}
                                        </span>
                                        <button
                                            onClick={() => setPage(prev => prev + 1)}
                                            disabled={results.length < pageSize}
                                            className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                                        >
                                            Sig.
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedContactIds.size > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-500">
                    <div className="bg-gray-900 text-white rounded-[2rem] px-8 py-5 flex items-center gap-10 shadow-2xl shadow-indigo-500/30 border border-white/10 backdrop-blur-xl">
                        <div className="flex items-center gap-4 border-r border-white/10 pr-10">
                            <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center font-black text-sm">
                                {selectedContactIds.size}
                            </div>
                            <div>
                                <p className="text-sm font-bold">Contactos seleccionados</p>
                                <button
                                    onClick={() => setSelectedContactIds(new Set())}
                                    className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    Deshacer selección
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsCampaignWizardOpen(true)}
                                className="px-6 py-3 bg-[#21AC96] hover:bg-[#1E9A86] text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-[#21AC96]/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Crear Campaña
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Campaign Wizard */}
            <CampaignWizard
                isOpen={isCampaignWizardOpen}
                onClose={() => setIsCampaignWizardOpen(false)}
                selectedContactIds={Array.from(selectedContactIds)}
                workspaceId={workspaceId}
            />

            {/* Contact Details Sheet */}
            <ContactSheet
                contactId={selectedContact?.id || null}
                initialData={selectedContact}
                isOpen={!!selectedContact}
                onClose={() => setSelectedContact(null)}
                customFields={customFields}
                workspaceId={workspaceId}
                onUpdate={runQuery}
            />
        </div >
    );
}
