'use client';

import { useState } from 'react';
import { updateAgent } from '@/lib/actions/dashboard';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Settings, Sliders, Zap, MessageSquare, AlertTriangle, ShieldCheck, Plus, Trash2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentSettingsFormProps {
    agent: {
        id: string;
        model: string;
        temperature: number;
        timezone: string;
        allowEmojis: boolean;
        signMessages: boolean;
        restrictTopics: boolean;
        splitLongMessages: boolean;
        allowReminders: boolean;
        smartRetrieval: boolean;
        transferToHuman: boolean;
        responseDelay?: number;
        enableNPS: boolean;
        handoffTargets?: any; // JSON
    };
    teamMembers: any[];
}

interface HandoffTarget {
    id: string;
    name: string;
    email: string;
    description: string;
}

export function AgentSettingsForm({ agent, teamMembers }: AgentSettingsFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [formData, setFormData] = useState({
        ...agent,
        handoffTargets: agent.handoffTargets || [] as HandoffTarget[]
    });

    const addHandoffTarget = () => {
        const newTarget: HandoffTarget = {
            id: crypto.randomUUID(),
            name: '',
            email: '',
            description: ''
        };
        setFormData(prev => ({
            ...prev,
            handoffTargets: [...(prev.handoffTargets || []), newTarget]
        }));
    };

    const removeHandoffTarget = (id: string) => {
        setFormData(prev => ({
            ...prev,
            handoffTargets: (prev.handoffTargets || []).filter((t: HandoffTarget) => t.id !== id)
        }));
    };

    const updateHandoffTarget = (id: string, field: keyof HandoffTarget, value: string) => {
        setFormData(prev => ({
            ...prev,
            handoffTargets: (prev.handoffTargets || []).map((t: HandoffTarget) =>
                t.id === id ? { ...t, [field]: value } : t
            )
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setIsSaved(false);
        try {
            await updateAgent(agent.id, formData);
            setIsSaved(true);
            router.refresh();
            setTimeout(() => setIsSaved(false), 3000);
        } catch (error) {
            console.error('Error updating agent settings:', error);
            alert('Error al guardar la configuración.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar este agente? Esta acción no se puede deshacer.')) return;

        setIsLoading(true);
        try {
            const { deleteAgent } = await import('@/lib/actions/dashboard');
            await deleteAgent(agent.id);
            toast.success('Agente eliminado');
            router.push('/agents');
        } catch (error) {
            console.error('Error deleting agent:', error);
            toast.error('Error al eliminar el agente');
            setIsLoading(false);
        }
    };

    const toggleField = (field: keyof typeof formData) => {
        setFormData(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const settingsGroups = [
        {
            title: 'Comportamiento del Chat',
            icon: MessageSquare,
            items: [
                { id: 'allowEmojis', label: 'Permitir emojis', desc: 'El agente usará emojis en sus respuestas' },
                { id: 'signMessages', label: 'Firmar mensajes', desc: 'Añadir nombre del agente al final' },
                { id: 'splitLongMessages', label: 'Dividir mensajes', desc: 'Enviar múltiples respuestas cortas' },
            ]
        },
        {
            title: 'Inteligencia y Control',
            icon: Zap,
            items: [
                { id: 'restrictTopics', label: 'Restringir temas', desc: 'Solo responder sobre el negocio' },
                { id: 'smartRetrieval', label: 'Búsqueda inteligente', desc: 'Usar RAG avanzado para precisión' },
                { id: 'allowReminders', label: 'Permitir recordatorios', desc: 'Agendar eventos con el usuario' },
                { id: 'transferToHuman', label: 'Transferir a humano', desc: 'Permitir escalar a un chat real' },
                { id: 'enableNPS', label: 'Encuesta NPS', desc: 'Activa la encuesta de satisfacción al cerrar' },
            ]
        }
    ];

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-10 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#21AC96]/10 rounded-2xl flex items-center justify-center text-[#21AC96]">
                    <Settings className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-gray-900 font-extrabold text-2xl tracking-tight">Configuración Avanzada</h2>
                    <p className="text-gray-500 font-medium">Ajusta el motor de IA y las reglas de interacción</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Model Config */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                        <div className="flex items-center gap-2 text-[#21AC96]">
                            <Sliders className="w-5 h-5" />
                            <span className="text-xs font-black uppercase tracking-widest">Motor IA</span>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1">Modelo LLM</label>
                                <select
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium appearance-none cursor-pointer"
                                >
                                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                                    <option value="gpt-4o">GPT-4o</option>
                                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-sm font-bold text-gray-700">Temperatura</label>
                                    <span className="text-xs font-black text-[#21AC96] bg-[#21AC96]/5 px-2 py-0.5 rounded-lg">{formData.temperature}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={formData.temperature}
                                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#21AC96]"
                                />
                                <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                    <span>Preciso</span>
                                    <span>Creativo</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1">Zona Horaria</label>
                                <select
                                    value={formData.timezone}
                                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium appearance-none cursor-pointer"
                                >
                                    <option value="UTC">UTC (Universal)</option>
                                    <option value="America/Panama">Panamá (EST)</option>
                                    <option value="Europe/Madrid">Madrid (CET)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1">Tiempo de Respuesta</label>
                                <select
                                    value={formData.responseDelay || 0}
                                    onChange={(e) => setFormData({ ...formData, responseDelay: parseInt(e.target.value) })}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium appearance-none cursor-pointer"
                                >
                                    <option value={0}>Inmediato</option>
                                    <option value={5}>5 Segundos</option>
                                    <option value={10}>10 Segundos</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-orange-700 leading-relaxed font-medium">
                            Cambiar el modelo puede afectar el consumo de créditos. GPT-4.0 Turbo es el más potente pero costoso.
                        </p>
                    </div>
                </div>

                {/* Right Column: Toggles */}
                <div className="lg:col-span-2 space-y-6">
                    {settingsGroups.map((group, idx) => (
                        <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-[#21AC96]/5 rounded-xl flex items-center justify-center text-[#21AC96]">
                                    <group.icon className="w-5 h-5" />
                                </div>
                                <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest">{group.title}</h3>
                            </div>

                            <div className="space-y-4">
                                {group.items.map((setting) => (
                                    <div
                                        key={setting.id}
                                        onClick={() => toggleField(setting.id as any)}
                                        className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer group"
                                    >
                                        <div className="space-y-0.5">
                                            <div className="text-sm font-extrabold text-gray-900 group-hover:text-[#21AC96] transition-colors">{setting.label}</div>
                                            <div className="text-xs text-gray-400 font-medium">{setting.desc}</div>
                                        </div>
                                        <div className={cn(
                                            "w-12 h-6 rounded-full relative transition-all duration-300",
                                            formData[setting.id as keyof typeof formData] ? "bg-[#21AC96]" : "bg-gray-200"
                                        )}>
                                            <div className={cn(
                                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                                                formData[setting.id as keyof typeof formData] ? "left-7" : "left-1"
                                            )}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Handoff Targets Section */}
                    {formData.transferToHuman && (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-[#F59E0B]/10 rounded-xl flex items-center justify-center text-[#F59E0B]">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest">Ruteo Inteligente</h3>
                                    <p className="text-xs text-gray-400 font-medium">Define a quién asignar según la intención del usuario</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {(formData.handoffTargets || []).map((target: HandoffTarget) => {
                                    // Identify current departments in workspace
                                    const availableDepts = Array.from(new Set([
                                        'SALES', 'SUPPORT', 'PERSONAL',
                                        ...teamMembers.map(m => m.department).filter(Boolean)
                                    ]));

                                    const isCustomDept = !availableDepts.includes(target.name);

                                    return (
                                        <div key={target.id} className="bg-gray-50 p-4 rounded-2xl space-y-3 relative group border border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() => removeHandoffTarget(target.id)}
                                                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider ml-1">Departamento</label>
                                                    <div className="space-y-2">
                                                        <select
                                                            value={isCustomDept && target.name ? 'CUSTOM' : target.name}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === 'CUSTOM') {
                                                                    updateHandoffTarget(target.id, 'name', '');
                                                                } else {
                                                                    updateHandoffTarget(target.id, 'name', val);
                                                                }
                                                            }}
                                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96]"
                                                        >
                                                            <option value="">Seleccionar...</option>
                                                            {availableDepts.map(dept => (
                                                                <option key={dept} value={dept}>{dept}</option>
                                                            ))}
                                                            <option value="CUSTOM">+ Agregar departamento nuevo</option>
                                                        </select>

                                                        {(isCustomDept || !target.name) && (
                                                            <input
                                                                type="text"
                                                                placeholder="Nombre del nuevo departamento..."
                                                                value={target.name}
                                                                onChange={(e) => updateHandoffTarget(target.id, 'name', e.target.value)}
                                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96]"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider ml-1">Responsable / Equipo</label>
                                                    <select
                                                        value={target.email}
                                                        onChange={(e) => updateHandoffTarget(target.id, 'email', e.target.value)}
                                                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96]"
                                                    >
                                                        <option value="">Seleccionar responsable...</option>
                                                        {teamMembers.map((member) => (
                                                            <option key={member.user.id} value={member.user.email}>
                                                                {member.user.name || member.user.email} ({member.department || 'General'})
                                                            </option>
                                                        ))}
                                                        {target.email && !teamMembers.find(m => m.user.email === target.email) && (
                                                            <option value={target.email}>{target.email}</option>
                                                        )}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider ml-1">Descripción para la IA</label>
                                                <input
                                                    type="text"
                                                    placeholder="¿Cuándo debe la IA transferir a este departamento?"
                                                    value={target.description}
                                                    onChange={(e) => updateHandoffTarget(target.id, 'description', e.target.value)}
                                                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96]"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}

                                <button
                                    type="button"
                                    onClick={addHandoffTarget}
                                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold text-sm hover:border-[#21AC96] hover:text-[#21AC96] hover:bg-[#21AC96]/5 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Agregar Destino</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Final Actions */}
                    <div className="flex items-center justify-end gap-4 pt-4">
                        {isSaved && (
                            <div className="flex items-center gap-2 text-green-600 font-bold text-sm animate-in fade-in zoom-in duration-300">
                                <ShieldCheck className="w-5 h-5" />
                                <span>Configuración actualizada</span>
                            </div>
                        )}
                        <button
                            disabled={isLoading}
                            className="px-10 py-4 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <span>Guardar Configuración</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <h3 className="text-red-900 font-black text-sm uppercase tracking-widest">Zona de Peligro</h3>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-red-900 font-bold text-lg">Eliminar Agente</h4>
                                <p className="text-red-700/70 text-sm font-medium">Esta acción eliminará permanentemente al agente y todo su historial.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-6 py-3 bg-white text-red-600 border border-red-200 rounded-xl text-sm font-bold shadow-sm hover:bg-red-50 hover:border-red-300 transition-all active:scale-95"
                            >
                                Eliminar Agente
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </form >
    );
}
