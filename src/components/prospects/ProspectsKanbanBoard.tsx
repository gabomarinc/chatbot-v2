'use client'

import { useState, useRef, useCallback } from 'react'
import {
    Users, Phone, Mail, MessageSquare, Bot, Tag,
    Plus, X, Settings2, GripVertical, AlertCircle,
    ChevronDown, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { updateProspectStatus, createProspectColumn, deleteProspectColumn } from '@/lib/actions/prospect-pipeline'
import { cn } from '@/lib/utils'

/* ─── Types ──────────────────────────────────────────────────────────── */
interface Column {
    id: string
    name: string
    color: string
    order: number
    isDefault: boolean
}

interface Prospect {
    id: string
    name: string
    email: string | null
    phone: string | null
    prospectStatus: string
    customData: Record<string, any>
    tags: string[]
    leadScore: number | null
    summary: string | null
    lastMessage: string | null
    lastMessageAt: Date | string
    agentId: string | null
    agentName: string | null
    createdAt: Date | string
}

interface Agent {
    id: string
    name: string
    avatarUrl: string | null
}

interface CustomField {
    id: string
    key: string
    label: string
    type: string
    agentId: string
}

interface ProspectsKanbanBoardProps {
    initialColumns: Column[]
    initialProspects: Prospect[]
    agents: Agent[]
    customFields: CustomField[]
}

/* ─── Color palette for new columns ─────────────────────────────────── */
const COLUMN_COLORS = [
    '#21AC96', '#3B82F6', '#8B5CF6', '#F59E0B',
    '#EF4444', '#EC4899', '#10B981', '#6366F1'
]

/* ─── Prospect Card ──────────────────────────────────────────────────── */
function ProspectCard({
    prospect,
    customFields,
    onDragStart,
    isDragging
}: {
    prospect: Prospect
    customFields: CustomField[]
    onDragStart: (e: React.DragEvent, id: string) => void
    isDragging: boolean
}) {
    const relevantFields = customFields.filter(f =>
        prospect.customData && prospect.customData[f.key] !== undefined && prospect.customData[f.key] !== null && prospect.customData[f.key] !== ''
    )

    const initials = prospect.name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, prospect.id)}
            className={cn(
                'bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-[#21AC96]/20 transition-all group select-none',
                isDragging && 'opacity-50 scale-95 rotate-1'
            )}
        >
            {/* Header: Avatar + Name */}
            <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#21AC96]/20 to-[#21AC96]/5 flex items-center justify-center text-[#21AC96] font-black text-sm shrink-0">
                    {initials || <Users className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-black text-[13px] text-gray-900 truncate leading-tight">{prospect.name}</h4>
                    {prospect.agentName && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <Bot className="w-2.5 h-2.5 text-indigo-400" />
                            <span className="text-[10px] text-indigo-500 font-bold truncate">{prospect.agentName}</span>
                        </div>
                    )}
                </div>
                <GripVertical className="w-3.5 h-3.5 text-gray-200 group-hover:text-gray-400 transition-colors shrink-0 mt-0.5" />
            </div>

            {/* Contact info */}
            <div className="space-y-1 mb-3">
                {prospect.phone && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <Phone className="w-3 h-3 text-gray-300 shrink-0" />
                        <span className="truncate">{prospect.phone}</span>
                    </div>
                )}
                {prospect.email && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <Mail className="w-3 h-3 text-gray-300 shrink-0" />
                        <span className="truncate">{prospect.email}</span>
                    </div>
                )}
            </div>

            {/* Last message / intent */}
            {prospect.lastMessage && (
                <div className="mb-3">
                    <div className="flex items-start gap-1.5 bg-gray-50 rounded-xl px-2.5 py-2 border border-gray-100">
                        <MessageSquare className="w-2.5 h-2.5 text-gray-300 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">{prospect.lastMessage}</p>
                    </div>
                </div>
            )}

            {/* Custom fields */}
            {relevantFields.length > 0 && (
                <div className="space-y-1 mb-3 pt-2 border-t border-gray-50">
                    {relevantFields.slice(0, 3).map(f => (
                        <div key={f.key} className="flex items-center justify-between gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 truncate">{f.label}</span>
                            <span className="text-[10px] font-bold text-gray-700 truncate max-w-[60%] text-right">
                                {String(prospect.customData[f.key])}
                            </span>
                        </div>
                    ))}
                    {relevantFields.length > 3 && (
                        <p className="text-[9px] text-gray-400 text-right">+{relevantFields.length - 3} más</p>
                    )}
                </div>
            )}

            {/* Tags */}
            {prospect.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-50">
                    {prospect.tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#21AC96]/8 text-[#21AC96] text-[9px] font-bold rounded-full border border-[#21AC96]/15">
                            <Tag className="w-2 h-2" />
                            {tag}
                        </span>
                    ))}
                    {prospect.tags.length > 2 && (
                        <span className="text-[9px] text-gray-400 font-bold">+{prospect.tags.length - 2}</span>
                    )}
                </div>
            )}
        </div>
    )
}

