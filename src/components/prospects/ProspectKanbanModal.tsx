'use client'

import { useEffect } from 'react'
import {
    X, User, Phone, Mail, Bot, MessageSquare,
    Tag, Database, Wifi, Hash, ToggleLeft, Calendar,
    ListFilter
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

/* ─── Types ──────────────────────────────────────────────────────────── */
interface CustomField {
    id: string
    key: string
    label: string
    type: string
    agentId: string
}

interface KanbanProspect {
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
    channelType?: string | null
    createdAt: Date | string
}

interface ProspectKanbanModalProps {
    prospect: KanbanProspect | null
    customFields: CustomField[]
    statusColor: string
    onClose: () => void
}

/* ─── Field type icon ────────────────────────────────────────────────── */
function FieldTypeIcon({ type }: { type: string }) {
    switch (type) {
        case 'NUMBER': return <Hash className="w-3 h-3" />
        case 'BOOLEAN': return <ToggleLeft className="w-3 h-3" />
        case 'DATE': return <Calendar className="w-3 h-3" />
        case 'SELECT': return <ListFilter className="w-3 h-3" />
        default: return <Tag className="w-3 h-3" />
    }
}

/* ─── Info row ───────────────────────────────────────────────────────── */
function InfoRow({ icon, label, value, accent }: {
    icon: React.ReactNode
    label: string
    value: React.ReactNode
    accent?: boolean
}) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
            <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                accent ? 'bg-[#21AC96]/10 text-[#21AC96]' : 'bg-gray-100 text-gray-400'
            )}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
                <div className="text-[13px] font-bold text-gray-900 break-words">{value || <span className="text-gray-300 font-medium italic">Sin datos</span>}</div>
            </div>
        </div>
    )
}

/* ─── Main modal ─────────────────────────────────────────────────────── */
export function ProspectKanbanModal({ prospect, customFields, statusColor, onClose }: ProspectKanbanModalProps) {
    useEffect(() => {
        if (prospect) document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = 'unset' }
    }, [prospect])

    if (!prospect) return null

    const initials = prospect.name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2) || '?'

    // Custom fields that actually have a value
    const filledFields = customFields.filter(f =>
        prospect.customData?.[f.key] !== undefined &&
        prospect.customData?.[f.key] !== null &&
        prospect.customData?.[f.key] !== ''
    )

    const channelLabel: Record<string, string> = {
        WHATSAPP: 'WhatsApp',
        WEBCHAT: 'Web Chat',
        INSTAGRAM: 'Instagram',
        MESSENGER: 'Messenger',
        TELEGRAM: 'Telegram',
        SMS: 'SMS',
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[92vh]">

                {/* ── Header dark ───────────────────────────────── */}
                <div className="bg-gray-900 px-6 pt-6 pb-8 relative overflow-hidden">
                    {/* decorative blob */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20" style={{ backgroundColor: statusColor }} />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-4 relative z-10">
                        {/* Avatar */}
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0"
                            style={{ backgroundColor: statusColor + '33', border: `2px solid ${statusColor}60` }}
                        >
                            <span style={{ color: statusColor }}>{initials}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h2 className="text-white font-black text-[17px] leading-tight truncate">{prospect.name}</h2>
                            {/* Status badge */}
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                                <span className="text-[11px] font-bold" style={{ color: statusColor }}>
                                    {prospect.prospectStatus}
                                </span>
                            </div>
                        </div>

                        {/* Lead score */}
                        {prospect.leadScore && (
                            <div className="shrink-0 text-center">
                                <div className="text-2xl font-black text-white">{prospect.leadScore}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-white/40">Score</div>
                            </div>
                        )}
                    </div>

                    {/* Captado desde */}
                    <div className="mt-4 text-[10px] text-white/30 font-bold relative z-10">
                        Captado el {format(new Date(prospect.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                    </div>
                </div>

                {/* ── Scrollable content ─────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">

                    {/* Contact info */}
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 mt-1">Contacto</p>
                    <div className="bg-gray-50 rounded-2xl px-4">
                        <InfoRow
                            icon={<Phone className="w-4 h-4" />}
                            label="Teléfono"
                            value={prospect.phone}
                        />
                        <InfoRow
                            icon={<Mail className="w-4 h-4" />}
                            label="Correo"
                            value={prospect.email}
                        />
                        <InfoRow
                            icon={<Wifi className="w-4 h-4" />}
                            label="Canal"
                            value={
                                prospect.channelType
                                    ? <span className="px-2 py-0.5 bg-gray-900 text-white rounded-lg text-[11px] font-black">
                                        {channelLabel[prospect.channelType] ?? prospect.channelType}
                                    </span>
                                    : null
                            }
                        />
                    </div>

                    {/* Agent */}
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 mt-4">Agente</p>
                    <div className="bg-gray-50 rounded-2xl px-4">
                        <InfoRow
                            icon={<Bot className="w-4 h-4" />}
                            label="Agente asignado"
                            value={
                                prospect.agentName
                                    ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[12px] font-black border border-indigo-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        {prospect.agentName}
                                    </span>
                                    : null
                            }
                            accent
                        />
                    </div>

                    {/* Intent / last message */}
                    {prospect.lastMessage && (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 mt-4">Intención del usuario</p>
                            <div className="bg-[#21AC96]/5 border border-[#21AC96]/15 rounded-2xl px-4 py-3">
                                <div className="flex items-start gap-2">
                                    <MessageSquare className="w-4 h-4 text-[#21AC96] shrink-0 mt-0.5" />
                                    <p className="text-[13px] text-gray-700 font-medium leading-relaxed">
                                        "{prospect.lastMessage}"
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Tags */}
                    {prospect.tags.length > 0 && (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 mt-4">Etiquetas</p>
                            <div className="flex flex-wrap gap-2">
                                {prospect.tags.map((tag, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-bold rounded-full">
                                        <Tag className="w-3 h-3" />
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Custom fields */}
                    {filledFields.length > 0 && (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 mt-4">Campos personalizados</p>
                            <div className="bg-gray-50 rounded-2xl px-4 divide-y divide-gray-100">
                                {filledFields.map(f => (
                                    <div key={f.key} className="flex items-center justify-between gap-4 py-3">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <FieldTypeIcon type={f.type} />
                                            <span className="text-[11px] font-black uppercase tracking-widest">{f.label}</span>
                                        </div>
                                        <span className="text-[13px] font-bold text-gray-900 text-right max-w-[55%] truncate">
                                            {f.type === 'BOOLEAN'
                                                ? (prospect.customData[f.key] ? '✓ Sí' : '✗ No')
                                                : String(prospect.customData[f.key])
                                            }
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Summary / AI bio */}
                    {prospect.summary && (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 mt-4">Resumen IA</p>
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                                <p className="text-[12px] text-amber-800 font-medium leading-relaxed italic">
                                    {prospect.summary}
                                </p>
                            </div>
                        </>
                    )}

                    <div className="h-4" />
                </div>

                {/* ── Footer ────────────────────────────────────── */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}
