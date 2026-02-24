'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    Plus, Image as ImageIcon, Trash2, Search, Tag,
    X, Upload, Loader2, Sparkles, Info
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface AgentMedia {
    id: string
    agentId: string
    url: string
    fileName: string
    description: string | null
    tags: string[]
    altText: string | null
    createdAt: Date
    updatedAt: Date
}

interface MediaClientProps {
    agentId: string
    media: AgentMedia[]
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export function MediaClient({ agentId, media: initialMedia }: MediaClientProps) {
    const [media, setMedia] = useState<AgentMedia[]>(initialMedia)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const router = useRouter()

    const filteredMedia = media.filter(m => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            m.fileName.toLowerCase().includes(q) ||
            m.description?.toLowerCase().includes(q) ||
            m.tags.some(t => t.toLowerCase().includes(q))
        )
    })

    const handleDelete = async (mediaId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta imagen?')) return
        try {
            const res = await fetch(`/api/agents/${agentId}/media/${mediaId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            setMedia(prev => prev.filter(m => m.id !== mediaId))
            toast.success('Imagen eliminada')
            router.refresh()
        } catch {
            toast.error('Error al eliminar')
        }
    }

    const handleUploadSuccess = (newMedia: AgentMedia) => {
        setMedia(prev => [newMedia, ...prev])
        setIsModalOpen(false)
        router.refresh()
    }

    /* ── Empty state ──────────────────────────────────────────────────── */
    if (media.length === 0) {
        return (
            <>
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm py-24 px-6 flex flex-col items-center text-center">
                    <div className="inline-flex items-center justify-center w-[72px] h-[72px] bg-[#21AC96]/10 rounded-[1.25rem] mb-6 text-[#21AC96]">
                        <ImageIcon className="w-9 h-9" />
                    </div>
                    <h3 className="text-[20px] font-black text-gray-900 mb-3">Galería Multimedia</h3>
                    <p className="text-[13px] font-semibold text-gray-500 mb-2">¿Para qué sirven las imágenes?</p>
                    <p className="text-[13px] text-gray-400 max-w-[480px] mb-6 leading-relaxed">
                        Las imágenes que subas aquí podrán ser enviadas automáticamente por el agente cuando los usuarios las soliciten — fotos de productos, planos, menús, mapas y más.
                    </p>
                    <div className="text-[12px] bg-gray-50 px-5 py-4 rounded-2xl border border-gray-100 text-gray-500 max-w-[520px] mb-10">
                        <strong className="text-gray-700">Ejemplo:</strong> Si un usuario escribe "muestrame la foto del modelo A", el agente enviará automáticamente la imagen correcta.
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-8 py-3.5 bg-[#21AC96] text-white rounded-2xl hover:bg-[#1b8c7a] transition-all font-bold text-sm cursor-pointer shadow-lg shadow-[#21AC96]/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Subir primera imagen
                    </button>
                </div>

                {isModalOpen && (
                    <MediaUploadModal
                        agentId={agentId}
                        onClose={() => setIsModalOpen(false)}
                        onSuccess={handleUploadSuccess}
                    />
                )}
            </>
        )
    }

    /* ── Gallery ─────────────────────────────────────────────────────── */
    return (
        <>
            <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-[18px] font-black text-gray-900">Galería Multimedia</h2>
                        <p className="text-[13px] text-gray-400 mt-0.5">Gestiona las imágenes que tu agente puede enviar a los usuarios</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#21AC96] text-white rounded-2xl hover:bg-[#1b8c7a] transition-all font-bold text-sm cursor-pointer shadow-md shadow-[#21AC96]/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Subir Imagen
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, descripción o tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/30 focus:border-[#21AC96] transition-all shadow-sm"
                    />
                </div>

                {/* Grid */}
                {filteredMedia.length === 0 ? (
                    <div className="text-center py-12 text-[13px] text-gray-400 font-medium">
                        No se encontraron imágenes con &ldquo;{searchQuery}&rdquo;
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMedia.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden hover:border-[#21AC96]/30 hover:shadow-md transition-all group"
                            >
                                {/* Thumbnail */}
                                <div className="aspect-video bg-gray-50 relative overflow-hidden">
                                    <img
                                        src={item.url}
                                        alt={item.altText || item.description || item.fileName}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.display = 'none'
                                            const parent = e.currentTarget.parentElement
                                            if (parent) {
                                                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4-4 4 4 4-8 4 8M4 20h16M4 4h16"/></svg></div>'
                                            }
                                        }}
                                    />
                                    {/* Delete overlay */}
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-red-50"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    </button>
                                </div>

                                {/* Info */}
                                <div className="p-4 space-y-2">
                                    <h3 className="font-black text-[13px] text-gray-900 truncate">{item.fileName}</h3>
                                    {item.description && (
                                        <p className="text-[12px] text-gray-400 leading-relaxed line-clamp-2">{item.description}</p>
                                    )}
                                    {item.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {item.tags.slice(0, 3).map((tag, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#21AC96]/8 text-[#21AC96] text-[10px] font-bold rounded-full border border-[#21AC96]/15"
                                                >
                                                    <Tag className="w-2.5 h-2.5" />
                                                    {tag}
                                                </span>
                                            ))}
                                            {item.tags.length > 3 && (
                                                <span className="text-[10px] text-gray-400 font-bold px-1">+{item.tags.length - 3}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <MediaUploadModal
                    agentId={agentId}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleUploadSuccess}
                />
            )}
        </>
    )
}

/* ─── Upload Modal ───────────────────────────────────────────────────────── */
function MediaUploadModal({
    agentId,
    onClose,
    onSuccess
}: {
    agentId: string
    onClose: () => void
    onSuccess: (media: AgentMedia) => void
}) {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [description, setDescription] = useState('')
    const [tags, setTags] = useState('')
    const [altText, setAltText] = useState('')
    const [prompt, setPrompt] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    const processFile = (selectedFile: File) => {
        if (!selectedFile.type.startsWith('image/')) {
            toast.error('Por favor selecciona una imagen')
            return
        }
        if (selectedFile.size > 5 * 1024 * 1024) {
            toast.error('La imagen debe ser menor a 5MB')
            return
        }
        setFile(selectedFile)
        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target?.result as string)
        reader.readAsDataURL(selectedFile)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (f) processFile(f)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) processFile(f)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) { toast.error('Por favor selecciona una imagen'); return }

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            if (description) formData.append('description', description)
            if (tags) formData.append('tags', tags)
            if (altText) formData.append('altText', altText)
            if (prompt) formData.append('prompt', prompt)

            const res = await fetch(`/api/agents/${agentId}/media`, { method: 'POST', body: formData })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Error al subir')
            }
            const newMedia = await res.json()
            toast.success('Imagen subida correctamente')
            onSuccess(newMedia)
            router.refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al subir imagen')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-900/20 w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                {/* ── Dark Header ─────────────────────────────── */}
                <div className="bg-gray-900 px-8 py-7 flex items-start justify-between shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#21AC96]/10 rounded-full -mr-20 -mt-20 blur-2xl" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-9 h-9 bg-[#21AC96]/20 rounded-xl flex items-center justify-center">
                                <ImageIcon className="w-4.5 h-4.5 text-[#21AC96]" />
                            </div>
                            <h3 className="text-white font-black text-lg tracking-tight">Subir Imagen</h3>
                        </div>
                        <p className="text-gray-400 text-[13px] font-medium pl-12">
                            Agrega una imagen que tu agente pueda enviar cuando la soliciten
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="relative z-10 p-2 text-gray-500 hover:text-gray-300 hover:bg-white/10 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Body ────────────────────────────────────── */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-7 space-y-6">

                    {/* Drop zone / Preview */}
                    <div>
                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                            <span>Imagen</span>
                            <span className="bg-[#21AC96]/10 text-[#21AC96] px-2 py-0.5 rounded-full text-[10px]">Requerido</span>
                        </label>

                        {preview ? (
                            <div className="relative rounded-[1.5rem] overflow-hidden border border-gray-100 shadow-sm">
                                <img src={preview} alt="Preview" className="w-full aspect-video object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                                    <p className="text-white text-[12px] font-bold truncate">{file?.name}</p>
                                    <button
                                        type="button"
                                        onClick={() => { setFile(null); setPreview(null) }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-[11px] font-bold rounded-lg hover:bg-red-500/80 transition-all"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Cambiar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label
                                className={`flex flex-col items-center justify-center w-full h-44 rounded-[1.5rem] border-2 border-dashed cursor-pointer transition-all ${isDragging ? 'border-[#21AC96] bg-[#21AC96]/5' : 'border-gray-200 hover:border-[#21AC96]/50 hover:bg-gray-50/50'}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className={`w-14 h-14 rounded-[1rem] flex items-center justify-center mb-3 transition-all ${isDragging ? 'bg-[#21AC96] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    <Upload className="w-6 h-6" />
                                </div>
                                <p className="text-[13px] font-bold text-gray-600 mb-1">
                                    <span className="text-[#21AC96]">Haz clic para subir</span> o arrastra y suelta
                                </p>
                                <p className="text-[11px] text-gray-400">PNG, JPG, GIF, WEBP hasta 5MB</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                />
                            </label>
                        )}
                    </div>

                    {/* Instructions para el Chatbot */}
                    <div>
                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                            <span>Instrucciones para el Chatbot</span>
                            <span className="bg-[#21AC96]/10 text-[#21AC96] px-2 py-0.5 rounded-full text-[10px]">Requerido</span>
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ej: Cuando el usuario pida ver la imagen del modelo A o pregunte por la planta del apartamento, envía esta imagen."
                            rows={3}
                            required
                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/30 focus:border-[#21AC96] transition-all resize-none"
                        />
                        <div className="flex items-start gap-2 mt-2 text-gray-400">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <p className="text-[11px] leading-relaxed">Le dicen al agente cuándo y por qué enviar esta imagen.</p>
                        </div>
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3 block">
                            Descripción <span className="font-normal normal-case">(opcional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe la imagen para ayudar al chatbot a identificarla con mayor precisión..."
                            rows={2}
                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/30 focus:border-[#21AC96] transition-all resize-none"
                        />
                    </div>

                    {/* Tags + Alt en grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3 block">
                                Tags <span className="font-normal normal-case">(separados por comas)</span>
                            </label>
                            <div className="relative">
                                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="exterior, sala, plano..."
                                    className="w-full pl-9 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/30 focus:border-[#21AC96] transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3 block">
                                Alt Text <span className="font-normal normal-case">(accesibilidad)</span>
                            </label>
                            <input
                                type="text"
                                value={altText}
                                onChange={(e) => setAltText(e.target.value)}
                                placeholder="Descripción breve..."
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/30 focus:border-[#21AC96] transition-all"
                            />
                        </div>
                    </div>
                </form>

                {/* ── Footer ──────────────────────────────────── */}
                <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/50 shrink-0">
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-[#21AC96]" />
                        <span>La descripción e instrucciones mejoran la precisión del agente</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isUploading}
                            className="px-5 py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!file || isUploading}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#21AC96] text-white font-bold text-sm hover:bg-[#1b8c7a] transition-all shadow-md shadow-[#21AC96]/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" />Subiendo...</>
                            ) : (
                                <><Upload className="w-4 h-4" />Subir Imagen</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
