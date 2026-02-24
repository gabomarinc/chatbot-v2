"use client";

import { useState } from 'react';
import { Plus, Trash2, Edit2, Save, Loader2, X, Database, Info } from 'lucide-react';
import { toast } from 'sonner';
import { createCustomField, deleteCustomField } from '@/lib/actions/custom-fields';
import { CustomFieldDefinition, CustomFieldType } from '@prisma/client';
import { cn } from '@/lib/utils';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface FieldsManagerProps {
    agentId: string;
    initialFields: CustomFieldDefinition[];
}

/* ─── Type badge map ─────────────────────────────────────────────────────── */
const TYPE_MAP: Record<string, { label: string; color: string; bg: string }> = {
    TEXT: { label: 'Texto', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
    NUMBER: { label: 'Número', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
    BOOLEAN: { label: 'Sí / No', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    DATE: { label: 'Fecha', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
    SELECT: { label: 'Selección', color: 'text-[#21AC96]', bg: 'bg-[#21AC96]/8 border-[#21AC96]/20' },
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
export function FieldsManager({ agentId, initialFields }: FieldsManagerProps) {
    const [fields, setFields] = useState<CustomFieldDefinition[]>(initialFields);
    const [isCreating, setIsCreating] = useState(false);
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        key: '',
        label: '',
        type: 'TEXT' as CustomFieldType,
        description: '',
        options: [] as string[]
    });
    const [newOption, setNewOption] = useState('');

    const resetForm = () => {
        setFormData({ key: '', label: '', type: 'TEXT', description: '', options: [] });
        setNewOption('');
        setIsCreating(false);
        setEditingFieldId(null);
    };

    const startEditing = (field: CustomFieldDefinition) => {
        setFormData({
            key: field.key,
            label: field.label,
            type: field.type,
            description: field.description || '',
            options: (field.options as string[]) || []
        });
        setEditingFieldId(field.id);
        setIsCreating(true);
    };

    const handleAddOption = () => {
        if (!newOption.trim() || formData.options.includes(newOption.trim())) return;
        setFormData({ ...formData, options: [...formData.options, newOption.trim()] });
        setNewOption('');
    };

    const removeOption = (idx: number) => {
        const opts = [...formData.options];
        opts.splice(idx, 1);
        setFormData({ ...formData, options: opts });
    };

    const handleSave = async () => {
        if (!formData.label || !formData.key) {
            toast.error("Etiqueta y Key son obligatorios");
            return;
        }
        setIsLoading(true);
        try {
            if (editingFieldId) {
                const { updateCustomField } = await import('@/lib/actions/custom-fields');
                const result = await updateCustomField(editingFieldId, { agentId, ...formData });
                if (result.error) toast.error(result.error);
                else if (result.field) {
                    toast.success("Campo actualizado");
                    setFields(fields.map(f => f.id === editingFieldId ? result.field as CustomFieldDefinition : f));
                    resetForm();
                }
            } else {
                const result = await createCustomField({ agentId, ...formData });
                if (result.error) toast.error(result.error);
                else if (result.field) {
                    toast.success("Campo creado exitosamente");
                    setFields([...fields, result.field]);
                    resetForm();
                }
            }
        } catch {
            toast.error("Error al guardar campo");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro? Los datos existentes no se borrarán, pero el campo dejará de estar disponible para el agente.")) return;
        try {
            const result = await deleteCustomField(id, agentId);
            if (result.error) toast.error(result.error);
            else { toast.success("Campo eliminado"); setFields(fields.filter(f => f.id !== id)); }
        } catch {
            toast.error("Error al eliminar");
        }
    };

    /* ── Empty state ──────────────────────────────────────────────────────── */
    if (fields.length === 0 && !isCreating) {
        return (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm py-24 px-6 flex flex-col items-center text-center">
                <div className="inline-flex items-center justify-center w-[72px] h-[72px] bg-[#21AC96]/10 rounded-[1.25rem] mb-6 text-[#21AC96]">
                    <Database className="w-9 h-9" />
                </div>
                <h3 className="text-[20px] font-black text-gray-900 mb-3">Campos Personalizados</h3>
                <p className="text-[13px] font-semibold text-gray-500 mb-2">¿Para qué sirven los campos?</p>
                <p className="text-[13px] text-gray-400 max-w-[480px] mb-6 leading-relaxed">
                    Los campos definen qué datos debe recolectar el agente durante las conversaciones — nombre, teléfono, presupuesto, zona de interés y cualquier dato personalizado de tu negocio.
                </p>
                <div className="text-[12px] bg-gray-50 px-5 py-4 rounded-2xl border border-gray-100 text-gray-500 max-w-[520px] mb-10">
                    <strong className="text-gray-700">Ejemplo:</strong> Si creas un campo &ldquo;Presupuesto&rdquo;, el agente le preguntará al usuario su rango de inversión y lo guardará en el perfil del contacto automáticamente.
                </div>
                <button
                    onClick={() => { resetForm(); setIsCreating(true); }}
                    className="flex items-center gap-2 px-8 py-3.5 bg-[#21AC96] text-white rounded-2xl hover:bg-[#1b8c7a] transition-all font-bold text-sm cursor-pointer shadow-lg shadow-[#21AC96]/20 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    Crear primer campo
                </button>
            </div>
        );
    }

    /* ── Main view ────────────────────────────────────────────────────────── */
    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[18px] font-black text-gray-900">Campos Personalizados</h2>
                    <p className="text-[13px] text-gray-400 mt-0.5">Define los datos que el agente debe recolectar de los usuarios</p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => { resetForm(); setIsCreating(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#21AC96] text-white rounded-2xl hover:bg-[#1b8c7a] transition-all font-bold text-sm cursor-pointer shadow-md shadow-[#21AC96]/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Campo
                    </button>
                )}
            </div>

            {/* ── Create / Edit Form ─────────────────────────────────────────── */}
            {isCreating && (
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                    {/* Form header */}
                    <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                        <div>
                            <h3 className="text-[16px] font-black text-gray-900">
                                {editingFieldId ? 'Editar Campo' : 'Nuevo Campo'}
                            </h3>
                            <p className="text-[12px] text-gray-400 mt-0.5">
                                {editingFieldId ? 'Modifica la configuración del campo' : 'Define un nuevo dato que el agente recolectará'}
                            </p>
                        </div>
                        <button onClick={resetForm} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form body */}
                    <div className="px-8 py-7 space-y-6">
                        {/* Label + Key */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                                    Etiqueta <span className="text-[#21AC96]">*</span>
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Ej: Presupuesto mensual"
                                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/30 focus:border-[#21AC96] transition-all"
                                    value={formData.label}
                                    onChange={e => {
                                        const label = e.target.value;
                                        if (!editingFieldId) {
                                            const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                            setFormData({ ...formData, label, key });
                                        } else {
                                            setFormData({ ...formData, label });
                                        }
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                                    Key del sistema <span className="text-[#21AC96]">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: monthly_budget"
                                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#21AC96]/30 focus:border-[#21AC96] transition-all disabled:text-gray-400 disabled:bg-gray-100/60 disabled:cursor-not-allowed"
                                    value={formData.key}
                                    onChange={e => setFormData({ ...formData, key: e.target.value })}
                                    disabled={!!editingFieldId}
                                />
                                {editingFieldId && (
                                    <p className="text-[11px] text-amber-500 font-medium flex items-center gap-1">
                                        <Info className="w-3 h-3" /> La key no se puede cambiar para proteger tus datos.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Type + Description */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Tipo de dato</label>
                                <select
                                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/30 focus:border-[#21AC96] transition-all appearance-none"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as CustomFieldType })}
                                >
                                    <option value="TEXT">Texto</option>
                                    <option value="NUMBER">Número</option>
                                    <option value="BOOLEAN">Sí / No (Booleano)</option>
                                    <option value="DATE">Fecha</option>
                                    <option value="SELECT">Selección (Dropdown)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Descripción del dato</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Rango de inversión mensual del cliente"
                                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/30 focus:border-[#21AC96] transition-all"
                                    value={formData.description.split(' Contexto: ')[0] || formData.description}
                                    onChange={e => {
                                        const when = formData.description.split(' Contexto: ')[1] || '';
                                        setFormData({ ...formData, description: `${e.target.value}${when ? ` Contexto: ${when}` : ''}` });
                                    }}
                                />
                            </div>
                        </div>

                        {/* Momento de recolección */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                                ¿Cuándo pedirlo? <span className="font-normal normal-case text-gray-400">(opcional)</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Solo preguntar si el usuario muestra interés en comprar..."
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/30 focus:border-[#21AC96] transition-all"
                                value={formData.description.split(' Contexto: ')[1] || ''}
                                onChange={e => {
                                    const what = formData.description.split(' Contexto: ')[0] || '';
                                    setFormData({ ...formData, description: `${what} Contexto: ${e.target.value}` });
                                }}
                            />
                            <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5" />
                                Le dice al agente el contexto exacto en que debe solicitar este dato.
                            </p>
                        </div>

                        {/* Options for SELECT */}
                        {formData.type === 'SELECT' && (
                            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-4">
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Opciones disponibles</label>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/30 focus:border-[#21AC96] transition-all"
                                        placeholder="Nueva opción (ej: Interesado)"
                                        value={newOption}
                                        onChange={e => setNewOption(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddOption}
                                        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#21AC96] text-white text-sm font-bold rounded-xl hover:bg-[#1b8c7a] transition-all active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Agregar
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {formData.options.length === 0 ? (
                                        <span className="text-[12px] text-gray-400 italic">Agrega al menos una opción.</span>
                                    ) : (
                                        formData.options.map((opt, idx) => (
                                            <span key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-700 shadow-sm">
                                                {opt}
                                                <button
                                                    onClick={() => removeOption(idx)}
                                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Form footer */}
                    <div className="px-8 py-5 border-t border-gray-50 flex items-center justify-end gap-3 bg-gray-50/40">
                        <button
                            onClick={resetForm}
                            className="px-5 py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading || !formData.label || !formData.key}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#21AC96] text-white rounded-2xl font-bold text-sm hover:bg-[#1b8c7a] transition-all shadow-md shadow-[#21AC96]/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {editingFieldId ? 'Guardar Cambios' : 'Crear Campo'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Fields List ─────────────────────────────────────────────────── */}
            {fields.length > 0 && (
                <div className="space-y-3">
                    {fields.map(field => {
                        const meta = TYPE_MAP[field.type] || TYPE_MAP['TEXT'];
                        return (
                            <div
                                key={field.id}
                                className="group bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-5 hover:border-[#21AC96]/30 hover:shadow-md transition-all flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Type badge */}
                                    <div className={cn(
                                        'px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest shrink-0',
                                        meta.bg, meta.color
                                    )}>
                                        {meta.label}
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="text-[15px] font-black text-gray-900 leading-none mb-1.5">{field.label}</h3>
                                        <div className="flex items-center flex-wrap gap-2 text-[11px]">
                                            <code className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg text-gray-500 font-mono">{field.key}</code>
                                            {field.description && (
                                                <>
                                                    <span className="text-gray-200">•</span>
                                                    <span className="text-gray-400 truncate max-w-[300px]">{field.description.split(' Contexto: ')[0]}</span>
                                                </>
                                            )}
                                            {field.type === 'SELECT' && field.options && (field.options as string[]).length > 0 && (
                                                <span className="bg-[#21AC96]/8 text-[#21AC96] border border-[#21AC96]/20 px-2 py-0.5 rounded-full font-bold">
                                                    {(field.options as string[]).length} opciones
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                        onClick={() => startEditing(field)}
                                        className="p-2 text-gray-400 hover:text-[#21AC96] hover:bg-[#21AC96]/5 rounded-xl transition-colors"
                                        title="Editar"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(field.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