/* ─── Kanban Column ──────────────────────────────────────────────────── */
function KanbanColumn({
    column,
    prospects,
    customFields,
    draggingId,
    onDragStart,
    onDrop,
    onDragOver,
    onDeleteColumn
}: {
    column: Column
    prospects: Prospect[]
    customFields: CustomField[]
    draggingId: string | null
    onDragStart: (e: React.DragEvent, id: string) => void
    onDrop: (e: React.DragEvent, columnName: string) => void
    onDragOver: (e: React.DragEvent) => void
    onDeleteColumn: (id: string) => void
}) {
    const [isOver, setIsOver] = useState(false)

    return (
        <div className="flex flex-col min-w-[280px] max-w-[300px] w-full flex-shrink-0">
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
                    <h3 className="font-black text-[13px] text-gray-900">{column.name}</h3>
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500">
                        {prospects.length}
                    </span>
                </div>
                {!column.isDefault && (
                    <button
                        onClick={() => onDeleteColumn(column.id)}
                        className="p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                        title="Eliminar columna"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Drop zone */}
            <div
                onDragOver={(e) => { onDragOver(e); setIsOver(true) }}
                onDragLeave={() => setIsOver(false)}
                onDrop={(e) => { onDrop(e, column.name); setIsOver(false) }}
                className={cn(
                    'flex-1 min-h-[400px] rounded-[1.25rem] p-3 space-y-3 transition-all duration-200',
                    isOver
                        ? 'bg-gray-100 border-2 border-dashed ring-2 ring-offset-1'
                        : 'bg-gray-50/80 border border-gray-100'
                )}
                style={isOver ? { borderColor: column.color, '--tw-ring-color': column.color + '40' } as any : {}}
            >
                {prospects.map(p => (
                    <ProspectCard
                        key={p.id}
                        prospect={p}
                        customFields={customFields}
                        onDragStart={onDragStart}
                        isDragging={draggingId === p.id}
                    />
                ))}

                {prospects.length === 0 && !isOver && (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-300">
                        <Users className="w-8 h-8 mb-2" />
                        <p className="text-[11px] font-bold">Sin prospectos</p>
                    </div>
                )}

                {isOver && (
                    <div
                        className="h-16 rounded-xl border-2 border-dashed flex items-center justify-center"
                        style={{ borderColor: column.color }}
                    >
                        <p className="text-[11px] font-bold" style={{ color: column.color }}>Soltar aquí</p>
                    </div>
                )}
            </div>
        </div>
    )
}

/* ─── New Column Modal ───────────────────────────────────────────────── */
function NewColumnModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, color: string) => Promise<void> }) {
    const [name, setName] = useState('')
    const [color, setColor] = useState(COLUMN_COLORS[0])
    const [loading, setLoading] = useState(false)

    const handleCreate = async () => {
        if (!name.trim()) return
        setLoading(true)
        await onCreate(name.trim(), color)
        setLoading(false)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-black text-gray-900 text-[16px]">Nueva Columna</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Nombre de la columna</label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            placeholder="Ej: Cerrado, Calificado..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/30 focus:border-[#21AC96] transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {COLUMN_COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={cn('w-8 h-8 rounded-xl transition-all', color === c ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105')}
                                    style={{ backgroundColor: c, '--tw-ring-color': c } as any}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 mt-6">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!name.trim() || loading}
                        className="flex-1 py-2.5 rounded-2xl bg-[#21AC96] text-white font-bold text-sm hover:bg-[#1b8c7a] transition-all shadow-md shadow-[#21AC96]/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Crear
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ─── Main Board ─────────────────────────────────────────────────────── */
export function ProspectsKanbanBoard({
    initialColumns,
    initialProspects,
    agents,
    customFields
}: ProspectsKanbanBoardProps) {
    const [columns, setColumns] = useState<Column[]>(initialColumns)
    const [prospects, setProspects] = useState<Prospect[]>(initialProspects)
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [selectedAgent, setSelectedAgent] = useState<string>('all')
    const [showNewColumnModal, setShowNewColumnModal] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    /* ── Agent filter ───────────────────────────────────────────────── */
    const filteredProspects = selectedAgent === 'all'
        ? prospects
        : prospects.filter(p => p.agentId === selectedAgent)

    /* ── Group by column ────────────────────────────────────────────── */
    const byColumn = columns.reduce((acc, col) => {
        acc[col.name] = filteredProspects.filter(p => p.prospectStatus === col.name)
        return acc
    }, {} as Record<string, Prospect[]>)

    /* ── Drag handlers ──────────────────────────────────────────────── */
    const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
        e.dataTransfer.effectAllowed = 'move'
        setDraggingId(id)
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }, [])

    const handleDrop = useCallback(async (e: React.DragEvent, targetColumn: string) => {
        e.preventDefault()
        if (!draggingId) return

        const prospect = prospects.find(p => p.id === draggingId)
        if (!prospect || prospect.prospectStatus === targetColumn) {
            setDraggingId(null)
            return
        }

        // Optimistic update
        setProspects(prev => prev.map(p =>
            p.id === draggingId ? { ...p, prospectStatus: targetColumn } : p
        ))
        setDraggingId(null)

        // Persist
        setIsUpdating(true)
        const res = await updateProspectStatus(draggingId, targetColumn)
        setIsUpdating(false)

        if (!res.success) {
            // Rollback
            setProspects(prev => prev.map(p =>
                p.id === draggingId ? { ...p, prospectStatus: prospect.prospectStatus } : p
            ))
            toast.error('Error al mover el prospecto')
        } else {
            toast.success(`"${prospect.name}" movido a ${targetColumn}`)
        }
    }, [draggingId, prospects])

    /* ── Column management ──────────────────────────────────────────── */
    const handleCreateColumn = async (name: string, color: string) => {
        const res = await createProspectColumn(name, color)
        if (res.success && res.column) {
            setColumns(prev => [...prev, res.column as Column])
            toast.success(`Columna "${name}" creada`)
        } else {
            toast.error('Error al crear columna')
        }
    }

    const handleDeleteColumn = async (id: string) => {
        const col = columns.find(c => c.id === id)
        if (!col) return
        if (!confirm(`¿Eliminar la columna "${col.name}"? Los prospectos se moverán a "Nuevo".`)) return

        const res = await deleteProspectColumn(id)
        if (res.success) {
            setColumns(prev => prev.filter(c => c.id !== id))
            setProspects(prev => prev.map(p =>
                p.prospectStatus === col.name ? { ...p, prospectStatus: 'Nuevo' } : p
            ))
            toast.success('Columna eliminada')
        } else {
            toast.error((res as any).error || 'Error al eliminar columna')
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* ── Toolbar ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                {/* Agent filter */}
                <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-1 flex-wrap">
                    <button
                        onClick={() => setSelectedAgent('all')}
                        className={cn(
                            'px-4 py-2 rounded-xl text-[12px] font-black transition-all',
                            selectedAgent === 'all'
                                ? 'bg-[#21AC96] text-white shadow-sm shadow-[#21AC96]/20'
                                : 'text-gray-500 hover:text-gray-800'
                        )}
                    >
                        Todos
                    </button>
                    {agents.map(agent => (
                        <button
                            key={agent.id}
                            onClick={() => setSelectedAgent(agent.id)}
                            className={cn(
                                'px-4 py-2 rounded-xl text-[12px] font-black transition-all',
                                selectedAgent === agent.id
                                    ? 'bg-[#21AC96] text-white shadow-sm shadow-[#21AC96]/20'
                                    : 'text-gray-500 hover:text-gray-800'
                            )}
                        >
                            {agent.name}
                        </button>
                    ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 ml-auto">
                    {isUpdating && (
                        <div className="flex items-center gap-2 text-[12px] text-gray-500 font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#21AC96]" />
                            Guardando...
                        </div>
                    )}
                    <div className="text-[12px] text-gray-500 font-bold">
                        {filteredProspects.length} prospecto{filteredProspects.length !== 1 ? 's' : ''}
                    </div>
                    <button
                        onClick={() => setShowNewColumnModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-100 rounded-2xl text-[12px] font-black text-gray-600 hover:border-[#21AC96]/30 hover:text-[#21AC96] transition-all shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Nueva columna
                    </button>
                </div>
            </div>

            {/* ── Board ────────────────────────────────────────────── */}
            <div
                className="flex gap-4 overflow-x-auto pb-6 flex-1"
                onDragEnd={() => setDraggingId(null)}
            >
                {columns.map(col => (
                    <KanbanColumn
                        key={col.id}
                        column={col}
                        prospects={byColumn[col.name] || []}
                        customFields={customFields}
                        draggingId={draggingId}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDeleteColumn={handleDeleteColumn}
                    />
                ))}

                {/* Add column shortcut */}
                <button
                    onClick={() => setShowNewColumnModal(true)}
                    className="flex-shrink-0 w-[200px] min-h-[200px] rounded-[1.25rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-300 hover:border-[#21AC96]/40 hover:text-[#21AC96]/60 transition-all group"
                >
                    <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-black">Agregar columna</span>
                </button>
            </div>

            {/* ── Modal ────────────────────────────────────────────── */}
            {showNewColumnModal && (
                <NewColumnModal
                    onClose={() => setShowNewColumnModal(false)}
                    onCreate={handleCreateColumn}
                />
            )}
        </div>
    )
}
