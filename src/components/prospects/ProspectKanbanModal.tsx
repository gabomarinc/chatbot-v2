'use client'

import { useEffect } from 'react'
import {
    X, Phone, Mail, Bot, Tag, Database,
    Hash, ToggleLeft, Calendar, ListFilter,
    Wifi, Brain, Clock, FileText, User, MessageSquare,
    Sparkles, Activity
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

/* ─── Types ──────────────────────────────────────────────────────────── */
interface CustomField {
    id: string; key: string; label: string; type: string; agentId: string
}

interface ProspectActivity {
    id: string
    type: string
    content: string
    createdAt: Date | string
    userName: string | null
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
    aiInsights: Record<string, any> | null
    intent: string | null
    channelType: string | null
    agentId: string | null
    agentName: string | null
    createdAt: Date | string
    activities: ProspectActivity[]
}

interface ProspectKanbanModalProps {
    prospect: KanbanProspect | null
    customFields: CustomField[]
    statusColor: string
    onClose: () => void
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
const CHANNEL_LABELS: Record<string, string> = {
    WHATSAPP: 'WhatsApp', WEBCHAT: 'Web Chat', INSTAGRAM: 'Instagram',
    MESSENGER: 'Messenger', TELEGRAM: 'Telegram', SMS: 'SMS',
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
    NOTE: <FileText className="w-3.5 h-3.5" />,
    SYSTEM: <Activity className="w-3.5 h-3.5" />,
    CHAT: <MessageSquare className="w-3.5 h-3.5" />,
    AI: <Sparkles className="w-3.5 h-3.5" />,
}

const ACTIVITY_COLORS: Record<string, string> = {
    NOTE: 'bg-blue-50 text-blue-500 border-blue-100',
    SYSTEM: 'bg-gray-100 text-gray-400 border-gray-200',
    CHAT: 'bg-[#21AC96]/10 text-[#21AC96] border-[#21AC96]/20',
    AI: 'bg-amber-50 text-amber-500 border-amber-100',
}

function FieldTypeIcon({ type }: { type: string }) {
    switch (type) {
        case 'NUMBER': return <Hash className="w-3.5 h-3.5" />
        case 'BOOLEAN': return <ToggleLeft className="w-3.5 h-3.5" />
        case 'DATE': return <Calendar className="w-3.5 h-3.5" />
        case 'SELECT': return <ListFilter className="w-3.5 h-3.5" />
        default: return <Tag className="w-3.5 h-3.5" />
    }
}

/* ─── Section wrapper ────────────────────────────────────────────────── */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <div className="text-gray-300">{icon}</div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</p>
            </div>
            {children}
        </div>
    )
}

/* ─── Contact info row ───────────────────────────────────────────────── */
function ContactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 leading-none mb-0.5">{label}</p>
                <div className="text-[13px] font-bold text-gray-900 truncate">
                    {value ?? <span className="text-gray-300 font-normal italic text-[12px]">Sin datos</span>}
                </div>
            </div>
        </div>
    )
}

