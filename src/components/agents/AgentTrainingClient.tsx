'use client';

import { useState, useEffect } from 'react';
import { Globe, Upload, FileText, Video as VideoIcon, CheckCircle2, AlertCircle, Loader2, Sparkles, Plus, MoreVertical, Search, Database, MessageSquare } from 'lucide-react';
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
    agent: any;
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

export function AgentTrainingClient({ agentId, agent, knowledgeBases }: AgentTrainingClientProps) {
    const [activeTab, setActiveTab] = useState('sources');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const router = useRouter();
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [sourceIdToDelete, setSourceIdToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Sandbox state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Source Viewer state
    const [selectedSource, setSelectedSource] = useState<any | null>(null);
    const [sourceChunks, setSourceChunks] = useState<any[]>([]);
    const [isLoadingChunks, setIsLoadingChunks] = useState(false);

    // Settings state
    const [smartRetrieval, setSmartRetrieval] = useState(agent.smartRetrieval);
    const [temperature, setTemperature] = useState(agent.temperature || 0.3);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const { getScoreImprovements } = await import('@/lib/scoring/agent-scoring');
                const data = await getScoreImprovements(agentId);
                setSuggestions(data);
            } catch (e) {
                console.error("Error fetching suggestions:", e);
            } finally {
                setIsLoadingSuggestions(false);
            }
        };
        fetchSuggestions();
    }, [agentId]);

    // Calculate last update from sources or agent updatedAt
    const allSources = knowledgeBases.flatMap(kb => kb.sources);

    const lastUpdateDate = allSources.length > 0
        ? new Date(Math.max(...allSources.map(s => new Date(s.createdAt).getTime())))
        : new Date(agent.updatedAt);

    const lastUpdateLabel = format(lastUpdateDate, "'El' d 'de' MMMM", { locale: es });
    const isToday = format(lastUpdateDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const finalDateLabel = isToday ? 'Hoy' : lastUpdateLabel;

    // Score helpers
    const score = agent.trainingScore || 0;
    const scoreLabel = score >= 8 ? 'Optimizado' : (score >= 5 ? 'Promedio' : 'Bajo');
    const scoreColor = score >= 8 ? 'text-[#21AC96]' : (score >= 5 ? 'text-yellow-600' : 'text-red-600');
    const scoreBg = score >= 8 ? 'bg-[#21AC96]/5' : (score >= 5 ? 'bg-yellow-50' : 'bg-red-50');

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

    const handleSimulateSearch = async () => {
        if (!searchQuery) return;
        setIsSearching(true);
        try {
            const { testRetrieval } = await import('@/lib/actions/knowledge');
            const results = await testRetrieval(agentId, searchQuery);
            setSearchResults(results);
            if (results.length === 0) toast.error('No se encontró información relevante');
        } catch (error) {
            toast.error('Error al realizar simulación');
        } finally {
            setIsSearching(false);
        }
    };

    const handleViewContent = async (sourceId: string) => {
        setIsLoadingChunks(true);
        try {
            const { getSourceChunks } = await import('@/lib/actions/knowledge');
            const chunks = await getSourceChunks(sourceId);
            setSourceChunks(chunks);
        } catch (error) {
            toast.error('Error al cargar contenido');
        } finally {
            setIsLoadingChunks(false);
        }
    };

    const handleRemoveChunk = async (chunkId: string) => {
        try {
            const { deleteKnowledgeChunk } = await import('@/lib/actions/knowledge');
            await deleteKnowledgeChunk(chunkId);
            setSourceChunks(prev => prev.filter(c => c.id !== chunkId));
            toast.success('Fragmento eliminado');
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    return (
        <>
            <div className="max-w-6xl space-y-10 animate-fade-in">
                {/* Dashboard layout structure */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Main Content (Left) */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-[#21AC96]/10 rounded-2xl flex items-center justify-center text-[#21AC96] shrink-0">
                                <Database className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <div>
                                <h2 className="text-gray-900 font-extrabold text-xl md:text-2xl tracking-tight">Base de Conocimientos</h2>
                                <p className="text-xs md:text-sm text-gray-500 font-medium leading-tight">Entrena a tu agente con documentos, sitios web y sitemaps</p>
                            </div>
                        </div>

                        {/* Elite Training Analysis (Additional Feature) */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
                            <div className="bg-[#21AC96]/5 p-6 md:p-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-white rounded-2xl shadow-sm text-[#21AC96]">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-gray-900 font-black text-xl leading-none">Elite Training Analysis</h3>
                                        <p className="text-[10px] text-[#21AC96] font-bold uppercase tracking-[0.2em] mt-2">Nivel de Optimización: {scoreLabel}</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-[1px] flex-1 bg-[#21AC96]/20" />
                                        <p className="text-[10px] font-black text-[#21AC96] uppercase tracking-[0.2em] whitespace-nowrap">Hoja de Ruta al Éxito</p>
                                        <div className="h-[1px] flex-1 bg-[#21AC96]/20" />
                                    </div>
                                    <h4 className="text-gray-900 font-extrabold text-2xl leading-tight">Recomendaciones para llegar al nivel "Maestro":</h4>

                                    <div className="space-y-3 mt-6">
                                        {isLoadingSuggestions ? (
                                            Array(3).fill(0).map((_, i) => (
                                                <div key={i} className="flex items-center gap-3 p-4 bg-white/40 rounded-2xl animate-pulse">
                                                    <div className="w-2 h-2 rounded-full bg-gray-200" />
                                                    <div className="h-3 w-40 bg-gray-200 rounded" />
                                                </div>
                                            ))
                                        ) : suggestions.length > 0 ? (
                                            suggestions.map((s, idx) => (
                                                <div key={idx} className="flex items-start gap-4 p-5 bg-white/60 hover:bg-white rounded-3xl border border-transparent hover:border-[#21AC96]/20 transition-all group shadow-sm hover:shadow-md hover:shadow-[#21AC96]/5">
                                                    <div className="w-6 h-6 rounded-full bg-[#21AC96]/10 text-[#21AC96] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#21AC96] group-hover:text-white transition-colors">
                                                        <Plus className="w-4 h-4" />
                                                    </div>
                                                    <p className="text-sm text-gray-700 font-bold leading-relaxed">{s}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="bg-white/40 p-8 rounded-3xl border border-[#21AC96]/20 text-center">
                                                <div className="w-12 h-12 bg-[#21AC96]/10 rounded-2xl flex items-center justify-center text-[#21AC96] mx-auto mb-4">
                                                    <CheckCircle2 className="w-6 h-6" />
                                                </div>
                                                <p className="text-base text-[#21AC96] font-black">¡Entrenamiento Maestro Alcanzado!</p>
                                                <p className="text-xs text-gray-600 mt-2 font-medium">Tu agente ha alcanzado el nivel máximo de optimización.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Stats (Right) */}
                    <div className="lg:col-span-4 space-y-6">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center justify-center gap-3 px-6 py-5 bg-[#21AC96] text-white rounded-[2rem] text-sm font-black shadow-xl shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all active:scale-[0.98] group w-full"
                        >
                            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                            Añadir Nueva Fuente
                        </button>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                            <div className="flex flex-col items-center">
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-50" />
                                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={351.8} strokeDashoffset={351.8 - (351.8 * score) / 10} className="text-[#21AC96] transition-all duration-1000 ease-out" strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-3xl font-black text-gray-900 leading-none">{score}</span>
                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1">/ 10</span>
                                    </div>
                                </div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-6 text-center">Score de Calidad</p>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-50/50">
                                {[
                                    { label: 'Fuentes', value: allSources.length, color: 'text-[#21AC96]', bg: 'bg-[#21AC96]/5', icon: Database },
                                    { label: 'Estado', value: scoreLabel, color: scoreColor, bg: scoreBg, icon: Sparkles },
                                    { label: 'Última Act.', value: finalDateLabel, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: CheckCircle2 },
                                ].map((stat, i) => (
                                    <div key={i} className={cn("p-5 rounded-3xl border border-transparent shadow-sm flex items-center gap-4 transition-all hover:translate-x-1", stat.bg)}>
                                        <div className={cn("w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0", stat.color)}>
                                            <stat.icon className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                                                {stat.label}
                                            </div>
                                            <div className={cn("text-base font-black truncate", stat.color)}>{stat.value}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area (Tabs + List) */}
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden">

                    <div className="px-5 md:px-8 py-8 border-b border-gray-50">
                        <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar bg-gray-50/50 p-2 rounded-[2rem] w-fit">
                            {[
                                { id: 'sources', label: 'Fuentes de Datos' },
                                { id: 'faq', label: 'Preguntas (FAQ) ✍️' },
                                { id: 'sandbox', label: 'Simulador (Sandbox) 🧪' },
                                { id: 'rag', label: 'Ajustes de Respuesta' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "px-6 py-3 text-sm font-bold transition-all rounded-[1.5rem] whitespace-nowrap",
                                        activeTab === tab.id
                                            ? "bg-white text-[#21AC96] shadow-md shadow-gray-200/50 scale-[1.02]"
                                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeTab === 'sources' ? (
                        <div className="p-5 md:p-8">
                            {allSources.filter(s => !s.displayName.startsWith('FAQ:')).length > 0 ? (
                                <div className="space-y-4">
                                    {allSources.filter(s => !s.displayName.startsWith('FAQ:')).map((source) => (
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
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedSource(source);
                                                                    setOpenMenuId(null);
                                                                    handleViewContent(source.id);
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-gray-600 hover:bg-gray-50 text-sm font-bold flex items-center gap-2 transition-colors border-b border-gray-50"
                                                            >
                                                                <Search className="w-4 h-4" />
                                                                Ver Contenido
                                                            </button>
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
                    ) : activeTab === 'sandbox' ? (
                        <div className="p-5 md:p-8 space-y-8 animate-fade-in">
                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-gray-900 font-bold text-lg">Simulador de Recuperación 🧪</h3>
                                    <p className="text-sm text-gray-500">Prueba cómo el bot busca información en tus documentos antes de responder.</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSimulateSearch()}
                                            placeholder="Escribe una pregunta para probar..."
                                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] transition-all outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSimulateSearch}
                                        disabled={isSearching || !searchQuery}
                                        className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-black disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        Probar
                                    </button>
                                </div>
                            </div>

                            {searchResults.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fragmentos Recuperados ({searchResults.length})</h4>
                                        <span className="text-[10px] font-bold text-[#21AC96] bg-[#21AC96]/10 px-3 py-1 rounded-full">Basado en tu configuración actual</span>
                                    </div>
                                    {searchResults.map((res, i) => (
                                        <div key={i} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-[#21AC96]/20 transition-all group">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-6 h-6 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center text-[10px] font-black">{i + 1}</div>
                                                <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Fragmento de Conocimiento</div>
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed italic border-l-4 border-gray-100 pl-4 group-hover:border-[#21AC96]/30 transition-all">"{res.content}"</p>
                                        </div>
                                    ))}
                                </div>
                            ) : searchQuery && !isSearching && (
                                <div className="py-20 flex flex-col items-center text-center opacity-50">
                                    <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
                                    <p className="text-sm font-bold text-gray-500">No se encontraron fragmentos relevantes para esta consulta.</p>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'faq' ? (
                        <div className="p-5 md:p-8 space-y-8 animate-fade-in">
                            <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100/50 space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-gray-900 font-extrabold text-lg flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-amber-500" />
                                        Entrenamiento Manual (Q&A)
                                    </h3>
                                    <p className="text-sm text-gray-500">Define respuestas directas para preguntas específicas. Estas tienen prioridad máxima sobre el resto de documentos.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase ml-2 tracking-wider">Pregunta del Usuario</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: ¿Cuál es el horario de atención?"
                                                id="faq-q"
                                                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase ml-2 tracking-wider">Respuesta de la IA</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Atendemos de Lunes a Viernes de 8am a 5pm"
                                                id="faq-a"
                                                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/50 rounded-2xl border border-dashed border-amber-200">
                                        <span className="text-xs font-bold text-amber-700">Estas parejas se guardan automáticamente como fragmentos de conocimiento de alta fidelidad.</span>
                                        <button
                                            onClick={async () => {
                                                const q = (document.getElementById('faq-q') as HTMLInputElement).value;
                                                const a = (document.getElementById('faq-a') as HTMLInputElement).value;
                                                if (!q || !a) return toast.error('Ingresa pregunta y respuesta');
                                                setIsAdding(true);
                                                try {
                                                    await addKnowledgeSource(agentId, {
                                                        type: 'TEXT',
                                                        text: `PREGUNTA MANUAL: ${q}\nRESPUESTA MANUAL CORRECTA: ${a}`,
                                                        fileName: `FAQ: ${q.substring(0, 30)}...`
                                                    });
                                                    toast.success('Pregunta manual añadida');
                                                    (document.getElementById('faq-q') as HTMLInputElement).value = '';
                                                    (document.getElementById('faq-a') as HTMLInputElement).value = '';
                                                    router.refresh();
                                                } catch (e) { toast.error('Error al guardar'); }
                                                finally { setIsAdding(false); }
                                            }}
                                            disabled={isAdding}
                                            className="ml-auto px-6 py-3 bg-amber-500 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                            Añadir Q&A
                                        </button>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Tus Parejas Activas</h4>
                                {allSources.filter(s => s.displayName.startsWith('FAQ:') || s.type === 'TEXT').length > 0 ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        {allSources.filter(s => s.displayName.startsWith('FAQ:') || s.type === 'TEXT').map((source) => (
                                            <div key={source.id} className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                                                        <MessageSquare className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">{source.displayName}</div>
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Entrenamiento Manual</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteClick(source.id)}
                                                    className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-20 text-center opacity-30 border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                                        <Sparkles className="w-10 h-10 mx-auto mb-4" />
                                        <p className="text-sm font-bold">Aún no has definido respuestas manuales.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-5 md:p-8 space-y-8 animate-fade-in">
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
                                                <span className="text-xs font-bold text-[#21AC96] bg-[#21AC96]/10 px-3 py-1 rounded-full">
                                                    {temperature <= 0.2 ? 'Estricto' : temperature <= 0.5 ? 'Balanceado' : 'Creativo'}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={temperature}
                                                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                                className="w-full accent-[#21AC96] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <div className="flex justify-between text-xs text-gray-400 font-medium">
                                                <span>Muy Creativo</span>
                                                <span>Estricto (Solo Docs)</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advanced RAG Toggle */}
                                    <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100/50 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                                    <Sparkles className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-indigo-900">Búsqueda Inteligente (RAG+)</div>
                                                    <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-tight">HyDE + Re-ranking de Cohere</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSmartRetrieval(!smartRetrieval)}
                                                className={cn(
                                                    "w-12 h-6 rounded-full transition-all relative",
                                                    smartRetrieval ? "bg-indigo-600" : "bg-gray-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                                    smartRetrieval ? "left-7" : "left-1"
                                                )}></div>
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-indigo-500/80 font-medium leading-relaxed italic">
                                            * Utiliza IA para imaginar la respuesta ideal y re-ordenar los fragmentos con Cohere. Máxima precisión garantizada.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-gray-900 font-bold text-lg mb-2">Si no encuentra respuesta...</h3>
                                        <p className="text-sm text-gray-500">¿Qué debe hacer el agente si la información no está en tus archivos?</p>
                                    </div>

                                    <div className="space-y-3">
                                        <label
                                            onClick={() => agent.transferToHuman = true}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                                                agent.transferToHuman ? "border-[#21AC96] bg-[#21AC96]/5" : "border-gray-100 hover:border-gray-200 bg-white"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border bg-white flex items-center justify-center",
                                                agent.transferToHuman ? "border-[#21AC96] border-[6px]" : "border-gray-300"
                                            )}></div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">Escalar a un Humano</div>
                                                <div className="text-xs text-gray-500">Ofrecerá contactar a soporte si no encuentra la respuesta.</div>
                                            </div>
                                        </label>

                                        <label
                                            onClick={() => agent.transferToHuman = false}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                                                !agent.transferToHuman ? "border-[#21AC96] bg-[#21AC96]/5" : "border-gray-100 hover:border-gray-200 bg-white"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border bg-white flex items-center justify-center",
                                                !agent.transferToHuman ? "border-[#21AC96] border-[6px]" : "border-gray-300"
                                            )}></div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">Usar conocimiento general</div>
                                                <div className="text-xs text-gray-500">Intentará responder con lo que sabe de IA (puede ser menos preciso).</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-50">
                                <button
                                    disabled={isSavingSettings}
                                    onClick={async () => {
                                        setIsSavingSettings(true);
                                        try {
                                            const { updateAgentSettings } = await import('@/lib/actions/agent-settings');
                                            await updateAgentSettings(agentId, {
                                                smartRetrieval,
                                                temperature,
                                                transferToHuman: agent.transferToHuman
                                            });
                                            toast.success('Ajustes guardados correctamente');
                                            router.refresh();
                                        } catch (e) {
                                            toast.error('Error al guardar ajustes');
                                        } finally {
                                            setIsSavingSettings(false);
                                        }
                                    }}
                                    className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSavingSettings && <Loader2 className="w-4 h-4 animate-spin" />}
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

            {/* Source Content Viewer Modal */}
            {
                selectedSource && (
                    <div className={cn(
                        "fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 transition-all duration-300",
                        selectedSource ? "visible" : "invisible"
                    )}>
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSource(null)} />
                        <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-300">
                            {/* Modal Header */}
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#21AC96]/10 text-[#21AC96] rounded-2xl flex items-center justify-center">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="max-w-[300px] md:max-w-md">
                                        <h3 className="text-xl font-black text-gray-900 leading-tight truncate">{selectedSource.displayName}</h3>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Limpieza de Conocimiento (Scraping Filter)</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedSource(null)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all font-black text-lg"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-gray-50/30">
                                {isLoadingChunks ? (
                                    <div className="py-20 flex flex-col items-center gap-4">
                                        <Loader2 className="w-10 h-10 text-[#21AC96] animate-spin" />
                                        <p className="text-sm font-bold text-gray-400">Analizando fragmentos...</p>
                                    </div>
                                ) : sourceChunks.length > 0 ? (
                                    <>
                                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
                                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-900 font-medium leading-relaxed">
                                                Aquí puedes ver exactamente qué leyó el bot de esta fuente. Si ves información irrelevante (como avisos legales, menús o texto basura), puedes eliminar el fragmento individual para que no ensucie las respuestas.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {sourceChunks.map((chunk, i) => (
                                                <div key={chunk.id} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-[#21AC96]/30 transition-all group relative">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] font-black text-gray-300 uppercase italic">Bloque #{i + 1}</span>
                                                        <button
                                                            onClick={() => handleRemoveChunk(chunk.id)}
                                                            className="p-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Eliminar este párrafo"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <p className="text-sm text-gray-700 leading-relaxed">"{chunk.content}"</p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-20 text-center space-y-4">
                                        <Database className="w-12 h-12 text-gray-200 mx-auto" />
                                        <p className="text-sm font-bold text-gray-400">No se encontraron fragmentos procesados para esta fuente.</p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-100 flex justify-end bg-white relative z-10">
                                <button
                                    onClick={() => setSelectedSource(null)}
                                    className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-black transition-all active:scale-95"
                                >
                                    Entendido
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
