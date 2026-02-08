'use client';

import { useState } from 'react';
import { Globe, Upload, FileText, Video as VideoIcon, CheckCircle2, AlertCircle, Loader2, Sparkles, Plus, MoreVertical, Search, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AddSourceModal } from './AddSourceModal';
import { deleteKnowledgeSource } from '@/lib/actions/knowledge';
import { Trash2 } from 'lucide-react';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { Tooltip } from "@/components/ui/tooltip";

interface KnowledgeSource {
    id: string;
    type: string;
    displayName: string;
    sourceUrl: string | null;
    status: string;
    errorMessage?: string | null;
    createdAt: Date;
}

interface KnowledgeBase {
    id: string;
    name: string;
    sources: KnowledgeSource[];
}

interface AgentTrainingClientProps {
    agentId: string;
    knowledgeBases: KnowledgeBase[];
}

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { addKnowledgeSource } from '@/lib/actions/knowledge';
import { toast } from 'sonner';

function getFriendlyErrorMessage(error: string | null | undefined): string {
    if (!error) return "Error desconocido (Sin mensaje del servidor)";

    const e = error.toLowerCase();

    if (e.includes('404')) return "No encontramos la página (Error 404). Verifica el enlace.";
    if (e.includes('403') || e.includes('access denied')) return "Acceso denegado. La página bloquea bots.";
    if (e.includes('500') || e.includes('502') || e.includes('503')) return "La página web tiene error de servidor.";
    if (e.includes('timeout') || e.includes('time out') || e.includes('timed out')) return "La página tardó mucho en responder.";
    if (e.includes('jina') || e.includes('scraping')) return "No pudimos leer el contenido. Intenta otra vez.";
    if (e.includes('pdf')) return "El PDF está dañado o protegido.";
    if (e.includes('empty body') || e.includes('no text')) return "La página parece estar vacía.";
    if (e.includes('enotfound') || e.includes('dns')) return "No existe el dominio o servidor.";
    if (e.includes('invalid url') || e.includes('parse url')) return "La URL no tiene un formato válido.";
    if (e.includes('429')) return "Demasiadas peticiones. Intenta más tarde.";
    if (e.includes('unauthorized') || e.includes('401')) return "Se requiere autenticación para ver esto.";

    return `Error: ${error}`; // Temporary debug: show raw error
    // return `Error técnico: ${error.substring(0, 50)}${error.length > 50 ? '...' : ''}`;
}

