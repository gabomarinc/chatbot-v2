'use client';

import { useState } from 'react';
import { X, Link as LinkIcon, FileText, Video, File, Plus, Search, Database, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type SourceType = 'TEXT' | 'WEBSITE' | 'VIDEO' | 'DOCUMENT';

interface AddSourceModalProps {
    isOpen: boolean;
    isLoading?: boolean;
    onClose: () => void;
    onAdd: (data: any) => void;
}

export function AddSourceModal({ isOpen, isLoading = false, onClose, onAdd }: AddSourceModalProps) {
    const [activeTab, setActiveTab] = useState<SourceType>('WEBSITE');
    const [formData, setFormData] = useState({
        url: '',
        text: '',
        updateInterval: 'NEVER',
        crawlSubpages: false,
        fileContent: '',
        fileName: ''
    });
    const [isUploading, setIsUploading] = useState(false);

    if (!isOpen) return null;

    const tabs = [
        { id: 'TEXT' as SourceType, label: 'Texto', icon: FileText },
        { id: 'WEBSITE' as SourceType, label: 'Sitio web', icon: LinkIcon },
        // { id: 'VIDEO' as SourceType, label: 'Video', icon: Video },
        { id: 'DOCUMENT' as SourceType, label: 'Documento', icon: File },
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("El archivo es demasiado grande (Máx 5MB)");
            return;
        }

        setIsUploading(true);
        const reader = new FileReader();

        reader.onload = (event) => {
            const content = event.target?.result as string;
            setFormData(prev => ({
                ...prev,
                fileContent: content,
                fileName: file.name
            }));
            setIsUploading(false);
        };

        reader.onerror = () => {
            alert("Error al leer el archivo");
            setIsUploading(false);
        };

        const isBinary = file.type === 'application/pdf' ||
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.type === 'application/vnd.ms-excel';

        if (isBinary) {
            reader.readAsDataURL(file); // Base64 for PDF and Excel
        } else {
            reader.readAsText(file); // Text for others (txt, etc)
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({
            type: activeTab,
            ...formData,
        });
        // Don't close modal here - parent will close it after success
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl shadow-gray-900/20 overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#21AC96]/10 rounded-xl flex items-center justify-center text-[#21AC96]">
                            <Database className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-gray-900 font-extrabold text-xl tracking-tight">Entrenamientos</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Añadir Fuente de Datos</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-8 pt-6 border-b border-gray-100">
                    <div className="flex gap-2">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-t-2xl text-sm font-bold transition-all ${activeTab === tab.id
                                        ? 'bg-white text-[#21AC96] border-b-2 border-[#21AC96]'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {activeTab === 'WEBSITE' && (
                        <>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-700 ml-1 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <LinkIcon className="w-4 h-4 text-[#21AC96]" />
                                        URL del Sitio Web o Sitemap (.xml)
                                    </div>
                                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Brutal Level 1 ⚡️</span>
                                </Label>
                                <Input
                                    required
                                    type="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    placeholder="Ej: https://miweb.com/sitemap.xml o https://miweb.com"
                                    className="px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium"
                                />
                                <div className="flex items-center gap-2 ml-1">
                                    <Sparkles className="w-3 h-3 text-indigo-400" />
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Ahora con motor de Markdown y detección automática de páginas</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700 ml-1">Intervalo de actualización:</Label>
                                    <select
                                        value={formData.updateInterval}
                                        onChange={(e) => setFormData({ ...formData, updateInterval: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium appearance-none cursor-pointer"
                                    >
                                        <option value="NEVER">Nunca</option>
                                        <option value="DAILY">Diario</option>
                                        <option value="WEEKLY">Semanal</option>
                                        <option value="MONTHLY">Mensual</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700 ml-1">Navegar en subpáginas:</Label>
                                    <select
                                        value={formData.crawlSubpages ? 'true' : 'false'}
                                        onChange={(e) => setFormData({ ...formData, crawlSubpages: e.target.value === 'true' })}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium appearance-none cursor-pointer"
                                    >
                                        <option value="false">No</option>
                                        <option value="true">Sí</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'TEXT' && (
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#21AC96]" />
                                Contenido de texto
                            </Label>
                            <Textarea
                                required
                                rows={8}
                                value={formData.text}
                                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                                placeholder="Escribe o pega el contenido que quieres que tu agente aprenda..."
                                className="px-5 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium resize-none"
                            />
                        </div>
                    )}

                    {activeTab === 'VIDEO' && (
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
                                <Video className="w-4 h-4 text-[#21AC96]" />
                                URL del video (YouTube, Vimeo, etc.)
                            </Label>
                            <Input
                                required
                                type="url"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium"
                            />
                        </div>
                    )}

                    {activeTab === 'DOCUMENT' && (
                        <div className="space-y-4">
                            <Label className="text-sm font-bold text-gray-700 ml-1 flex items-center gap-2">
                                <File className="w-4 h-4 text-[#21AC96]" />
                                Subir documento
                            </Label>
                            <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors relative cursor-pointer ${formData.fileName ? 'border-[#21AC96] bg-[#21AC96]/5' : 'border-gray-200 hover:border-[#21AC96]'
                                }`}>
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    accept=".pdf,.docx,.txt,.xlsx,.xls"
                                    onChange={handleFileChange}
                                />
                                {formData.fileName ? (
                                    <div className="flex flex-col items-center">
                                        <FileText className="w-12 h-12 text-[#21AC96] mb-3" />
                                        <p className="text-sm text-gray-900 font-bold mb-1">{formData.fileName}</p>
                                        <p className="text-xs text-[#21AC96] font-medium">Click para cambiar archivo</p>
                                    </div>
                                ) : (
                                    <>
                                        <File className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm text-gray-600 font-medium mb-1">Arrastra un archivo aquí o haz clic para seleccionar</p>
                                        <p className="text-xs text-gray-400">PDF, TXT, Excel (Máx. 5MB)</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-gray-50 text-gray-500 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isUploading || isLoading || (activeTab === 'DOCUMENT' && !formData.fileContent)}
                            className="flex-[2] px-6 py-4 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {(isUploading || isLoading) ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Sparkles className="w-5 h-5" />
                            )}
                            <span>{(isUploading || isLoading) ? 'Procesando...' : 'Registrar Fuente'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
