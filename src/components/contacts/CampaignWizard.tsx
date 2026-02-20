"use client";

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import {
    MessageSquare,
    Layout,
    ChevronRight,
    Play,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Users,
    Settings2,
    ArrowLeft,
    Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { getChannels } from '@/lib/actions/dashboard';
import { getWhatsAppTemplates, sendWhatsAppTemplateAction } from '@/lib/actions/whatsapp-auth';
import { getContactsByIds } from '@/lib/actions/contacts';
import { cn } from '@/lib/utils';

interface CampaignWizardProps {
    isOpen: boolean;
    onClose: () => void;
    selectedContactIds: string[];
    workspaceId: string;
}

type Step = 'channel' | 'template' | 'variables' | 'review' | 'sending' | 'result';

export function CampaignWizard({ isOpen, onClose, selectedContactIds, workspaceId }: CampaignWizardProps) {
    const [step, setStep] = useState<Step>('channel');
    const [channels, setChannels] = useState<any[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<any>(null);
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [selectedContacts, setSelectedContacts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Variables state: { component_index: { variable_index: { type: 'field' | 'text', value: string } } }
    const [variableMapping, setVariableMapping] = useState<any>({});

    // Sending state
    const [sendingProgress, setSendingProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
    const [sendingResults, setSendingResults] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        } else {
            // Reset state when closing
            setStep('channel');
            setSelectedChannel(null);
            setSelectedTemplate(null);
            setVariableMapping({});
            setSendingProgress({ current: 0, total: 0, success: 0, failed: 0 });
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [channelsRes, contactsRes] = await Promise.all([
                getChannels(),
                getContactsByIds(selectedContactIds)
            ]);

            // Filter only WhatsApp channels for now
            const waChannels = (channelsRes || []).filter((c: any) => c.type === 'WHATSAPP' && c.isActive);
            setChannels(waChannels);

            if (contactsRes.success) {
                setSelectedContacts(contactsRes.contacts || []);
            }
        } catch (error) {
            toast.error("Error al cargar datos iniciales");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTemplates = async (channel: any) => {
        setIsLoading(true);
        try {
            const { wabaId, accessToken } = channel.configJson;
            const res = await getWhatsAppTemplates(wabaId, accessToken);
            if (res.success) {
                // Filter only APPROVED templates
                setTemplates(res.templates.filter((t: any) => t.status === 'APPROVED'));
            } else {
                toast.error(res.error || "No se pudieron obtener las plantillas");
            }
        } catch (error) {
            toast.error("Error al obtener plantillas de Meta");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChannelSelect = (channel: any) => {
        setSelectedChannel(channel);
        fetchTemplates(channel);
        setStep('template');
    };

    const handleTemplateSelect = (template: any) => {
        setSelectedTemplate(template);

        // Initialize variable mapping
        const initialMapping: any = {};
        template.components.forEach((comp: any, compIdx: number) => {
            if (comp.type === 'BODY' || comp.type === 'HEADER') {
                const paramCount = (comp.text.match(/{{(\d+)}}/g) || []).length;
                if (paramCount > 0) {
                    initialMapping[compIdx] = {};
                    for (let i = 1; i <= paramCount; i++) {
                        initialMapping[compIdx][i] = { type: 'text', value: '' };
                    }
                }
            }
        });

        setVariableMapping(initialMapping);

        if (Object.keys(initialMapping).length > 0) {
            setStep('variables');
        } else {
            setStep('review');
        }
    };

    const renderVariableInputs = () => {
        if (!selectedTemplate) return null;

        return (
            <div className="space-y-6">
                {selectedTemplate.components.map((comp: any, compIdx: number) => {
                    const mapping = variableMapping[compIdx];
                    if (!mapping) return null;

                    return (
                        <div key={compIdx} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <Settings2 className="w-3 h-3" />
                                Variables en {comp.type === 'BODY' ? 'Cuerpo del mensaje' : 'Encabezado'}
                            </h4>
                            <p className="text-xs text-gray-500 mb-6 italic italic-font italic-style font-medium border-l-2 border-emerald-500 pl-3 bg-emerald-50/50 py-2 rounded-r-lg">
                                "{comp.text.replace(/{{(\d+)}}/g, '(Variable $1)')}"
                            </p>

                            <div className="space-y-4">
                                {Object.keys(mapping).map((paramIdx) => (
                                    <div key={paramIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                        <div className="sm:col-span-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1.5 ml-1">
                                                Variable {'{{'}{paramIdx}{'}}'}
                                            </label>
                                            <select
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] outline-none transition-all"
                                                value={variableMapping[compIdx][paramIdx].type}
                                                onChange={(e) => {
                                                    const newMapping = { ...variableMapping };
                                                    newMapping[compIdx][paramIdx].type = e.target.value;
                                                    newMapping[compIdx][paramIdx].value = '';
                                                    setVariableMapping(newMapping);
                                                }}
                                            >
                                                <option value="text">Texto Fijo</option>
                                                <option value="field">Campo Dinámico</option>
                                            </select>
                                        </div>
                                        <div className="sm:col-span-2">
                                            {variableMapping[compIdx][paramIdx].type === 'field' ? (
                                                <select
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] outline-none transition-all"
                                                    value={variableMapping[compIdx][paramIdx].value}
                                                    onChange={(e) => {
                                                        const newMapping = { ...variableMapping };
                                                        newMapping[compIdx][paramIdx].value = e.target.value;
                                                        setVariableMapping(newMapping);
                                                    }}
                                                >
                                                    <option value="">Seleccionar campo...</option>
                                                    <option value="name">Nombre del Contacto</option>
                                                    <option value="email">Email</option>
                                                    <option value="phone">Teléfono</option>
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    placeholder="Escribe el valor fijo..."
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] outline-none transition-all"
                                                    value={variableMapping[compIdx][paramIdx].value}
                                                    onChange={(e) => {
                                                        const newMapping = { ...variableMapping };
                                                        newMapping[compIdx][paramIdx].value = e.target.value;
                                                        setVariableMapping(newMapping);
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const startExecution = async () => {
        setStep('sending');
        setSendingProgress({ current: 0, total: selectedContacts.length, success: 0, failed: 0 });

        const results = [];
        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < selectedContacts.length; i++) {
            const contact = selectedContacts[i];

            // Build components for this specific contact
            const components: any[] = [];

            Object.keys(variableMapping).forEach(compIdx => {
                const compType = selectedTemplate.components[parseInt(compIdx)].type;
                const parameters: any[] = [];

                Object.keys(variableMapping[compIdx]).forEach(paramIdx => {
                    const mapping = variableMapping[compIdx][paramIdx];
                    let finalValue = mapping.value;

                    if (mapping.type === 'field') {
                        finalValue = contact[mapping.value] || '';
                    }

                    parameters.push({
                        type: 'text',
                        text: finalValue || ' ' // WA needs non-empty
                    });
                });

                components.push({
                    type: compType.toLowerCase(),
                    parameters
                });
            });

            try {
                const res = await sendWhatsAppTemplateAction({
                    phoneNumberId: selectedChannel.configJson.phoneNumberId,
                    accessToken: selectedChannel.configJson.accessToken,
                    to: contact.phone,
                    templateName: selectedTemplate.name,
                    languageCode: selectedTemplate.language,
                    components
                });

                if (res.success) {
                    successCount++;
                } else {
                    failedCount++;
                }

                results.push({ contact: contact.name || contact.phone, success: res.success, error: res.error });
            } catch (err) {
                failedCount++;
                results.push({ contact: contact.name || contact.phone, success: false, error: "Excepción de red" });
            }

            setSendingProgress({
                current: i + 1,
                total: selectedContacts.length,
                success: successCount,
                failed: failedCount
            });

            // Small delay to be nice to Meta API
            await new Promise(r => setTimeout(r, 300));
        }

        setSendingResults(results);
        setStep('result');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl bg-white border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden outline-none">
                {/* Custom Header with Progress */}
                <div className="bg-gray-900 p-8 text-white relative">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-[#21AC96] rounded-2xl flex items-center justify-center shadow-lg shadow-[#21AC96]/20">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black tracking-tight">
                                {step === 'channel' && 'Seleccionar Canal'}
                                {step === 'template' && 'Elegir Plantilla'}
                                {step === 'variables' && 'Personalizar Mensaje'}
                                {step === 'review' && 'Revisar Campaña'}
                                {step === 'sending' && 'Enviando Mensajes...'}
                                {step === 'result' && 'Resultado de Campaña'}
                            </DialogTitle>
                            <DialogDescription className="text-gray-400 font-medium">
                                Enviar mensaje masivo a {selectedContactIds.length} contactos
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Step Indicators */}
                    <div className="flex gap-2 mt-6">
                        {['channel', 'template', 'variables', 'review', 'result'].map((s, idx) => {
                            if (step === 'sending' && s === 'result') return null;
                            const isActive = step === s;
                            const isPast = ['channel', 'template', 'variables', 'review', 'sending', 'result'].indexOf(step) > ['channel', 'template', 'variables', 'review', 'sending', 'result'].indexOf(s);

                            return (
                                <div
                                    key={s}
                                    className={cn(
                                        "h-1.5 flex-1 rounded-full transition-all duration-500",
                                        isActive ? "bg-[#21AC96] w-full" : isPast ? "bg-[#21AC96]/40" : "bg-white/10"
                                    )}
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {isLoading && (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-10 h-10 text-[#21AC96] animate-spin" />
                            <p className="text-sm font-bold text-gray-500">Cargando datos...</p>
                        </div>
                    )}

                    {!isLoading && step === 'channel' && (
                        <div className="grid grid-cols-1 gap-4">
                            {channels.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-gray-500">No hay canales de WhatsApp activos</p>
                                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-black tracking-widest">Configura un canal primero</p>
                                </div>
                            ) : (
                                channels.map(channel => (
                                    <button
                                        key={channel.id}
                                        onClick={() => handleChannelSelect(channel)}
                                        className="group p-5 bg-white border border-gray-100 rounded-3xl flex items-center justify-between hover:border-[#21AC96] hover:shadow-xl hover:shadow-[#21AC96]/10 transition-all text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-[#21AC96]/5 text-[#21AC96] rounded-2xl flex items-center justify-center group-hover:bg-[#21AC96] group-hover:text-white transition-all">
                                                <MessageSquare className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{channel.name}</h4>
                                                <p className="text-xs text-gray-400 font-medium">Agente: {channel.agentName}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#21AC96] transition-all" />
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {!isLoading && step === 'template' && (
                        <div className="grid grid-cols-1 gap-4">
                            <button
                                onClick={() => setStep('channel')}
                                className="flex items-center gap-2 text-xs font-black text-[#21AC96] uppercase tracking-widest mb-4 hover:translate-x-[-4px] transition-transform"
                            >
                                <ArrowLeft className="w-4 h-4" /> Volver a canales
                            </button>
                            {templates.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-gray-500">No se encontraron plantillas aprobadas</p>
                                </div>
                            ) : (
                                templates.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleTemplateSelect(template)}
                                        className="group p-5 bg-white border border-gray-100 rounded-3xl flex flex-col hover:border-[#21AC96] hover:shadow-xl hover:shadow-[#21AC96]/10 transition-all text-left"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-black uppercase tracking-widest">
                                                    {template.language}
                                                </div>
                                                <h4 className="font-bold text-gray-900">{template.name}</h4>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#21AC96] group-hover:text-white transition-all">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 line-clamp-2 italic italic-font italic-style">
                                            {template.components.find((c: any) => c.type === 'BODY')?.text}
                                        </p>
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {!isLoading && step === 'variables' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    onClick={() => setStep('template')}
                                    className="flex items-center gap-2 text-xs font-black text-[#21AC96] uppercase tracking-widest hover:translate-x-[-4px] transition-transform"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Cambiar Plantilla
                                </button>
                                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                                    Paso 3 de 4
                                </div>
                            </div>

                            {renderVariableInputs()}
                        </div>
                    )}

                    {!isLoading && step === 'review' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <button
                                    onClick={() => Object.keys(variableMapping).length > 0 ? setStep('variables') : setStep('template')}
                                    className="flex items-center gap-2 text-xs font-black text-[#21AC96] uppercase tracking-widest hover:translate-x-[-4px] transition-transform"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Volver
                                </button>
                            </div>

                            <div className="bg-gray-50 rounded-[2rem] p-8 border border-gray-100 space-y-6">
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Audiencia</h5>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-[#21AC96]" />
                                            <span className="text-lg font-black text-gray-800">{selectedContacts.length}</span>
                                            <span className="text-sm font-bold text-gray-400">Contactos</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Canal</h5>
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4 text-emerald-500" />
                                            <span className="text-sm font-bold text-gray-800">{selectedChannel?.name}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-200/50"></div>

                                <div>
                                    <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">Vista previa del mensaje</h5>
                                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                        <p className="text-xs text-gray-500 line-clamp-4 leading-relaxed">
                                            {selectedTemplate?.components.find((c: any) => c.type === 'BODY')?.text}
                                        </p>
                                        <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                            <Eye className="w-3 h-3" /> Vista previa con variables aplicadas al enviar
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-5 bg-amber-50 border border-amber-100 rounded-2xl">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                <p className="text-[10px] font-bold text-amber-700 leading-tight">
                                    Asegúrate de que el mensaje cumple con las políticas de Meta. Los envíos masivos pueden afectar la calificación de calidad de tu número si son reportados como SPAM.
                                </p>
                            </div>
                        </div>
                    )}

                    {!isLoading && step === 'sending' && (
                        <div className="py-10 space-y-8">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle
                                            cx="64" cy="64" r="58"
                                            fill="transparent"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            className="text-gray-100"
                                        />
                                        <circle
                                            cx="64" cy="64" r="58"
                                            fill="transparent"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            strokeDasharray={364.4}
                                            strokeDashoffset={364.4 - (364.4 * sendingProgress.current / sendingProgress.total)}
                                            className="text-[#21AC96] transition-all duration-300"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-gray-900">{Math.round((sendingProgress.current / sendingProgress.total) * 100)}%</span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enviando</span>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-gray-900">Enviando mensajes...</h4>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                        {sendingProgress.current} de {sendingProgress.total} contactos procesados
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 p-4 rounded-2xl flex items-center justify-between border border-emerald-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Éxito</span>
                                    </div>
                                    <span className="text-2xl font-black text-emerald-700">{sendingProgress.success}</span>
                                </div>
                                <div className="bg-red-50 p-4 rounded-2xl flex items-center justify-between border border-red-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center text-white">
                                            <AlertCircle className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-black text-red-700 uppercase tracking-widest">Fallidos</span>
                                    </div>
                                    <span className="text-2xl font-black text-red-700">{sendingProgress.failed}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isLoading && step === 'result' && (
                        <div className="space-y-8 py-6">
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-gray-900">¡Campaña Finalizada!</h4>
                                    <p className="text-sm font-bold text-gray-500">Se han procesado todos los contactos seleccionados.</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                                <h5 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-6 flex items-center gap-2">
                                    <Layout className="w-3 h-3" /> Resumen Detallado
                                </h5>
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                                    {sendingResults.map((res, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    res.success ? "bg-emerald-500" : "bg-red-500"
                                                )} />
                                                <span className="text-xs font-bold text-gray-700">{res.contact}</span>
                                            </div>
                                            {res.success ? (
                                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Enviado</span>
                                            ) : (
                                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest" title={res.error}>Error</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-8 bg-gray-50 border-t border-gray-100 sm:justify-between items-center gap-4">
                    <div className="text-left hidden sm:block">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Audiencia actual</p>
                        <p className="text-sm font-black text-gray-900">{selectedContacts.length} Contactos</p>
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
                        >
                            {step === 'result' ? 'Cerrar' : 'Cancelar'}
                        </button>

                        {(step === 'variables' || step === 'review') && (
                            <button
                                onClick={() => step === 'variables' ? setStep('review') : startExecution()}
                                className="flex-1 sm:flex-none px-10 py-3 bg-[#21AC96] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#1E9A86] transition-all shadow-lg shadow-[#21AC96]/20 flex items-center justify-center gap-2 animate-in fade-in"
                            >
                                {step === 'variables' ? 'Siguiente' : 'Iniciar Campaña'}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}

                        {step === 'result' && (
                            <button
                                onClick={onClose}
                                className="flex-1 sm:flex-none px-10 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20"
                            >
                                Finalizar
                            </button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
