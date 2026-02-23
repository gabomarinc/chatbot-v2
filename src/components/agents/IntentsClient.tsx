'use client'

import { useState, useRef, useEffect } from 'react'
import { Target, Plus, Webhook, Zap, FileText, Trash2, Edit, ToggleLeft, ToggleRight, TestTube, Info, ChevronRight, ChevronLeft, CheckCircle2, GripVertical, PlusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Tooltip } from '@/components/ui/tooltip'
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

            if (!response.ok) throw new Error('Failed to toggle intent')

            toast.success(currentState ? 'Intención desactivada' : 'Intención activada')
            router.refresh()
        } catch (error) {
            toast.error('Error al cambiar estado')
        }
    }

    const handleDelete = async (intentId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta intención?')) return

        try {
            const response = await fetch(`/api/agents/${agentId}/intents/${intentId}`, {
                method: 'DELETE'
            })

            if (!response.ok) throw new Error('Failed to delete intent')

            toast.success('Intención eliminada')
            router.refresh()
        } catch (error) {
            toast.error('Error al eliminar')
        }
    }

    const getActionIcon = (actionType: string) => {
        switch (actionType) {
            case 'WEBHOOK': return <Webhook className="w-4 h-4" />
            case 'INTERNAL': return <Zap className="w-4 h-4" />
            case 'FORM': return <FileText className="w-4 h-4" />
            default: return <Target className="w-4 h-4" />
        }
    }

    const getActionColor = (actionType: string) => {
        switch (actionType) {
            case 'WEBHOOK': return 'bg-blue-50 text-blue-600'
            case 'INTERNAL': return 'bg-purple-50 text-purple-600'
            case 'FORM': return 'bg-green-50 text-green-600'
            default: return 'bg-gray-50 text-gray-600'
        }
    }

    if (intents.length === 0 && !isWizardOpen) {
        return (
            <>
                <div className="max-w-4xl space-y-6">
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-50 rounded-full mb-4">
                            <Target className="w-8 h-8 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Crear una intención</h3>
                        <div className="text-gray-500 mb-6 max-w-2xl mx-auto space-y-2">
                            <p className="font-medium">¿Qué son las intenciones?</p>
                            <p>
                                Las intenciones son acciones automáticas que tu agente puede realizar cuando detecta ciertas palabras clave en las conversaciones de los usuarios.
                            </p>
                            <p className="text-sm mt-3 bg-gray-50 p-3 rounded-lg inline-block">
                                <strong>Ejemplo:</strong> Si un usuario escribe "quiero agendar una visita", tu agente puede llamar a un webhook para crear la cita.
                            </p>
                        </div>
                        <button
                            onClick={handleCreate}
                            className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium cursor-pointer"
                        >
                            Registrar primera intención
                        </button>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            {!isWizardOpen && (
                <div className="max-w-4xl space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Intenciones</h2>
                            <p className="text-gray-500">Gestiona las acciones automáticas de tu agente</p>
                        </div>
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#21AC96] text-white rounded-xl hover:bg-[#1b8c7a] transition-colors font-medium cursor-pointer"
                        >
                            <Plus className="w-5 h-5" />
                            Nueva Intención
                        </button>
                    </div>

                    {/* Intents List */}
                    <div className="space-y-3">
                        {intents.map((intent) => (
                            <div
                                key={intent.id}
                                className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-[#21AC96] hover:shadow-md transition-all group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 cursor-pointer" onClick={() => handleEdit(intent)}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-gray-900">{intent.name}</h3>
                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getActionColor(intent.actionType)}`}>
                                                {getActionIcon(intent.actionType)}
                                                {intent.actionType}
                                            </div>
                                            {!intent.enabled && (
                                                <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold">
                                                    DESACTIVADA
                                                </span>
                                            )}
                                        </div>
                                        {intent.description && (
                                            <p className="text-sm text-gray-500 mb-3">{intent.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-gray-400">
                                            <span>Activaciones: {intent.triggerCount}</span>
                                            {intent.lastTriggered && (
                                                <span>Última: {new Date(intent.lastTriggered).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggle(intent.id, intent.enabled)}
                                            className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                                            title={intent.enabled ? 'Desactivar' : 'Activar'}
                                        >
                                            {intent.enabled ? (
                                                <ToggleRight className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <ToggleLeft className="w-5 h-5 text-gray-400" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(intent.id)}
                                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5 text-red-600" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isWizardOpen && (
                <IntentWizard
                    agentId={agentId}
                    intent={editingIntent}
                    customFields={customFields}
                    onClose={() => setIsWizardOpen(false)}
                />
            )}
        </>
    )
}

function IntentWizard({ agentId, intent, customFields, onClose }: { agentId: string; intent: Intent | null; customFields: CustomField[]; onClose: () => void }) {
    const [currentStep, setCurrentStep] = useState(0)

    // Parse existing payloadJson safely
    let defaultPayload = {
        collectedFields: [] as any[],
        instructions: '',
        outputMapping: [] as any[]
    };

    if (intent?.payloadJson) {
        try {
            defaultPayload = { ...defaultPayload, ...(intent.payloadJson as any) };
        } catch (e) { }
    }

    const [formData, setFormData] = useState({
        name: intent?.name || '',
        description: intent?.description || '',
        trigger: intent?.trigger || '', // Not heavily used in UI now but kept for compatibility
        actionType: intent?.actionType || 'INTERNAL',
        actionUrl: intent?.actionUrl || '',
        enabled: intent?.enabled ?? true,
        payloadJson: defaultPayload
    })

    // Auto-complete variables feature state
    const [showVariablesMenu, setShowVariablesMenu] = useState(false);
    const [variableMenuPos, setVariableMenuPos] = useState({ top: 0, left: 0 });
    const instructionsTextareaRef = useRef<HTMLTextAreaElement>(null);

    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const steps = [
        { title: 'Detalles generales' },
        { title: 'Configurar acción' },
        { title: 'Datos de Salida' }
    ]

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1)
        }
    }

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)

        try {
            const url = intent
                ? `/api/agents/${agentId}/intents/${intent.id}`
                : `/api/agents/${agentId}/intents`

            const response = await fetch(url, {
                method: intent ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!response.ok) throw new Error('Failed to save intent')

            toast.success(intent ? 'Intención actualizada' : 'Intención creada')
            router.refresh()
            onClose()
        } catch (error) {
            toast.error('Error al guardar')
        } finally {
            setIsSubmitting(false)
        }
    }

    const canProceed = () => {
        switch (currentStep) {
            case 0: return formData.name.trim() !== ''
            case 1:
                // We want to at least have instructions, and optionally collected fields
                return formData.payloadJson.instructions.trim() !== ''
            case 2:
                return true
            default: return false
        }
    }

    // Handlers for dynamic lists
    const addCollectedField = () => {
        setFormData(prev => ({
            ...prev,
            payloadJson: {
                ...prev.payloadJson,
                collectedFields: [
                    ...prev.payloadJson.collectedFields,
                    { name: '', description: '', type: 'Texto' }
                ]
            }
        }))
    }

    const updateCollectedField = (index: number, key: string, value: string) => {
        setFormData(prev => {
            const newFields = [...prev.payloadJson.collectedFields];
            newFields[index] = { ...newFields[index], [key]: value };
            return {
                ...prev,
                payloadJson: { ...prev.payloadJson, collectedFields: newFields }
            }
        })
    }

    const removeCollectedField = (index: number) => {
        setFormData(prev => {
            const newFields = prev.payloadJson.collectedFields.filter((_, i) => i !== index);
            return {
                ...prev,
                payloadJson: { ...prev.payloadJson, collectedFields: newFields }
            }
        })
    }

    const addOutputMapping = () => {
        setFormData(prev => ({
            ...prev,
            payloadJson: {
                ...prev.payloadJson,
                outputMapping: [
                    ...prev.payloadJson.outputMapping,
                    { customFieldId: '', valueSource: '' }
                ]
            }
        }))
    }

    const updateOutputMapping = (index: number, key: string, value: string) => {
        setFormData(prev => {
            const newMappings = [...prev.payloadJson.outputMapping];
            newMappings[index] = { ...newMappings[index], [key]: value };
            return {
                ...prev,
                payloadJson: { ...prev.payloadJson, outputMapping: newMappings }
            }
        })
    }

    const removeOutputMapping = (index: number) => {
        setFormData(prev => {
            const newMappings = prev.payloadJson.outputMapping.filter((_, i) => i !== index);
            return {
                ...prev,
                payloadJson: { ...prev.payloadJson, outputMapping: newMappings }
            }
        })
    }

    const insertVariable = (variableName: string) => {
        const textarea = instructionsTextareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.payloadJson.instructions;

        let prefix = text.substring(0, start);
        // Clean up the `{{` or `@` they might have been typing
        if (prefix.endsWith('{{')) prefix = prefix.substring(0, prefix.length - 2);
        else if (prefix.endsWith('@')) prefix = prefix.substring(0, prefix.length - 1);

        const newText = prefix + `{{${variableName}}}` + text.substring(end);

        setFormData(prev => ({
            ...prev,
            payloadJson: { ...prev.payloadJson, instructions: newText }
        }));

        setShowVariablesMenu(false);
        // Refocus textarea after short timeout logic can be skipped for brevity, but let's keep it simple.
        setTimeout(() => {
            textarea.focus();
            const newCaret = prefix.length + variableName.length + 4;
            textarea.setSelectionRange(newCaret, newCaret);
        }, 10);
    }

    // Keyboard listener for textarea to open autocomplete
    const handleTextareaKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const textarea = e.currentTarget;
        const val = textarea.value;
        const cursor = textarea.selectionEnd;
        const prevChars = val.substring(Math.max(0, cursor - 2), cursor);
        const prevChar = val.substring(Math.max(0, cursor - 1), cursor);

        if (prevChars === '{{' || prevChar === '@') {
            // Calculate a rough position
            // (Using standard coordinates without an external library is quite rough, we'll just float it near the input for simplicity or stick it below)
            setVariableMenuPos({ top: textarea.offsetTop + textarea.offsetHeight + 5, left: textarea.offsetLeft });
            setShowVariablesMenu(true);
        } else if (e.key === 'Escape') {
            setShowVariablesMenu(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-bold text-gray-700">Nombre de la intención</label>
                            </div>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96]"
                                placeholder="Ej: Perfil laboral"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-bold text-gray-700">Cuándo usar esta intención (opcional)</label>
                                <span className="text-xs text-gray-400 font-medium">{formData.description.length}/512</span>
                            </div>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value.substring(0, 512) })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96] min-h-[120px] resize-none"
                                placeholder="Ej: Pregunta cual es el perfil laboral del prospecto una vez ya tengas su ingreso."
                            />
                        </div>
                    </div>
                )
            case 1:
                return (
                    <div className="space-y-8">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-bold text-gray-700">Recopilar datos del cliente (opcional)</label>
                            </div>

                            <div className="space-y-3">
                                {formData.payloadJson.collectedFields.map((field, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-3">
                                        <div className="p-2 text-gray-300">
                                            <GripVertical className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={field.name}
                                            onChange={(e) => updateCollectedField(idx, 'name', e.target.value)}
                                            placeholder="Ej: Ingreso salarial"
                                            className="w-full sm:w-[35%] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21AC96] text-sm"
                                        />
                                        <input
                                            type="text"
                                            value={field.description}
                                            onChange={(e) => updateCollectedField(idx, 'description', e.target.value)}
                                            placeholder="Ej: para saber lo que gana la persona"
                                            className="w-full sm:w-[40%] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21AC96] text-sm"
                                        />
                                        <select
                                            value={field.type}
                                            onChange={(e) => updateCollectedField(idx, 'type', e.target.value)}
                                            className="w-full sm:w-[25%] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21AC96] bg-white text-sm"
                                        >
                                            <option value="Texto">Texto</option>
                                            <option value="Número">Número</option>
                                            <option value="Booleano">Sí/No</option>
                                            <option value="Fecha">Fecha</option>
                                        </select>
                                        <button onClick={() => removeCollectedField(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addCollectedField}
                                className="mt-3 flex items-center gap-2 text-sm text-[#21AC96] font-bold hover:text-[#198d7a]"
                            >
                                <Plus className="w-4 h-4" />
                                Agregar campo
                            </button>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-bold text-gray-700">Acción que debe realizarse:</label>
                            </div>
                            <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#21AC96] relative">
                                <div className="flex items-start">
                                    <div className="p-3 border-r border-gray-200 bg-gray-50 flex items-center gap-2 text-sm text-gray-600 font-medium w-32 shrink-0">
                                        Instruciones
                                    </div>
                                    <textarea
                                        ref={instructionsTextareaRef}
                                        value={formData.payloadJson.instructions}
                                        onChange={(e) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                payloadJson: { ...prev.payloadJson, instructions: e.target.value }
                                            }))
                                            // Make sure we auto-hide if they deleted "@"
                                            if (!e.target.value.includes('@') && !e.target.value.includes('{{')) {
                                                setShowVariablesMenu(false);
                                            }
                                        }}
                                        onKeyUp={handleTextareaKeyUp}
                                        placeholder="Ej: Solicita el {{Ingreso salarial}} del prospecto una vez ya tengas su zona de interes."
                                        className="w-full p-3 resize-none focus:outline-none min-h-[100px] text-sm"
                                    />
                                </div>
                                <div className="absolute bottom-2 right-3 text-xs text-gray-400 font-medium">
                                    {formData.payloadJson.instructions.length}/512
                                </div>
                                <div className="absolute top-2 right-3 text-xs text-blue-500 font-medium cursor-help" title="Usa {{ o @ para insertar variables">
                                    💡 ¡Tip! Escribe @ para variables
                                </div>

                                {/* Mention Dropdown */}
                                {showVariablesMenu && (
                                    <div
                                        className="absolute z-10 w-64 bg-white border border-gray-200 shadow-xl rounded-xl py-2 max-h-60 overflow-y-auto"
                                        style={{ top: '40px', left: '130px' }} // fixed basic position to stay inside textarea relative box
                                    >
                                        <div className="px-3 pb-1 text-xs font-bold text-gray-400">Campos de la intención</div>
                                        {formData.payloadJson.collectedFields.length === 0 && (
                                            <div className="px-3 py-1 text-xs text-gray-500">No hay campos aún</div>
                                        )}
                                        {formData.payloadJson.collectedFields.map((field: any, i: number) => (
                                            <div
                                                key={i}
                                                onClick={() => insertVariable(field.name || `variable_${i}`)}
                                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                                            >
                                                <span>{field.name || `[Sin nombre]`}</span>
                                                <span className="text-[10px] text-gray-400">{field.type}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            {/* Optional Webhook configuration (default to hidden inside an accordion or basic toggle) */}
                            <div className="flex items-center gap-2 mb-2">
                                <label className="text-sm font-bold text-gray-700">Tipo de ejecución</label>
                            </div>
                            <div className="flex items-center gap-4 text-sm mt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={formData.actionType === 'INTERNAL'}
                                        onChange={() => setFormData({ ...formData, actionType: 'INTERNAL', actionUrl: '' })}
                                        className="w-4 h-4 text-[#21AC96]"
                                    />
                                    <span>Asistente Autonómo (Interno)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={formData.actionType === 'WEBHOOK'}
                                        onChange={() => setFormData({ ...formData, actionType: 'WEBHOOK' })}
                                        className="w-4 h-4 text-[#21AC96]"
                                    />
                                    <span>Llamar a un Webhook API</span>
                                </label>
                            </div>
                            {formData.actionType === 'WEBHOOK' && (
                                <div className="mt-4">
                                    <input
                                        type="url"
                                        value={formData.actionUrl || ''}
                                        onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                        placeholder="https://tu-api.com/webhook"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Este endpoint será disparado cuando se cumpla esta intención.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            case 2:
                return (
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-bold text-gray-700">Persistir variables en el contacto (opcional)</label>
                            </div>

                            <div className="space-y-4">
                                {formData.payloadJson.outputMapping.map((mapping, idx) => (
                                    <div key={idx} className="flex items-center gap-3 w-full">
                                        <div className="w-1/2">
                                            <p className="text-xs font-semibold text-gray-500 mb-1">Guardar en el campo:</p>
                                            <div className="relative">
                                                <select
                                                    value={mapping.customFieldId}
                                                    onChange={(e) => updateOutputMapping(idx, 'customFieldId', e.target.value)}
                                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21AC96] text-sm appearance-none bg-white"
                                                >
                                                    <option value="">Selecciona un campo</option>
                                                    {customFields.map(cf => (
                                                        <option key={cf.id} value={cf.id}>{cf.label}</option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                                    <ChevronRight className="w-4 h-4 rotate-90" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-1/2 relative">
                                            <p className="text-xs font-semibold text-gray-500 mb-1">El valor:</p>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={mapping.valueSource}
                                                    onChange={(e) => updateOutputMapping(idx, 'valueSource', e.target.value)}
                                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21AC96] text-sm appearance-none bg-white"
                                                >
                                                    <option value="">¿De dónde sacamos el valor?</option>
                                                    {formData.payloadJson.collectedFields.map((field: any, fieldIdx: number) => (
                                                        <option key={fieldIdx} value={field.name}>Variable: {`{{${field.name}}}`}</option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-9 flex items-center px-2 mt-[20px] text-gray-500">
                                                    <ChevronRight className="w-4 h-4 rotate-90" />
                                                </div>
                                                <button onClick={() => removeOutputMapping(idx)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors Shrink-0 mt-4 border border-transparent">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addOutputMapping}
                                className="mt-4 flex items-center gap-2 text-sm text-[#21AC96] font-bold hover:text-[#198d7a]"
                            >
                                <Plus className="w-4 h-4" />
                                Agregar variable
                            </button>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 mt-8">
                            <input
                                type="checkbox"
                                id="enabled"
                                checked={formData.enabled}
                                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                                className="w-4 h-4 text-[#21AC96] rounded focus:ring-[#21AC96] accent-[#21AC96]"
                            />
                            <div className="flex-1">
                                <label htmlFor="enabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Activar intención inmediatamente
                                </label>
                                <p className="text-xs text-gray-500 mt-1">
                                    Si está activada, el agente comenzará a detectar e intentar completar esta intención de inmediato.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm max-w-4xl mx-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header / Steps Navigation */}
            <div className="px-6 py-6 sm:px-10 sm:py-8 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{intent ? 'Editar intención' : 'Crear intención'}</h2>
            </div>

            <div className="px-6 sm:px-10 py-6 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 border-b border-gray-100">
                {steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-all duration-300",
                                index === currentStep ? "bg-[#b18dfa] text-white" :
                                    index < currentStep ? "bg-gray-200 text-gray-500" : "bg-gray-200 text-gray-400"
                            )}>
                                {index + 1}
                            </div>
                            <span className={cn(
                                "text-[13px] font-medium hidden sm:block",
                                index === currentStep ? "text-[#b18dfa]" : "text-gray-500"
                            )}>
                                {step.title}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className="w-12 md:w-20 h-px bg-gray-200 mb-6 hidden md:block"></div>
                        )}
                    </div>
                ))}
            </div>

            <div className="p-6 sm:p-10 min-h-[400px]">
                {/* Form Content Wrapper */}
                <div className="max-w-3xl mx-auto border border-gray-100 rounded-2xl p-6 shadow-sm">
                    {renderStepContent()}
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 sm:px-10 py-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors text-sm"
                >
                    Cancelar
                </button>
                {currentStep > 0 && (
                    <button
                        onClick={handlePrevious}
                        className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors text-sm"
                    >
                        Atrás
                    </button>
                )}
                {currentStep < steps.length - 1 ? (
                    <button
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className="px-6 py-2.5 rounded-xl bg-[#21AC96] text-white font-bold hover:bg-[#1b8c7a] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Continuar
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !canProceed()}
                        className="px-6 py-2.5 rounded-xl bg-[#21AC96] text-white font-bold hover:bg-[#1b8c7a] transition-colors text-sm disabled:opacity-50"
                    >
                        {isSubmitting ? 'Guardando...' : 'Salvar'}
                    </button>
                )}
            </div>
        </div>
    )
}