/* ─── Main modal ─────────────────────────────────────────────────────── */
export function ProspectKanbanModal({ prospect, customFields, statusColor, onClose }: ProspectKanbanModalProps) {
    useEffect(() => {
        if (prospect) {
            document.body.style.overflow = 'hidden'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [prospect])

    if (!prospect) return null

    const initials = prospect.name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2) || '?'

    const filledFields = customFields.filter(f =>
        prospect.customData?.[f.key] !== undefined &&
        prospect.customData?.[f.key] !== null &&
        prospect.customData?.[f.key] !== ''
    )

    // Extract from aiInsights
    const insights = prospect.aiInsights
    const interests = insights?.interests as string[] | undefined
    const sentiment = insights?.sentiment as string | undefined
    const urgency = insights?.urgency as string | undefined

    const sentimentMap: Record<string, { label: string; color: string }> = {
        happy: { label: 'Positivo', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
        neutral: { label: 'Neutral', color: 'text-gray-500 bg-gray-50 border-gray-200' },
        sad: { label: 'Negativo', color: 'text-red-500 bg-red-50 border-red-100' },
    }

    const urgencyMap: Record<string, { label: string; color: string }> = {
        high: { label: 'Alta', color: 'text-red-600 bg-red-50 border-red-100' },
        medium: { label: 'Media', color: 'text-amber-600 bg-amber-50 border-amber-100' },
        low: { label: 'Baja', color: 'text-gray-500 bg-gray-50 border-gray-200' },
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal — wider, taller */}
            <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[92vh]">

                {/* ── Dark header ─────────────────────────── */}
                <div className="bg-gray-900 px-7 pt-6 pb-8 relative overflow-hidden shrink-0">
                    <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-15" style={{ backgroundColor: statusColor }} />
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-start gap-5 relative z-10">
                        {/* Avatar */}
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 mt-0.5"
                            style={{ backgroundColor: statusColor + '25', border: `2px solid ${statusColor}50` }}
                        >
                            <span style={{ color: statusColor }}>{initials}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h2 className="text-white font-black text-xl leading-tight truncate">{prospect.name}</h2>

                            {/* Status + channel */}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                                    <span className="text-[12px] font-bold" style={{ color: statusColor }}>
                                        {prospect.prospectStatus}
                                    </span>
                                </div>
                                {prospect.channelType && (
                                    <div className="flex items-center gap-1 px-2.5 py-0.5 bg-white/10 rounded-full">
                                        <Wifi className="w-2.5 h-2.5 text-white/50" />
                                        <span className="text-[10px] font-bold text-white/60">
                                            {CHANNEL_LABELS[prospect.channelType] ?? prospect.channelType}
                                        </span>
                                    </div>
                                )}
                                {prospect.agentName && (
                                    <div className="flex items-center gap-1 px-2.5 py-0.5 bg-white/10 rounded-full">
                                        <Bot className="w-2.5 h-2.5 text-white/50" />
                                        <span className="text-[10px] font-bold text-white/60">{prospect.agentName}</span>
                                    </div>
                                )}
                            </div>

                            <p className="text-[11px] text-white/25 font-medium mt-2">
                                Captado el {format(new Date(prospect.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                            </p>
                        </div>

                        {/* Lead score */}
                        {prospect.leadScore != null && (
                            <div className="shrink-0 text-center bg-white/5 rounded-2xl px-4 py-3">
                                <div className="text-3xl font-black text-white">{prospect.leadScore}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-0.5">Score</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Scrollable body ──────────────────────── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Contact data */}
                    <Section title="Datos de contacto" icon={<User className="w-4 h-4" />}>
                        <div className="bg-gray-50 rounded-2xl px-4">
                            <ContactRow icon={<Phone className="w-3.5 h-3.5" />} label="Teléfono" value={prospect.phone} />
                            <ContactRow icon={<Mail className="w-3.5 h-3.5" />} label="Correo electrónico" value={prospect.email} />
                            <ContactRow
                                icon={<Wifi className="w-3.5 h-3.5" />}
                                label="Canal de captación"
                                value={
                                    prospect.channelType
                                        ? <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-900 text-white rounded-lg text-[11px] font-black">
                                            {CHANNEL_LABELS[prospect.channelType] ?? prospect.channelType}
                                        </span>
                                        : null
                                }
                            />
                        </div>
                    </Section>

                    {/* Intent from first message */}
                    {prospect.intent && (
                        <Section title="Intención inicial" icon={<MessageSquare className="w-4 h-4" />}>
                            <div className="flex items-start gap-3 bg-[#21AC96]/5 border border-[#21AC96]/15 rounded-2xl px-4 py-3.5">
                                <MessageSquare className="w-4 h-4 text-[#21AC96] shrink-0 mt-0.5" />
                                <p className="text-[13px] text-gray-700 font-medium leading-relaxed">
                                    "{prospect.intent}"
                                </p>
                            </div>
                        </Section>
                    )}

                    {/* AI Summary */}
                    {prospect.summary && (
                        <Section title="Resumen IA" icon={<Brain className="w-4 h-4" />}>
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5">
                                <p className="text-[13px] text-amber-800 font-medium leading-relaxed italic">
                                    {prospect.summary}
                                </p>
                            </div>
                        </Section>
                    )}

                    {/* AI Insights chips */}
                    {(interests?.length || sentiment || urgency) ? (
                        <Section title="Inteligencia AI" icon={<Sparkles className="w-4 h-4" />}>
                            <div className="flex flex-wrap gap-2">
                                {sentiment && sentimentMap[sentiment] && (
                                    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border', sentimentMap[sentiment].color)}>
                                        Sentimiento: {sentimentMap[sentiment].label}
                                    </span>
                                )}
                                {urgency && urgencyMap[urgency] && (
                                    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border', urgencyMap[urgency].color)}>
                                        Urgencia: {urgencyMap[urgency].label}
                                    </span>
                                )}
                                {interests?.map((interest, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-[11px] font-bold">
                                        {interest}
                                    </span>
                                ))}
                            </div>
                        </Section>
                    ) : null}

                    {/* Custom fields */}
                    {filledFields.length > 0 && (
                        <Section title="Campos personalizados" icon={<Database className="w-4 h-4" />}>
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
                        </Section>
                    )}

                    {/* Tags */}
                    {prospect.tags.length > 0 && (
                        <Section title="Etiquetas" icon={<Tag className="w-4 h-4" />}>
                            <div className="flex flex-wrap gap-2">
                                {prospect.tags.map((tag, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-[11px] font-bold rounded-full border border-gray-200">
                                        <Tag className="w-3 h-3" />{tag}
                                    </span>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Activity / Notes */}
                    <Section title="Actividad y notas" icon={<Clock className="w-4 h-4" />}>
                        {prospect.activities.length > 0 ? (
                            <div className="space-y-2">
                                {prospect.activities.map(activity => (
                                    <div key={activity.id} className="flex items-start gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                                        <div className={cn(
                                            'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border',
                                            ACTIVITY_COLORS[activity.type] ?? 'bg-gray-100 text-gray-400 border-gray-200'
                                        )}>
                                            {ACTIVITY_ICONS[activity.type] ?? <Activity className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] text-gray-700 font-medium leading-snug">{activity.content}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {activity.userName && (
                                                    <span className="text-[10px] font-bold text-gray-400">{activity.userName}</span>
                                                )}
                                                <span className="text-[10px] text-gray-300">·</span>
                                                <span className="text-[10px] text-gray-400">
                                                    {formatDistanceToNow(new Date(activity.createdAt), { locale: es, addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-2xl px-4 py-6 text-center border border-gray-100">
                                <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                <p className="text-[12px] text-gray-400 font-medium">Sin actividad registrada</p>
                            </div>
                        )}
                    </Section>

                    <div className="h-2" />
                </div>

                {/* ── Footer ──────────────────────────────── */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
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
