'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2, Save, X, MessageSquare, Image as ImageIcon, FileText, Video } from 'lucide-react';
import { toast } from 'sonner';
import { createWhatsAppTemplateAction } from '@/lib/actions/whatsapp-auth';

interface TemplateManagerProps {
    wabaId: string;
    accessToken: string;
    onSuccess: () => void;
    onCancel: () => void;
}

type ComponentType = 'BODY' | 'HEADER' | 'FOOTER' | 'BUTTONS';

export function TemplateManager({ wabaId, accessToken, onSuccess, onCancel }: TemplateManagerProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('UTILITY'); // UTILITY, MARKETING, AUTHENTICATION
    const [language, setLanguage] = useState('es');

    // Components State
    const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>('NONE');
    const [headerText, setHeaderText] = useState('');
    const [bodyText, setBodyText] = useState('');
    const [footerText, setFooterText] = useState('');
    const [buttons, setButtons] = useState<{ type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER', text: string, url?: string, phone_number?: string }[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !bodyText) {
            toast.error('Nombre y mensaje son obligatorios');
            return;
        }

        setIsLoading(true);
        try {
            // Construct Meta Components
            const components: any[] = [];

            // Header
            if (headerType !== 'NONE') {
                const header: any = { type: 'HEADER', format: headerType };
                if (headerType === 'TEXT') header.text = headerText;
                components.push(header);
            }

            // Body
            components.push({
                type: 'BODY',
                text: bodyText
            });

            // Footer
            if (footerText) {
                components.push({
                    type: 'FOOTER',
                    text: footerText
                });
            }

            // Buttons
            if (buttons.length > 0) {
                components.push({
                    type: 'BUTTONS',
                    buttons: buttons.map(b => {
                        if (b.type === 'QUICK_REPLY') return { type: 'QUICK_REPLY', text: b.text };
                        if (b.type === 'URL') return { type: 'URL', text: b.text, url: b.url };
                        if (b.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone_number };
                        return null;
                    }).filter(Boolean)
                });
            }

            const result = await createWhatsAppTemplateAction({
                wabaId,
                accessToken,
                name: name.toLowerCase().replace(/\s+/g, '_'),
                category,
                language,
                components
            });

            if (result.success) {
                toast.success('Plantilla creada exitosamente');
                onSuccess();
            } else {
                toast.error(result.error || 'Error al crear plantilla');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error inesperado');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-h-[80vh] overflow-y-auto w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Crear Nueva Plantilla</h3>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nombre</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="ej: oferta_verano"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                        />
                        <p className="text-[10px] text-gray-400">Solo minúsculas y guiones bajos</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Categoría</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none"
                        >
                            <option value="UTILITY">Utilidad (Utility)</option>
                            <option value="MARKETING">Marketing</option>
                            {/* AUTH not supported in simple editor for now */}
                        </select>
                    </div>
                </div>

                {/* Header */}
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-500 uppercase">Header (Opcional)</label>
                        <select
                            value={headerType}
                            onChange={(e) => setHeaderType(e.target.value as any)}
                            className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1"
                        >
                            <option value="NONE">Ninguno</option>
                            <option value="TEXT">Texto</option>
                            <option value="IMAGE">Imagen</option>
                            <option value="VIDEO">Video</option>
                            <option value="DOCUMENT">Documento</option>
                        </select>
                    </div>

                    {headerType === 'TEXT' && (
                        <input
                            type="text"
                            value={headerText}
                            onChange={(e) => setHeaderText(e.target.value)}
                            placeholder="Título del encabezado..."
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                        />
                    )}
                    {headerType !== 'NONE' && headerType !== 'TEXT' && (
                        <div className="h-10 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500 italic">
                            El usuario subirá el archivo multimedia al enviar.
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Mensaje (Body)</label>
                    <textarea
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                        placeholder="Hola {{1}}, gracias por tu compra..."
                        rows={4}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none"
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setBodyText(prev => prev + ' {{1}}')}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold text-gray-600 transition-colors"
                        >
                            + Variable
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Pie de Página (Opcional)</label>
                    <input
                        type="text"
                        value={footerText}
                        onChange={(e) => setFooterText(e.target.value)}
                        placeholder="Ej: Enviado por Chatbot V2"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none"
                    />
                </div>

                {/* Buttons - Simplified for MVP (Quick Replies) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-500 uppercase">Botones (Máx 3)</label>
                        <button
                            type="button"
                            onClick={() => setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }])}
                            disabled={buttons.length >= 3}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                        >
                            + Agregar Botón
                        </button>
                    </div>
                    {buttons.map((btn, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input
                                type="text"
                                value={btn.text}
                                onChange={(e) => {
                                    const newButtons = [...buttons];
                                    newButtons[idx].text = e.target.value;
                                    setButtons(newButtons);
                                }}
                                placeholder="Texto del botón"
                                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const newButtons = buttons.filter((_, i) => i !== idx);
                                    setButtons(newButtons);
                                }}
                                className="p-2 text-red-400 hover:text-red-500"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="pt-4 border-t border-gray-100 flex gap-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-[2] py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Guardar Plantilla
                    </button>
                </div>

            </form>
        </div>
    );
}
