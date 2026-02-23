'use client'

import { useState, useRef, useEffect } from 'react'
import { Target, Plus, Webhook, Zap, FileText, Trash2, ToggleLeft, ToggleRight, ChevronDown, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface CustomField {
    id: string
    key: string
    label: string
    type: string
}

interface Intent {
    id: string
    name: string
    description: string | null
    trigger: string
    enabled: boolean
    actionType: string
    actionUrl: string | null
    payloadJson: any
    triggerCount: number
    lastTriggered: Date | null
    createdAt: Date
}

interface IntentsClientProps {
    agentId: string
    intents: Intent[]
    customFields: CustomField[]
}

export function IntentsClient({ agentId, intents, customFields }: IntentsClientProps) {
    const [isWizardOpen, setIsWizardOpen] = useState(false)
    const [editingIntent, setEditingIntent] = useState<Intent | null>(null)
    const router = useRouter()

    const handleCreate = () => {
        setEditingIntent(null)
        setIsWizardOpen(true)
    }

    const handleEdit = (intent: Intent) => {
        setEditingIntent(intent)
        setIsWizardOpen(true)
    }

    const handleToggle = async (intentId: string, currentState: boolean) => {
        try {
            const response = await fetch(`/api/agents/${agentId}/intents/${intentId}/toggle`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !currentState })
            })
            if (!response.ok) throw new Error()
            toast.success(currentState ? 'Intención desactivada' : 'Intención activada')
            router.refresh()
        } catch {
            toast.error('Error al cambiar estado')
        }
    }

    const handleDelete = async (intentId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta intención?')) return
        try {
            const response = await fetch(`/api/agents/${agentId}/intents/${intentId}`, { method: 'DELETE' })
            if (!response.ok) throw new Error()
            toast.success('Intención eliminada')
            router.refresh()
        } catch {
            toast.error('Error al eliminar')
        }
    }

    const getActionBadge = (actionType: string) => {
        switch (actionType) {
            case 'WEBHOOK': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600"><Webhook className="w-3 h-3" />Webhook</span>
            case 'INTERNAL': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#21AC96]/10 text-[#21AC96]"><Zap className="w-3 h-3" />Interno</span>
            case 'FORM': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-600"><FileText className="w-3 h-3" />Formulario</span>
            default: return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500"><Target className="w-3 h-3" />Otro</span>
        }
    }

    // ── Empty state ──────────────────────────────────────────────────────────
    if (intents.length === 0 && !isWizardOpen) {
        return (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm py-24 px-6 flex flex-col items-center text-center">
                <div className="inline-flex items-center justify-center w-[72px] h-[72px] bg-[#21AC96]/10 rounded-[1.25rem] mb-6 text-[#21AC96]">
                    <Target className="w-9 h-9" />
                </div>
                <h3 className="text-[20px] font-black text-gray-900 mb-3">Crear una intención</h3>
                <p className="text-[13px] font-semibold text-gray-500 mb-2">¿Qué son las intenciones?</p>
                <p className="text-[13px] text-gray-400 max-w-[480px] mb-6 leading-relaxed">
                    Las intenciones son acciones automáticas que tu agente puede realizar cuando detecta ciertas palabras clave en las conversaciones de los usuarios.
                </p>
                <div className="text-[12px] bg-gray-50 px-5 py-4 rounded-2xl border border-gray-100 text-gray-500 max-w-[520px] mb-10">
                    <strong className="text-gray-700">Ejemplo:</strong> Si un usuario escribe "quiero agendar una visita", tu agente puede llamar a un webhook para crear la cita.
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-8 py-3.5 bg-[#21AC96] text-white rounded-2xl hover:bg-[#1b8c7a] transition-all font-bold text-sm cursor-pointer shadow-lg shadow-[#21AC96]/20 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    Registrar primera intención
                </button>
            </div>
        )
    }

    // ── List view ────────────────────────────────────────────────────────────
    if (!isWizardOpen) {
        return (
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-[18px] font-black text-gray-900">Intenciones</h2>
                        <p className="text-[13px] text-gray-400 mt-0.5">Gestiona las acciones automáticas de tu agente</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#21AC96] text-white rounded-2xl hover:bg-[#1b8c7a] transition-all font-bold text-sm cursor-pointer shadow-md shadow-[#21AC96]/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva intención
                    </button>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                    {intents.map((intent) => (
                        <div
                            key={intent.id}
                            className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-5 hover:border-[#21AC96]/30 hover:shadow-md transition-all group cursor-pointer"
                            onClick={() => handleEdit(intent)}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                        <h3 className="text-[15px] font-black text-gray-900">{intent.name}</h3>
                                        {getActionBadge(intent.actionType)}
                                        {!intent.enabled && (
                                            <span className="px-2.5 py-1 bg-gray-100 text-gray-400 rounded-full text-xs font-bold">
                                                DESACTIVADA
                                            </span>
                                        )}
                                    </div>
                                    {intent.description && (
                                        <p className="text-[13px] text-gray-400 leading-relaxed truncate">{intent.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 text-[11px] text-gray-300 mt-2 font-medium">
                                        <span>Activaciones: {intent.triggerCount}</span>
                                        {intent.lastTriggered && (
                                            <span>Última: {new Date(intent.lastTriggered).toLocaleDateString('es-ES')}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => handleToggle(intent.id, intent.enabled)}
                                        className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
                                        title={intent.enabled ? 'Desactivar' : 'Activar'}
                                    >
                                        {intent.enabled
                                            ? <ToggleRight className="w-5 h-5 text-[#21AC96]" />
                                            : <ToggleLeft className="w-5 h-5 text-gray-300" />
                                        }
                                    </button>
                                    <button
                                        onClick={() => handleDelete(intent.id)}
                                        className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // ── Wizard ───────────────────────────────────────────────────────────────
    return (
        <IntentWizard
            agentId={agentId}
            intent={editingIntent}
            customFields={customFields}
            onClose={() => { setIsWizardOpen(false); router.refresh() }}
        />
    )
}

// ────────────────────────────────────────────────────────────────────────────
// IntentWizard
// ────────────────────────────────────────────────────────────────────────────
function IntentWizard({ agentId, intent, customFields, onClose }: {
    agentId: string
    intent: Intent | null
    customFields: CustomField[]
    onClose: () => void
}) {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const instructionsTextareaRef = useRef<HTMLTextAreaElement>(null)
    const [showVariablesMenu, setShowVariablesMenu] = useState(false)

    const steps = [
        { title: 'Detalles generales' },
        { title: 'Configurar acción' },
        { title: 'Datos de salida' },
    ]

    // Parse existing payloadJson
    let defaultPayload = { collectedFields: [] as any[], instructions: '', outputMapping: [] as any[] }
    if (intent?.payloadJson) {
        try { defaultPayload = { ...defaultPayload, ...(intent.payloadJson as any) } } catch { }
    }

    const [formData, setFormData] = useState({
        name: intent?.name || '',
        description: intent?.description || '',
        trigger: intent?.trigger || '',
        actionType: intent?.actionType || 'INTERNAL',
        actionUrl: intent?.actionUrl || '',
        enabled: intent?.enabled ?? true,
        payloadJson: defaultPayload
    })

    const canProceed = () => {
        if (currentStep === 0) return formData.name.trim().length > 0
        return true
    }

    const handleNext = () => { if (canProceed()) setCurrentStep(s => s + 1) }
    const handlePrevious = () => setCurrentStep(s => s - 1)

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            const method = intent ? 'PUT' : 'POST'
            const url = intent
                ? `/api/agents/${agentId}/intents/${intent.id}`
                : `/api/agents/${agentId}/intents`

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            if (!res.ok) throw new Error()
            toast.success(intent ? 'Intención actualizada' : 'Intención creada')
            onClose()
        } catch {
            toast.error('Error al guardar')
        } finally {
            setIsSubmitting(false)
        }
    }

    // ── Collected fields helpers
    const addCollectedField = () => setFormData(prev => ({
        ...prev,
        payloadJson: { ...prev.payloadJson, collectedFields: [...prev.payloadJson.collectedFields, { name: '', description: '', type: 'Texto' }] }
    }))
    const updateCollectedField = (idx: number, key: string, value: string) => setFormData(prev => {
        const fields = [...prev.payloadJson.collectedFields]
        fields[idx] = { ...fields[idx], [key]: value }
        return { ...prev, payloadJson: { ...prev.payloadJson, collectedFields: fields } }
    })
    const removeCollectedField = (idx: number) => setFormData(prev => ({
        ...prev,
        payloadJson: { ...prev.payloadJson, collectedFields: prev.payloadJson.collectedFields.filter((_: any, i: number) => i !== idx) }
    }))

    // ── Output mapping helpers
    const addOutputMapping = () => setFormData(prev => ({
        ...prev,
        payloadJson: { ...prev.payloadJson, outputMapping: [...prev.payloadJson.outputMapping, { customFieldId: '', valueSource: '' }] }
    }))
    const updateOutputMapping = (idx: number, key: string, value: string) => setFormData(prev => {
        const maps = [...prev.payloadJson.outputMapping]
        maps[idx] = { ...maps[idx], [key]: value }
        return { ...prev, payloadJson: { ...prev.payloadJson, outputMapping: maps } }
    })
    const removeOutputMapping = (idx: number) => setFormData(prev => ({
        ...prev,
        payloadJson: { ...prev.payloadJson, outputMapping: prev.payloadJson.outputMapping.filter((_: any, i: number) => i !== idx) }
    }))

    // ── Variable insertion
    const insertVariable = (name: string) => {
        const ta = instructionsTextareaRef.current
        if (!ta) return
        const start = ta.selectionStart, end = ta.selectionEnd
        let prefix = formData.payloadJson.instructions.substring(0, start)
        if (prefix.endsWith('{{')) prefix = prefix.slice(0, -2)
        else if (prefix.endsWith('@')) prefix = prefix.slice(0, -1)
        const newText = prefix + `{{${name}}}` + formData.payloadJson.instructions.substring(end)
        setFormData(prev => ({ ...prev, payloadJson: { ...prev.payloadJson, instructions: newText } }))
        setShowVariablesMenu(false)
        setTimeout(() => { ta.focus(); const c = prefix.length + name.length + 4; ta.setSelectionRange(c, c) }, 10)
    }

    const handleTextareaKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const val = e.currentTarget.value, cursor = e.currentTarget.selectionEnd
        const prev2 = val.substring(Math.max(0, cursor - 2), cursor)
        const prev1 = val.substring(Math.max(0, cursor - 1), cursor)
        if (prev2 === '{{' || prev1 === '@') setShowVariablesMenu(true)
        else if (e.key === 'Escape') setShowVariablesMenu(false)
    }

    // ── Step render
    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Nombre de la intención</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/40 focus:border-[#21AC96] transition-all"
                                placeholder="Ej: Perfil laboral"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-bold text-gray-700">Cuándo usar esta intención <span className="font-normal text-gray-400">(opcional)</span></label>
                                <span className="text-xs text-gray-300">{formData.description.length}/512</span>
                            </div>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value.substring(0, 512) })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/40 focus:border-[#21AC96] transition-all min-h-[120px] resize-none"
                                placeholder="Ej: Pregunta cual es el perfil laboral del prospecto una vez ya tengas su ingreso."
                            />
                        </div>
                    </div>
                )
            case 1:
                return (
                    <div className="space-y-8">
                        {/* Collected fields */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Recopilar datos del cliente <span className="font-normal text-gray-400">(opcional)</span></label>
                            <p className="text-xs text-gray-400 mb-4">Indica qué información debe pedirle el agente al usuario durante esta intención.</p>
                            <div className="space-y-3">
                                {formData.payloadJson.collectedFields.map((field: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <GripVertical className="w-4 h-4 text-gray-200 shrink-0" />
                                        <input
                                            type="text"
                                            value={field.name}
                                            onChange={(e) => updateCollectedField(idx, 'name', e.target.value)}
                                            placeholder="Nombre del campo"
                                            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/40 focus:border-[#21AC96]"
                                        />
                                        <input
                                            type="text"
                                            value={field.description}
                                            onChange={(e) => updateCollectedField(idx, 'description', e.target.value)}
                                            placeholder="Descripción (opcional)"
                                            className="flex-[1.5] px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/40 focus:border-[#21AC96]"
                                        />
                                        <div className="relative">
                                            <select
                                                value={field.type}
                                                onChange={(e) => updateCollectedField(idx, 'type', e.target.value)}
                                                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/40 focus:border-[#21AC96] bg-white appearance-none pr-7"
                                            >
                                                <option>Texto</option>
                                                <option>Número</option>
                                                <option value="Booleano">Sí/No</option>
                                                <option>Fecha</option>
                                            </select>
                                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                        <button onClick={() => removeCollectedField(idx)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={addCollectedField} className="mt-3 flex items-center gap-1.5 text-sm text-[#21AC96] font-bold hover:text-[#198d7a] transition-colors">
                                <Plus className="w-4 h-4" />
                                Agregar campo
                            </button>
                        </div>

                        {/* Instructions */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Instrucciones del agente</label>
                            <p className="text-xs text-gray-400 mb-3">Escribe <code className="bg-gray-100 px-1 rounded text-[11px]">@</code> o <code className="bg-gray-100 px-1 rounded text-[11px]">{'{{'}</code> para insertar variables de los campos de arriba.</p>
                            <div className="relative">
                                <textarea
                                    ref={instructionsTextareaRef}
                                    value={formData.payloadJson.instructions}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, payloadJson: { ...prev.payloadJson, instructions: e.target.value } }))
                                        if (!e.target.value.includes('@') && !e.target.value.includes('{{')) setShowVariablesMenu(false)
                                    }}
                                    onKeyUp={handleTextareaKeyUp}
                                    placeholder="Ej: Solicita el {{Ingreso salarial}} del prospecto una vez ya tengas su zona de interés."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/40 focus:border-[#21AC96] transition-all min-h-[110px] resize-none"
                                />
                                {showVariablesMenu && formData.payloadJson.collectedFields.length > 0 && (
                                    <div className="absolute z-20 top-full mt-1 left-0 w-64 bg-white border border-gray-100 shadow-xl rounded-2xl py-2 max-h-52 overflow-y-auto">
                                        <div className="px-3 pb-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">Variables</div>
                                        {formData.payloadJson.collectedFields.map((f: any, i: number) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => insertVariable(f.name || `variable_${i}`)}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#21AC96]/5 flex justify-between items-center"
                                            >
                                                <span className="font-medium">{f.name || '[Sin nombre]'}</span>
                                                <span className="text-[10px] text-gray-400 bg-gray-50 px-2 rounded-full">{f.type}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Execution type */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">Tipo de ejecución</label>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { value: 'INTERNAL', label: 'Asistente Autónomo', icon: <Zap className="w-4 h-4" /> },
                                    { value: 'WEBHOOK', label: 'Llamar a un Webhook', icon: <Webhook className="w-4 h-4" /> },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, actionType: opt.value, actionUrl: opt.value !== 'WEBHOOK' ? '' : formData.actionUrl })}
                                        className={cn(
                                            'flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-bold transition-all',
                                            formData.actionType === opt.value
                                                ? 'bg-[#21AC96]/10 border-[#21AC96]/30 text-[#21AC96]'
                                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                        )}
                                    >
                                        {opt.icon}
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            {formData.actionType === 'WEBHOOK' && (
                                <div className="mt-4">
                                    <input
                                        type="url"
                                        value={formData.actionUrl || ''}
                                        onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/40 focus:border-[#21AC96]"
                                        placeholder="https://tu-api.com/webhook"
                                    />
                                    <p className="text-xs text-gray-400 mt-1.5">Este endpoint será llamado cuando se cumpla la intención.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            case 2:
                return (
                    <div className="space-y-8">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Persistir variables en el contacto <span className="font-normal text-gray-400">(opcional)</span></label>
                            <p className="text-xs text-gray-400 mb-4">Asocia los valores recopilados a tus campos personalizados del contacto.</p>
                            <div className="space-y-3">
                                {formData.payloadJson.outputMapping.map((mapping: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="flex-1 relative">
                                            <select
                                                value={mapping.customFieldId}
                                                onChange={(e) => updateOutputMapping(idx, 'customFieldId', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/40 focus:border-[#21AC96] bg-white appearance-none pr-7"
                                            >
                                                <option value="">Guardar en campo...</option>
                                                {customFields.map(cf => (
                                                    <option key={cf.id} value={cf.id}>{cf.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                        <div className="flex-1 relative">
                                            <select
                                                value={mapping.valueSource}
                                                onChange={(e) => updateOutputMapping(idx, 'valueSource', e.target.value)}
                                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/40 focus:border-[#21AC96] bg-white appearance-none pr-7"
                                            >
                                                <option value="">Valor desde variable...</option>
                                                {formData.payloadJson.collectedFields.map((f: any, i: number) => (
                                                    <option key={i} value={f.name}>{`{{${f.name || `variable_${i}`}}}`}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                        <button onClick={() => removeOutputMapping(idx)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={addOutputMapping} className="mt-3 flex items-center gap-1.5 text-sm text-[#21AC96] font-bold hover:text-[#198d7a] transition-colors">
                                <Plus className="w-4 h-4" />
                                Agregar mapeo
                            </button>
                        </div>

                        {/* Enable toggle */}
                        <div
                            className={cn(
                                'flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all',
                                formData.enabled ? 'bg-[#21AC96]/5 border-[#21AC96]/20' : 'bg-gray-50 border-gray-100'
                            )}
                            onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                        >
                            <div className={cn(
                                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                                formData.enabled ? 'bg-[#21AC96] border-[#21AC96]' : 'border-gray-300'
                            )}>
                                {formData.enabled && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Activar intención inmediatamente</p>
                                <p className="text-xs text-gray-400 mt-0.5">Si está activada, el agente comenzará a detectar esta intención de inmediato.</p>
                            </div>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-8 py-7 border-b border-gray-100">
                <h2 className="text-[18px] font-black text-gray-900">{intent ? 'Editar intención' : 'Nueva intención'}</h2>
                <p className="text-[13px] text-gray-400 mt-0.5">Configura cómo debe actuar el agente cuando detecte esta intención</p>
            </div>

            {/* Step indicators */}
            <div className="px-8 py-5 flex items-center gap-0 border-b border-gray-100">
                {steps.map((step, index) => (
                    <div key={index} className="flex items-center">
                        <div className="flex items-center gap-2.5">
                            <div className={cn(
                                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all duration-200',
                                index === currentStep ? 'bg-[#21AC96] text-white' :
                                    index < currentStep ? 'bg-[#21AC96]/20 text-[#21AC96]' : 'bg-gray-100 text-gray-400'
                            )}>
                                {index + 1}
                            </div>
                            <span className={cn(
                                'text-[13px] font-bold transition-all duration-200',
                                index === currentStep ? 'text-gray-900' : 'text-gray-400'
                            )}>
                                {step.title}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className="w-10 md:w-16 h-px bg-gray-100 mx-4" />
                        )}
                    </div>
                ))}
            </div>

            {/* Form body */}
            <div className="px-8 py-8 min-h-[360px]">
                {renderStep()}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                >
                    Cancelar
                </button>
                {currentStep > 0 && (
                    <button
                        onClick={handlePrevious}
                        className="px-5 py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                    >
                        Atrás
                    </button>
                )}
                {currentStep < steps.length - 1 ? (
                    <button
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className="px-5 py-2.5 rounded-2xl bg-[#21AC96] text-white font-bold text-sm hover:bg-[#1b8c7a] transition-all shadow-md shadow-[#21AC96]/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Continuar
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !canProceed()}
                        className="px-5 py-2.5 rounded-2xl bg-[#21AC96] text-white font-bold text-sm hover:bg-[#1b8c7a] transition-all shadow-md shadow-[#21AC96]/20 active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar'}
                    </button>
                )}
            </div>
        </div>
    )
}
