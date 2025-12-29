'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Image as ImageIcon, Trash2, Search, Tag, FileImage } from 'lucide-react'

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

export function MediaClient({ agentId, media: initialMedia }: MediaClientProps) {
    const [media, setMedia] = useState<AgentMedia[]>(initialMedia)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const router = useRouter()

    const filteredMedia = media.filter(m => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            m.fileName.toLowerCase().includes(query) ||
            m.description?.toLowerCase().includes(query) ||
            m.tags.some(tag => tag.toLowerCase().includes(query))
        )
    })

    const handleDelete = async (mediaId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta imagen?')) return

        try {
            const response = await fetch(`/api/agents/${agentId}/media/${mediaId}`, {
                method: 'DELETE'
            })

            if (!response.ok) throw new Error('Failed to delete media')

            setMedia(prev => prev.filter(m => m.id !== mediaId))
            toast.success('Imagen eliminada')
            router.refresh()
        } catch (error) {
            toast.error('Error al eliminar')
        }
    }

    const handleUploadSuccess = (newMedia: AgentMedia) => {
        setMedia(prev => [newMedia, ...prev])
        setIsModalOpen(false)
        router.refresh()
    }

    if (media.length === 0) {
        return (
            <>
                <div className="max-w-4xl space-y-6">
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                            <ImageIcon className="w-8 h-8 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            No hay imágenes aún
                        </h3>
                        <p className="text-gray-500 mb-6">
                            Sube imágenes para que tu agente pueda mostrarlas cuando los usuarios las soliciten.
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium cursor-pointer"
                        >
                            Subir primera imagen
                        </button>
                    </div>
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

    return (
        <>
            <div className="max-w-4xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Imágenes del Agente</h2>
                        <p className="text-gray-500">Gestiona las imágenes que tu agente puede mostrar a los usuarios</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        Subir Imagen
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, descripción o tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>

                {/* Media Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMedia.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                        >
                            {/* Image Preview */}
                            <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                <img
                                    src={item.url}
                                    alt={item.altText || item.description || item.fileName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                        const parent = e.currentTarget.parentElement
                                        if (parent) {
                                            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><FileImage class="w-12 h-12 text-gray-400" /></div>'
                                        }
                                    }}
                                />
                            </div>

                            {/* Info */}
                            <div className="p-4 space-y-2">
                                <h3 className="font-semibold text-gray-900 truncate">
                                    {item.fileName}
                                </h3>
                                {item.description && (
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                        {item.description}
                                    </p>
                                )}
                                
                                {/* Tags */}
                                {item.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {item.tags.slice(0, 3).map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full"
                                            >
                                                <Tag className="w-3 h-3" />
                                                {tag}
                                            </span>
                                        ))}
                                        {item.tags.length > 3 && (
                                            <span className="text-xs text-gray-500">
                                                +{item.tags.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredMedia.length === 0 && searchQuery && (
                    <div className="text-center py-8 text-gray-500">
                        No se encontraron imágenes con "{searchQuery}"
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
    const router = useRouter()

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        if (!selectedFile.type.startsWith('image/')) {
            toast.error('Por favor selecciona una imagen')
            return
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
            toast.error('La imagen debe ser menor a 10MB')
            return
        }

        setFile(selectedFile)

        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => {
            setPreview(e.target?.result as string)
        }
        reader.readAsDataURL(selectedFile)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) {
            toast.error('Por favor selecciona una imagen')
            return
        }

        setIsUploading(true)

        try {
            const formData = new FormData()
            formData.append('file', file)
            if (description) formData.append('description', description)
            if (tags) formData.append('tags', tags)
            if (altText) formData.append('altText', altText)
            if (prompt) formData.append('prompt', prompt)

            const response = await fetch(`/api/agents/${agentId}/media`, {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to upload media')
            }

            const newMedia = await response.json()
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900">Subir Imagen</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Agrega una imagen que tu agente pueda mostrar cuando los usuarios la soliciten
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Imagen *
                        </label>
                        {preview ? (
                            <div className="space-y-3">
                                <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden">
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFile(null)
                                            setPreview(null)
                                        }}
                                        className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-600">{file?.name}</p>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-500 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <ImageIcon className="w-12 h-12 text-gray-400 mb-3" />
                                    <p className="mb-2 text-sm text-gray-500">
                                        <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                                    </p>
                                    <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                />
                            </label>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descripción
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe la imagen para ayudar al chatbot a encontrarla..."
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Esta descripción ayudará al chatbot a encontrar la imagen cuando los usuarios la soliciten
                        </p>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tags (separados por comas)
                        </label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="casa, exterior, sala, cocina..."
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Etiquetas que ayudarán a categorizar y buscar la imagen
                        </p>
                    </div>

                    {/* Alt Text */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Texto Alternativo (Alt Text)
                        </label>
                        <input
                            type="text"
                            value={altText}
                            onChange={(e) => setAltText(e.target.value)}
                            placeholder="Descripción breve para accesibilidad..."
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Texto que se mostrará si la imagen no puede cargarse
                        </p>
                    </div>

                    {/* Prompt/Instructions */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Instrucciones para el Chatbot *
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ejemplo: Cuando el usuario pida imagen de la casa A, envía esta imagen"
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Instrucciones específicas que le dirán al chatbot cuándo y cómo usar esta imagen. Ejemplo: "Cuando el usuario pida ver la casa modelo A o pregunte por fotos de la propiedad tipo A, envía esta imagen"
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                            disabled={isUploading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!file || isUploading}
                            className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? 'Subiendo...' : 'Subir Imagen'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

