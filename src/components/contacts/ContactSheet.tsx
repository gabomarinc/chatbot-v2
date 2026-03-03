"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { useState, useEffect } from 'react';
import { CustomFieldDefinition } from '@prisma/client';
import { updateContact } from '@/lib/actions/contacts';
import { toast } from 'sonner';
import { Loader2, Save, User, Mail, Phone, Calendar, Hash, AlignLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ContactSheetProps {
    contactId: string | null;
    isOpen: boolean;
    onClose: () => void;
    // We pass the full contact object if available to avoid refetching immediately, 
    // or we could fetch inside. For simplicity, let's pass data.
    initialData: any;
    customFields: CustomFieldDefinition[];
    workspaceId: string;
    onUpdate?: () => void;
}

export function ContactSheet({ contactId, isOpen, onClose, initialData, customFields, workspaceId, onUpdate }: ContactSheetProps) {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData.customData || {});
        }
    }, [initialData]);

    const handleSave = async () => {
        if (!contactId) return;
        setIsLoading(true);
        try {
            const result = await updateContact(contactId, formData, workspaceId);
            if (result.success) {
                toast.success("Contacto actualizado");
                if (onUpdate) onUpdate();
                onClose();
            } else {
                toast.error(result.error);
            }
        } catch (e) {
            toast.error("Error al actualizar");
        } finally {
            setIsLoading(false);
        }
    };

    if (!initialData) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Detalles del Contacto</SheetTitle>
                    <SheetDescription>
                        Información recolectada del contacto.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Basic Info (Read Only for now) */}
                    <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-100 text-gray-400">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{initialData.name || 'Sin Nombre'}</h3>
                                <p className="text-xs text-gray-500 font-mono">{initialData.id}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                            {initialData.email && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail className="w-3.5 h-3.5" />
                                    <span className="truncate">{initialData.email}</span>
                                </div>
                            )}
                            {initialData.phone && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>{initialData.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {(() => {
                        const agentId = initialData.conversations?.[0]?.agent?.id;
                        const relevantFields = customFields.filter(f =>
                            f.agentId === agentId
                        );

                        return (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <AlignLeft className="w-4 h-4" />
                                    Campos Personalizados
                                </h3>

                                {relevantFields.length === 0 && (
                                    <p className="text-sm text-gray-500 italic">No hay campos personalizados definidos.</p>
                                )}

                                <div className="grid gap-4">
                                    {relevantFields.map(field => (
                                        <div key={field.id} className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                                {field.label}
                                                <span className="bg-gray-100 text-gray-400 text-[10px] px-1.5 rounded font-mono uppercase">{field.type}</span>
                                            </label>

                                            {field.type === 'TEXT' && (
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96]"
                                                    value={formData[field.key] || ''}
                                                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                                    placeholder={`Ingresa ${field.label.toLowerCase()}...`}
                                                />
                                            )}

                                            {field.type === 'NUMBER' && (
                                                <div className="relative">
                                                    <Hash className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                                                    <input
                                                        type="number"
                                                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96]"
                                                        value={formData[field.key] || ''}
                                                        onChange={e => setFormData({ ...formData, [field.key]: Number(e.target.value) })}
                                                    />
                                                </div>
                                            )}

                                            {field.type === 'DATE' && (
                                                <div className="relative">
                                                    <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                                                    <input
                                                        type="date"
                                                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96]"
                                                        // Handle date parsing/formatting if needed. Assuming string for simplicity or ISO.
                                                        value={formData[field.key] ? String(formData[field.key]).split('T')[0] : ''}
                                                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                                    />
                                                </div>
                                            )}

                                            {field.type === 'BOOLEAN' && (
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setFormData({ ...formData, [field.key]: true })}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${formData[field.key] === true ? 'bg-[#21AC96] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                    >
                                                        SÍ
                                                    </button>
                                                    <button
                                                        onClick={() => setFormData({ ...formData, [field.key]: false })}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${formData[field.key] === false ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                    >
                                                        NO
                                                    </button>
                                                </div>
                                            )}

                                            {field.type === 'SELECT' && (
                                                <select
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] h-10"
                                                    value={formData[field.key] || ''}
                                                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {field.options && field.options.map((opt: string, idx: number) => (
                                                        <option key={idx} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <SheetFooter className="mt-8">
                    <button
                        onClick={onClose}
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
                        Guardar Cambios
                    </button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