export function AgentTrainingClient({ agentId, knowledgeBases }: AgentTrainingClientProps) {
    const [activeTab, setActiveTab] = useState('sources');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const router = useRouter();
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [sourceIdToDelete, setSourceIdToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteClick = (sourceId: string) => {
        setSourceIdToDelete(sourceId);
        setIsDeleteModalOpen(true);
        setOpenMenuId(null);
    };

    const handleConfirmDelete = async () => {
        if (!sourceIdToDelete) return;
        setIsDeleting(true);
        try {
            await deleteKnowledgeSource(agentId, sourceIdToDelete);
            toast.success('Fuente eliminada correctamente');
            setIsDeleteModalOpen(false);
            router.refresh();
        } catch (error) {
            toast.error('Error al eliminar la fuente');
        } finally {
            setIsDeleting(false);
            setSourceIdToDelete(null);
        }
    };

    // Flatten sources for easier listing
    const allSources = knowledgeBases.flatMap(kb => kb.sources);

    const handleAddSource = async (data: any) => {
        setIsAdding(true);
        try {
            await addKnowledgeSource(agentId, data);
            toast.success('Fuente de conocimiento añadida correctamente');
            router.refresh();
            setIsModalOpen(false); // Close modal AFTER success
        } catch (error) {
            console.error(error);
            toast.error('Error al añadir la fuente');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <>
            <div className="max-w-4xl space-y-10 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-[#21AC96]/10 rounded-2xl flex items-center justify-center text-[#21AC96]">
                            <Database className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-gray-900 font-extrabold text-2xl tracking-tight">Base de Conocimientos</h2>
                            <p className="text-gray-500 font-medium">Entrena a tu agente con documentos, sitios web y texto</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3.5 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all active:scale-95 group"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                        Añadir Fuente
                    </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Fuentes Totales', value: allSources.length, color: 'text-[#21AC96]', bg: 'bg-[#21AC96]/5' },
                        { label: 'Estado del Entrenamiento', value: 'Optimizado', color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Última Actualización', value: 'Hoy', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    ].map((stat, i) => (
                        <div key={i} className={cn("p-6 rounded-3xl border border-transparent shadow-sm", stat.bg)}>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">{stat.label}</div>
                            <div className={cn("text-2xl font-black", stat.color)}>{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* Content Area */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    {/* Tabs */}
                    <div className="px-8 pt-6 border-b border-gray-50">
                        <div className="flex gap-8">
                            {['Fuentes de Datos', 'Ajustes de Respuesta'].map((tab, i) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(i === 0 ? 'sources' : 'rag')}
                                    className={cn(
                                        "pb-4 text-sm font-bold transition-all relative",
                                        (i === 0 ? activeTab === 'sources' : activeTab === 'rag')
                                            ? "text-[#21AC96]"
                                            : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    {tab}
                                    {(i === 0 ? activeTab === 'sources' : activeTab === 'rag') && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#21AC96] rounded-full shadow-[0_-2px_8px_rgba(33,172,150,0.5)]"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeTab === 'sources' ? (
                        <div className="p-8">
                            {allSources.length > 0 ? (
                                <div className="space-y-4">
                                    {allSources.map((source) => (
                                        <div
                                            key={source.id}
                                            className="group p-5 bg-gray-50/50 hover:bg-white rounded-[1.5rem] border border-transparent hover:border-[#21AC96]/20 hover:shadow-xl hover:shadow-[#21AC96]/5 transition-all flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                                    {source.type === 'WEBSITE' ? <Globe className="w-5 h-5 text-blue-500" /> :
                                                        (source.type === 'FILE' || source.type === 'DOCUMENT') ? <FileText className="w-5 h-5 text-orange-500" /> :
                                                            <Database className="w-5 h-5 text-[#21AC96]" />}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-extrabold text-gray-900 leading-tight mb-1">{source.displayName}</div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                            {format(new Date(source.createdAt), "d MMM, yyyy", { locale: es })}
                                                        </span>
                                                        {source.sourceUrl && (
                                                            <span className="text-[10px] text-[#21AC96] font-bold truncate max-w-[200px]">
                                                                {source.sourceUrl}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {source.status === 'READY' ? (
                                                    <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-100 flex items-center gap-1.5">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Listo
                                                    </div>
                                                ) : source.status === 'PROCESSING' ? (
                                                    <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100 flex items-center gap-1.5">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Analizando
                                                    </div>
                                                ) : (
                                                    <Tooltip content={getFriendlyErrorMessage(source.errorMessage)}>
                                                        <div className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-red-100 flex items-center gap-1.5 cursor-help">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Error
                                                        </div>
                                                    </Tooltip>
                                                )}
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setOpenMenuId(openMenuId === source.id ? null : source.id)}
                                                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-300 hover:text-gray-600 w-10 h-10 flex items-center justify-center"
                                                    >
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>
                                                    {openMenuId === source.id && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                            <button
                                                                onClick={() => handleDeleteClick(source.id)}
                                                                className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 text-sm font-bold flex items-center gap-2 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Eliminar Fuente
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 flex flex-col items-center text-center">
                                    <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
                                        <Sparkles className="w-10 h-10 text-gray-200" />
                                    </div>
                                    <h3 className="text-gray-900 font-extrabold text-xl tracking-tight mb-2">Sin fuentes de datos</h3>
                                    <p className="text-gray-400 font-medium max-w-sm mx-auto mb-8">
                                        Tu agente necesita información para poder responder con precisión. Añade tu primera fuente ahora.
                                    </p>
                                    <button className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all active:scale-95">
                                        <Plus className="w-5 h-5" />
                                        Añadir Conocimiento
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-gray-900 font-bold text-lg mb-2">Comportamiento de Respuesta</h3>
                                        <p className="text-sm text-gray-500">Define qué tan estricto debe ser el agente al usar tus documentos.</p>
                                    </div>

                                    <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-6">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-bold text-gray-700">Creatividad vs Precisión</span>
                                                <span className="text-xs font-bold text-[#21AC96] bg-[#21AC96]/10 px-3 py-1 rounded-full">Balanceado</span>
                                            </div>
                                            <input type="range" className="w-full accent-[#21AC96] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                            <div className="flex justify-between text-xs text-gray-400 font-medium">
                                                <span>Muy Creativo</span>
                                                <span>Estricto (Solo Docs)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-gray-900 font-bold text-lg mb-2">Si no encuentra respuesta...</h3>
                                        <p className="text-sm text-gray-500">¿Qué debe hacer el agente si la información no está en tus archivos?</p>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="flex items-center gap-4 p-4 rounded-2xl border border-[#21AC96] bg-[#21AC96]/5 cursor-pointer transition-all">
                                            <div className="w-5 h-5 rounded-full border-[6px] border-[#21AC96] bg-white"></div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">Escalar a un Humano</div>
                                                <div className="text-xs text-gray-500">Ofrecerá contactar a soporte si no encuentra la respuesta.</div>
                                            </div>
                                        </label>

                                        <label className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 bg-white cursor-pointer transition-all opacity-60">
                                            <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">Usar conocimiento general</div>
                                                <div className="text-xs text-gray-500">Intentará responder con lo que sabe de IA (puede ser menos preciso).</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-50">
                                <button className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-black transition-all">
                                    Guardar Ajustes
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AddSourceModal
                isOpen={isModalOpen}
                isLoading={isAdding}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddSource}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                isLoading={isDeleting}
                title="¿Eliminar fuente?"
                description="Esta acción no se puede deshacer y el agente perderá este conocimiento."
            />
        </>
    );
}
