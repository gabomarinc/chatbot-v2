"use client";

import { useState } from 'react';
import { Plus, Trash2, Edit2, Save, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { createCustomField, deleteCustomField } from '@/lib/actions/custom-fields';
import { CustomFieldDefinition, CustomFieldType } from '@prisma/client';

interface FieldsManagerProps {
    agentId: string;
    initialFields: CustomFieldDefinition[];
}

export function FieldsManager({ agentId, initialFields }: FieldsManagerProps) {
    const [fields, setFields] = useState<CustomFieldDefinition[]>(initialFields);
    const [isCreating, setIsCreating] = useState(false);
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        key: '',
        label: '',
        type: 'TEXT' as CustomFieldType,
        description: '',
        options: [] as string[]
    });

    const [newOption, setNewOption] = useState('');

    const resetForm = () => {
        setFormData({
            key: '',
            label: '',
            type: 'TEXT',
            description: '',
            options: []
        });
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
            options: field.options || []
        });
        setEditingFieldId(field.id);
        setIsCreating(true); // Re-use the creation form UI
    };

    const handleAddOption = () => {
        if (!newOption.trim()) return;
        if (formData.options.includes(newOption.trim())) return;
        setFormData({ ...formData, options: [...formData.options, newOption.trim()] });
        setNewOption('');
    };

    const removeOption = (idx: number) => {
        const newOpts = [...formData.options];
        newOpts.splice(idx, 1);
        setFormData({ ...formData, options: newOpts });
    };

    const handleSave = async () => {
        if (!formData.label || !formData.key) {
            toast.error("Label and Key are required");
            return;
        }

        setIsLoading(true);
        try {
            if (editingFieldId) {
                // Update existing
                const { updateCustomField } = await import('@/lib/actions/custom-fields');
                const result = await updateCustomField(editingFieldId, {
                    agentId,
                    ...formData
                });

                if (result.error) {
                    toast.error(result.error);
                } else if (result.field) {
                    toast.success("Campo actualizado");
                    setFields(fields.map(f => f.id === editingFieldId ? result.field as CustomFieldDefinition : f));
                    resetForm();
                }
            } else {
                // Create new
                // Import dynamically or use existing import
                const result = await createCustomField({
                    agentId,
                    ...formData
                });

                if (result.error) {
                    toast.error(result.error);
                } else if (result.field) {
                    toast.success("Campo creado exitosamente");
                    setFields([...fields, result.field]);
                    resetForm();
                }
            }
        } catch (e) {
            toast.error("Error saving field");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro? Esto no borrará los datos existentes en los contactos, pero dejará de estar disponible para el agente.")) return;

        try {
            const result = await deleteCustomField(id, agentId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Campo eliminado");
                setFields(fields.filter(f => f.id !== id));
            }
        } catch (e) {
            toast.error("Error deleting field");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Campos Personalizados</h2>
                    <p className="text-gray-500 text-sm">Define los datos que el agente debe recolectar de los usuarios.</p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => { resetForm(); setIsCreating(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#21AC96] text-white rounded-xl font-bold text-sm hover:bg-[#1a8a78] transition-all shadow-lg shadow-[#21AC96]/20"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Campo
                    </button>
                )}
            </div>

            {/* Editor (Create/Edit) */}
            {isCreating && (
                <div className="bg-white p-6 rounded-2xl border border-[#21AC96]/20 shadow-lg shadow-[#21AC96]/5 space-y-4 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
                        <h3 className="font-bold text-gray-800">{editingFieldId ? 'Editar Campo' : 'Nuevo Campo'}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Etiqueta (Humano)</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Ej: Salario Mensual"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96]"
                                value={formData.label}
                                onChange={e => {
                                    const label = e.target.value;
                                    // Only auto-generate key if NOT editing and key is empty/auto-gen
                                    if (!editingFieldId) {
                                        const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                        setFormData({ ...formData, label, key });
                                    } else {
                                        setFormData({ ...formData, label });
                                    }
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Key (Sistema)</label>
                            <input
                                type="text"
                                placeholder="Ej: monthly_salary"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] font-mono text-sm disabled:bg-gray-100 disabled:text-gray-400"
                                value={formData.key}
                                onChange={e => setFormData({ ...formData, key: e.target.value })}
                                disabled={!!editingFieldId} // Disable key editing in edit mode safely
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Tipo de Dato</label>
                            <select
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96]"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as CustomFieldType })}
                            >
                                <option value="TEXT">Texto</option>
                                <option value="NUMBER">Número</option>
                                <option value="BOOLEAN">Booleano (Sí/No)</option>
                                <option value="DATE">Fecha</option>
                                <option value="SELECT">Selección (Dropdown)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Descripción del dato (¿Qué es?)</label>
                            <input
                                type="text"
                                placeholder="Ej: Salario mensual neto en euros..."
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] mb-3"
                                value={formData.description.split(' Contexto: ')[0] || formData.description}
                                onChange={e => {
                                    const currentWhen = formData.description.split(' Contexto: ')[1] || '';
                                    setFormData({ ...formData, description: `${e.target.value}${currentWhen ? ` Contexto: ${currentWhen}` : ''}` })
                                }}
                            />

                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Momento de recolección (¿Cuándo pedirlo?)</label>
                            <input
                                type="text"
                                placeholder="Ej: Solo preguntar si el usuario muestra interés..."
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96]"
                                value={formData.description.split(' Contexto: ')[1] || ''}
                                onChange={e => {
                                    const currentWhat = formData.description.split(' Contexto: ')[0] || '';
                                    setFormData({ ...formData, description: `${currentWhat} Contexto: ${e.target.value}` })
                                }}
                            />
                        </div>
                    </div>

                    {/* Options Editor for SELECT type */}
                    {formData.type === 'SELECT' && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Opciones Disponibles</label>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                                    placeholder="Nueva opción (ej: Interesado)"
                                    value={newOption}
                                    onChange={e => setNewOption(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddOption()}
                                />
                                <button onClick={handleAddOption} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {formData.options.map((opt, idx) => (
                                    <span key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                                        {opt}
                                        <button onClick={() => removeOption(idx)} className="text-gray-400 hover:text-red-500">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                                {formData.options.length === 0 && (
                                    <span className="text-xs text-gray-400 italic">No hay opciones definidas.</span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-[#21AC96] text-white rounded-xl font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {editingFieldId ? 'Guardar Cambios' : 'Crear Campo'}
                        </button>
                    </div>
                </div>
            )}

            {/* List of Fields */}
            <div className="grid gap-4">
                {fields.length === 0 && !isCreating && (
                    <div className="p-10 text-center bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                        <p className="text-gray-400 font-medium">No hay campos personalizados definidos aún.</p>
                    </div>
                )}

                {fields.map(field => (
                    <div key={field.id} className="group bg-white p-5 rounded-2xl border border-gray-100 hover:border-[#21AC96]/30 hover:shadow-lg hover:shadow-[#21AC96]/5 transition-all duration-300 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-mono text-xs font-bold border border-gray-100 uppercase">
                                {field.type.substring(0, 3)}
                            </div>
                            <div>
                                <h3 className="text-gray-900 font-bold">{field.label}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <code className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{field.key}</code>
                                    <span>•</span>
                                    <span>{field.description || 'Sin descripción'}</span>
                                    {field.type === 'SELECT' && field.options && (
                                        <span className="bg-[#21AC96]/10 text-[#21AC96] px-1.5 py-0.5 rounded ml-1 font-medium">
                                            {field.options.length} opciones
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => startEditing(field)}
                                className="p-2 text-gray-400 hover:text-[#21AC96] hover:bg-[#21AC96]/5 rounded-lg transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(field.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
