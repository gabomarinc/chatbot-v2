'use client'

import { useState } from 'react'
import { Target, Plus, Webhook, Zap, FileText, Trash2, Edit, ToggleLeft, ToggleRight, TestTube, Info, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Tooltip } from '@/components/ui/tooltip'
import { TagsInput } from '@/components/ui/tags-input'

interface Intent {
    id: string
    name: string
    description: string | null
    trigger: string
    enabled: boolean
    actionType: string
    actionUrl: string | null
    triggerCount: number
    lastTriggered: Date | null
    createdAt: Date
}

interface IntentsClientProps {
    agentId: string
    intents: Intent[]
}

export function IntentsClient({ agentId, intents }: IntentsClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingIntent, setEditingIntent] = useState<Intent | null>(null)
    const router = useRouter()

    const handleCreate = () => {
        setEditingIntent(null)
        setIsModalOpen(true)
    }

    const handleEdit = (intent: Intent) => {
        setEditingIntent(intent)
        setIsModalOpen(true)
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

    if (intents.length === 0) {
        return (
            <>
                <div className="max-w-3xl">
                    <div className="bg-white rounded-3xl p-12 border border-gray-200 flex flex-col items-start justify-center min-h-[400px]">
                        <div className="w-32 h-32 bg-purple-50 rounded-full flex items-center justify-center mb-6">
                            <Target className="w-16 h-16 text-purple-500" />
                        </div>
                        <h3 className="text-gray-900 mb-2 text-xl font-semibold">Crear una intención</h3>
                        <div className="text-sm text-gray-600 mb-4 max-w-md space-y-2">
                            <p className="font-medium text-gray-900">¿Qué son las intenciones?</p>
                            <p>
                                Las intenciones son acciones automáticas que tu agente puede realizar cuando detecta ciertas palabras clave en las conversaciones de los usuarios.
                            </p>
                            <p className="text-gray-500 mt-3">
                                <strong>Ejemplo:</strong> Si un usuario escribe "quiero agendar una visita", tu agente puede detectar esta intención y automáticamente llamar a un webhook para agendar la cita en tu sistema.
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

                {isModalOpen && (
                    <IntentWizard
                        agentId={agentId}
                        intent={editingIntent}
                        onClose={() => setIsModalOpen(false)}
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
                        <h2 className="text-2xl font-bold text-gray-900">Intenciones</h2>
                        <p className="text-gray-500">Gestiona las acciones automáticas de tu agente</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
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
                            className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
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
                                        <p className="text-sm text-gray-600 mb-3">{intent.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-gray-400">
                                        <span>Trigger: <code className="bg-gray-50 px-2 py-0.5 rounded text-purple-600">{intent.trigger}</code></span>
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
                                        onClick={() => handleEdit(intent)}
                                        className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <Edit className="w-5 h-5 text-gray-600" />
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

            {isModalOpen && (
                editingIntent ? (
                    <IntentModal
                        agentId={agentId}
                        intent={editingIntent}
                        onClose={() => setIsModalOpen(false)}
                    />
                ) : (
                    <IntentWizard
                        agentId={agentId}
                        intent={null}
                        onClose={() => setIsModalOpen(false)}
                    />
                )
            )}
        </>
    )
}

function IntentWizard({ agentId, intent, onClose }: { agentId: string; intent: Intent | null; onClose: () => void }) {
    const [currentStep, setCurrentStep] = useState(0)
    const [formData, setFormData] = useState({
        name: intent?.name || '',
        description: intent?.description || '',
        trigger: intent?.trigger || '',
        actionType: intent?.actionType || 'WEBHOOK',
        actionUrl: intent?.actionUrl || '',
        enabled: intent?.enabled ?? true
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const steps = [
        {
            title: '¿Qué son las intenciones?',
            description: 'Aprende cómo funcionan las intenciones en tu agente'
        },
        {
            title: 'Nombre y Descripción',
            description: 'Dale un nombre claro a tu intención'
        },
        {
            title: 'Palabras Clave (Triggers)',
            description: 'Define qué palabras activarán esta intención'
        },
        {
            title: 'Tipo de Acción',
            description: 'Elige qué debe hacer tu agente cuando detecte esta intención'
        },
        {
            title: 'Configuración Final',
            description: 'Revisa y activa tu intención'
        }
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
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
            case 0: return true
            case 1: return formData.name.trim() !== ''
            case 2: {
                // Verificar que haya al menos un tag
                const tags = formData.trigger.split('|').filter(t => t.trim() !== '')
                return tags.length > 0
            }
            case 3: return formData.actionType !== '' && (formData.actionType !== 'WEBHOOK' || formData.actionUrl.trim() !== '')
            case 4: return true
            default: return false
        }
    }

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="space-y-6">
                        <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Target className="w-5 h-5 text-purple-600" />
                                ¿Qué son las intenciones?
                            </h3>
                            <p className="text-gray-700 mb-4">
                                Las intenciones son como "botones de acción" que tu agente puede activar automáticamente cuando detecta ciertas palabras o frases en las conversaciones.
                            </p>
                            <div className="bg-white rounded-xl p-4 border border-purple-200">
                                <p className="text-sm font-semibold text-gray-900 mb-2">Ejemplo práctico:</p>
                                <p className="text-sm text-gray-700">
                                    Si un usuario escribe <strong>"quiero agendar una visita"</strong>, tu agente puede:
                                </p>
                                <ul className="list-disc list-inside mt-2 text-sm text-gray-700 space-y-1">
                                    <li>Detectar las palabras clave: <code className="bg-gray-100 px-1 rounded">agendar|visita|cita</code></li>
                                    <li>Activar la intención "Agendar Visita"</li>
                                    <li>Llamar a un webhook para crear la cita en tu sistema</li>
                                    <li>Confirmar al usuario que la cita fue agendada</li>
                                </ul>
                            </div>
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                            <h4 className="text-md font-bold text-gray-900 mb-2">¿Cuándo usar intenciones?</h4>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                <li>Para automatizar acciones repetitivas (agendar citas, enviar información, etc.)</li>
                                <li>Para integrar tu chatbot con sistemas externos (CRM, calendarios, etc.)</li>
                                <li>Para mejorar la experiencia del usuario con respuestas rápidas y acciones inmediatas</li>
                            </ul>
                        </div>
                    </div>
                )
            case 1:
                return (
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-bold text-gray-700">Nombre de la Intención</label>
                                <Tooltip content="Un nombre descriptivo que te ayude a identificar fácilmente esta intención. Ejemplo: 'Agendar Visita', 'Solicitar Información', 'Contactar Vendedor'">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                </Tooltip>
                            </div>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Ej: Agendar Visita"
                            />
                            <p className="text-xs text-gray-500 mt-1">Usa un nombre claro y descriptivo</p>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-bold text-gray-700">Descripción (opcional)</label>
                                <Tooltip content="Una descripción breve que explique qué hace esta intención. Esto te ayudará a recordar su propósito más adelante.">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                </Tooltip>
                            </div>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                rows={3}
                                placeholder="Ej: Esta intención permite a los usuarios agendar visitas a propiedades disponibles"
                            />
                        </div>
                    </div>
                )
            case 2:
                return (
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-bold text-gray-700">Palabras Clave (Triggers)</label>
                                <Tooltip content="Estas son las palabras o frases que activarán esta intención. Escribe cada palabra y presiona Enter para agregarla. El agente buscará cualquiera de estas palabras en los mensajes de los usuarios.">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                </Tooltip>
                            </div>
                            <TagsInput
                                value={formData.trigger}
                                onChange={(value) => setFormData({ ...formData, trigger: value })}
                                placeholder="Escribe una palabra clave y presiona Enter"
                            />
                            <p className="text-xs text-gray-500 mt-2">Presiona Enter o escribe una coma (,) para agregar cada palabra clave</p>
                            <div className="bg-gray-50 rounded-xl p-4 mt-3 border border-gray-200">
                                <p className="text-xs font-semibold text-gray-700 mb-2">💡 Consejo:</p>
                                <p className="text-xs text-gray-600">
                                    Incluye variaciones de las palabras. Por ejemplo, si quieres detectar "agendar", también agrega: <strong>agendar</strong>, <strong>agenda</strong>, <strong>cita</strong>, <strong>reservar</strong>
                                </p>
                            </div>
                        </div>
                    </div>
                )
            case 3:
                return (
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-bold text-gray-700">Tipo de Acción</label>
                                <Tooltip content="Elige qué debe hacer tu agente cuando detecte esta intención. Puede llamar a un webhook externo, ejecutar una acción interna, o mostrar un formulario.">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                </Tooltip>
                            </div>
                            <select
                                value={formData.actionType}
                                onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="WEBHOOK">Webhook (llamar URL externa)</option>
                                <option value="INTERNAL">Acción Interna</option>
                                <option value="FORM">Formulario</option>
                            </select>
                            <div className="mt-3 space-y-2">
                                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                                    <p className="text-xs font-semibold text-gray-900 mb-1">🔗 Webhook:</p>
                                    <p className="text-xs text-gray-700">Llama a una URL externa (tu API, CRM, sistema de calendario, etc.) cuando se detecte la intención.</p>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                                    <p className="text-xs font-semibold text-gray-900 mb-1">⚡ Acción Interna:</p>
                                    <p className="text-xs text-gray-700">Ejecuta una acción dentro del sistema del agente (guardar datos, enviar notificación, etc.)</p>
                                </div>
                                <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                                    <p className="text-xs font-semibold text-gray-900 mb-1">📝 Formulario:</p>
                                    <p className="text-xs text-gray-700">Muestra un formulario al usuario para recopilar información adicional.</p>
                                </div>
                            </div>
                        </div>

                        {formData.actionType === 'WEBHOOK' && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <label className="block text-sm font-bold text-gray-700">Webhook URL</label>
                                    <Tooltip content="La URL completa de tu API o servicio externo que será llamada cuando se active esta intención. Debe ser una URL válida que acepte peticiones HTTP POST.">
                                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    </Tooltip>
                                </div>
                                <input
                                    type="url"
                                    required
                                    value={formData.actionUrl}
                                    onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="https://api.example.com/webhook"
                                />
                                <p className="text-xs text-gray-500 mt-1">Asegúrate de que la URL sea accesible y acepte peticiones POST</p>
                            </div>
                        )}
                    </div>
                )
            case 4:
                return (
                    <div className="space-y-6">
                        <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                Resumen de tu Intención
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="font-semibold text-gray-700">Nombre:</span>
                                    <span className="ml-2 text-gray-900">{formData.name || 'No definido'}</span>
                                </div>
                                {formData.description && (
                                    <div>
                                        <span className="font-semibold text-gray-700">Descripción:</span>
                                        <span className="ml-2 text-gray-900">{formData.description}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="font-semibold text-gray-700">Palabras clave:</span>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.trigger ? (
                                            formData.trigger.split('|').filter(t => t.trim()).map((tag, idx) => (
                                                <span key={idx} className="inline-flex items-center px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                                                    {tag}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-gray-400 text-sm">No definido</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-700">Tipo de acción:</span>
                                    <span className="ml-2 text-gray-900">{formData.actionType}</span>
                                </div>
                                {formData.actionType === 'WEBHOOK' && formData.actionUrl && (
                                    <div>
                                        <span className="font-semibold text-gray-700">Webhook URL:</span>
                                        <span className="ml-2 text-gray-900 break-all">{formData.actionUrl}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <input
                                type="checkbox"
                                id="enabled"
                                checked={formData.enabled}
                                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <div className="flex-1">
                                <label htmlFor="enabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Activar intención inmediatamente
                                </label>
                                <p className="text-xs text-gray-500 mt-1">
                                    Si está activada, el agente comenzará a detectar esta intención de inmediato. Puedes desactivarla más tarde si lo necesitas.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-bold">Crear Nueva Intención</h2>
                        <span className="text-sm text-gray-500">Paso {currentStep + 1} de {steps.length}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        {steps.map((step, index) => (
                            <div
                                key={index}
                                className={`flex-1 text-center ${index <= currentStep ? 'text-purple-600' : 'text-gray-400'}`}
                            >
                                <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center ${index < currentStep ? 'bg-purple-600 text-white' :
                                    index === currentStep ? 'bg-purple-100 text-purple-600 border-2 border-purple-600' :
                                        'bg-gray-100 text-gray-400'
                                    }`}>
                                    {index < currentStep ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                                </div>
                                <p className="text-xs font-medium hidden sm:block">{step.title}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                <div className="mb-6 min-h-[300px]">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{steps[currentStep].title}</h3>
                    <p className="text-sm text-gray-500 mb-6">{steps[currentStep].description}</p>
                    {renderStepContent()}
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                    {currentStep > 0 && (
                        <button
                            type="button"
                            onClick={handlePrevious}
                            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Anterior
                        </button>
                    )}
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    {currentStep < steps.length - 1 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Siguiente
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !canProceed()}
                            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {isSubmitting ? 'Guardando...' : 'Crear Intención'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function IntentModal({ agentId, intent, onClose }: { agentId: string; intent: Intent | null; onClose: () => void }) {
    const [formData, setFormData] = useState({
        name: intent?.name || '',
        description: intent?.description || '',
        trigger: intent?.trigger || '',
        actionType: intent?.actionType || 'WEBHOOK',
        actionUrl: intent?.actionUrl || '',
        enabled: intent?.enabled ?? true
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{intent ? 'Editar' : 'Nueva'} Intención</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="block text-sm font-bold text-gray-700">Nombre</label>
                            <Tooltip content="Un nombre descriptivo que te ayude a identificar fácilmente esta intención. Ejemplo: 'Agendar Visita', 'Solicitar Información', 'Contactar Vendedor'">
                                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            </Tooltip>
                        </div>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Ej: Agendar Visita"
                        />
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="block text-sm font-bold text-gray-700">Descripción (opcional)</label>
                            <Tooltip content="Una descripción breve que explique qué hace esta intención. Esto te ayudará a recordar su propósito más adelante.">
                                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            </Tooltip>
                        </div>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                            rows={2}
                            placeholder="Describe qué hace esta intención"
                        />
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="block text-sm font-bold text-gray-700">Trigger (palabras clave)</label>
                            <Tooltip content="Estas son las palabras o frases que activarán esta intención. Escribe cada palabra y presiona Enter para agregarla. El agente buscará cualquiera de estas palabras en los mensajes de los usuarios.">
                                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            </Tooltip>
                        </div>
                        <TagsInput
                            value={formData.trigger}
                            onChange={(value) => setFormData({ ...formData, trigger: value })}
                            placeholder="Escribe una palabra clave y presiona Enter"
                        />
                        <p className="text-xs text-gray-500 mt-2">Presiona Enter o escribe una coma (,) para agregar cada palabra clave</p>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="block text-sm font-bold text-gray-700">Tipo de Acción</label>
                            <Tooltip content="Elige qué debe hacer tu agente cuando detecte esta intención. Puede llamar a un webhook externo, ejecutar una acción interna, o mostrar un formulario.">
                                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            </Tooltip>
                        </div>
                        <select
                            value={formData.actionType}
                            onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="WEBHOOK">Webhook (llamar URL externa)</option>
                            <option value="INTERNAL">Acción Interna</option>
                            <option value="FORM">Formulario</option>
                        </select>
                    </div>

                    {formData.actionType === 'WEBHOOK' && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-bold text-gray-700">Webhook URL</label>
                                <Tooltip content="La URL completa de tu API o servicio externo que será llamada cuando se active esta intención. Debe ser una URL válida que acepte peticiones HTTP POST.">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                </Tooltip>
                            </div>
                            <input
                                type="url"
                                required
                                value={formData.actionUrl}
                                onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="https://api.example.com/webhook"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="enabled"
                            checked={formData.enabled}
                            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <div className="flex items-center gap-2">
                            <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                                Activar intención inmediatamente
                            </label>
                            <Tooltip content="Si está activada, el agente comenzará a detectar esta intención de inmediato. Puedes desactivarla más tarde si lo necesitas.">
                                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            </Tooltip>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {isSubmitting ? 'Guardando...' : intent ? 'Actualizar' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
