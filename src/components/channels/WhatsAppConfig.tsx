'use client';

import { useState } from 'react';
import { createChannel, updateChannel } from '@/lib/actions/dashboard';
import { Loader2, Check, Phone, Copy, ArrowRight, ShieldCheck, Settings2, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { WhatsAppEmbeddedSignup } from './WhatsAppEmbeddedSignup';
import { YcloudSetup } from './YcloudSetup';
import { getWhatsAppTemplates, sendWhatsAppTemplateAction, deleteWhatsAppTemplateAction } from '@/lib/actions/whatsapp-auth';
import { useEffect } from 'react';
import { TemplateManager } from './TemplateManager';
import { Trash2, AlertCircle, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface Agent {
    id: string;
    name: string;
}

interface WhatsAppConfigProps {
    agents: Agent[];
    existingChannel?: any;
    metaAppId?: string;
    defaultAgentId?: string;
}

export function WhatsAppConfig({ agents, existingChannel, metaAppId, defaultAgentId }: WhatsAppConfigProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [templates, setTemplates] = useState<any[]>([]);
    const [isFetchingTemplates, setIsFetchingTemplates] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [isSendingTest, setIsSendingTest] = useState<string | null>(null);
    const [showTemplateManager, setShowTemplateManager] = useState(false);

    // Test Param State
    const [testTemplate, setTestTemplate] = useState<any | null>(null);
    const [testParams, setTestParams] = useState<{ [key: string]: string }>({});
    const [headerParam, setHeaderParam] = useState<string>('');

    const handleDeleteTemplate = async (templateName: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar la plantilla "${templateName}"?`)) return;

        const wabaId = formData.wabaId || existingChannel?.configJson?.wabaId;
        const accessToken = formData.accessToken || existingChannel?.configJson?.accessToken;

        if (!wabaId || !accessToken) return;

        try {
            const result = await deleteWhatsAppTemplateAction({
                wabaId,
                accessToken,
                name: templateName
            });

            if (result.success) {
                toast.success('Plantilla eliminada');
                fetchTemplates();
            } else {
                toast.error(result.error || 'Error al eliminar plantilla');
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            toast.error('Error al eliminar');
        }
    };

    const prepareTest = (template: any) => {
        setTestTemplate(template);
        setTestParams({});
        setHeaderParam('');
    };

    const executeSendTest = async () => {
        if (!testPhone) {
            toast.error('Ingresa un número de teléfono de prueba');
            return;
        }

        if (!testTemplate) return;

        const phoneNumberId = formData.phoneNumberId || existingChannel?.configJson?.phoneNumberId;
        const accessToken = formData.accessToken || existingChannel?.configJson?.accessToken;

        if (!phoneNumberId || !accessToken) return;

        setIsSendingTest(testTemplate.name);
        try {
            // Construct Components from params
            const components = [];

            // Body Params
            const bodyParams = Object.keys(testParams)
                .sort()
                .map(key => ({
                    type: 'text',
                    text: testParams[key]
                }));

            if (bodyParams.length > 0) {
                components.push({
                    type: 'body',
                    parameters: bodyParams
                });
            }

            // Header Param (Text only for now as MVP)
            if (headerParam) {
                components.push({
                    type: 'header',
                    parameters: [{
                        type: 'text',
                        text: headerParam
                    }]
                });
            }

            const result = await sendWhatsAppTemplateAction({
                phoneNumberId,
                accessToken,
                to: testPhone,
                templateName: testTemplate.name,
                languageCode: testTemplate.language,
                components: components.length > 0 ? components : undefined
            });

            if (result.success) {
                toast.success('Plantilla de prueba enviada');
                setTestTemplate(null);
            } else {
                toast.error(result.error || 'Error al enviar prueba');
            }
        } catch (error) {
            console.error('Error sending test:', error);
        } finally {
            setIsSendingTest(null);
        }
    };


    const [formData, setFormData] = useState({
        agentId: existingChannel?.agentId || defaultAgentId || (agents.length > 0 ? agents[0].id : ''),
        displayName: existingChannel?.displayName || 'WhatsApp Business',
        accessToken: existingChannel?.configJson?.accessToken || '',
        phoneNumberId: existingChannel?.configJson?.phoneNumberId || '',
        wabaId: existingChannel?.configJson?.wabaId || '',
        verifyToken: existingChannel?.configJson?.verifyToken || Math.random().toString(36).substring(7),
    });

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast.success(`${field} copiado al portapapeles`);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const fetchTemplates = async () => {
        const wabaId = formData.wabaId || existingChannel?.configJson?.wabaId;
        const accessToken = formData.accessToken || existingChannel?.configJson?.accessToken;

        if (!wabaId || !accessToken) return;

        setIsFetchingTemplates(true);
        try {
            const result = await getWhatsAppTemplates(wabaId, accessToken);
            if (result.success) {
                setTemplates(result.templates);
            } else {
                toast.error(result.error || 'Error al obtener plantillas');
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
        } finally {
            setIsFetchingTemplates(false);
        }
    };



    useEffect(() => {
        if (existingChannel?.configJson?.wabaId && existingChannel?.configJson?.accessToken) {
            fetchTemplates();
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.accessToken || !formData.phoneNumberId) {
            toast.error('Token y Phone Number ID son obligatorios');
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                agentId: formData.agentId,
                displayName: formData.displayName,
                type: 'WHATSAPP' as const,
                configJson: {
                    accessToken: formData.accessToken,
                    phoneNumberId: formData.phoneNumberId,
                    wabaId: formData.wabaId,
                    verifyToken: formData.verifyToken
                },
                isActive: true
            };

            if (existingChannel) {
                await updateChannel(existingChannel.id, {
                    displayName: formData.displayName,
                    configJson: payload.configJson
                });
            } else {
                await createChannel(payload);
            }

            setIsSaved(true);
            toast.success('Configuración de WhatsApp guardada');
            router.refresh();
            setTimeout(() => setIsSaved(false), 3000);
        } catch (error) {
            console.error('Error saving WhatsApp:', error);
            toast.error('Error al guardar la configuración');
        } finally {
            setIsLoading(false);
        }
    };

    const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/whatsapp`;

    // Automatic Setup Mode (Default if App ID exists and Manual Mode not requested)
    if (metaAppId && !showManual && !existingChannel) {
        // New Selection State
        const [connectionMethod, setConnectionMethod] = useState<'SELECTION' | 'OFFICIAL' | 'YCLOUD'>('SELECTION');

        if (connectionMethod === 'SELECTION') {
            return (
                <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center p-4 bg-green-100 rounded-3xl mb-6 shadow-sm">
                            <Phone className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-4">Conectar WhatsApp</h2>
                        <p className="text-gray-500 text-xl font-medium max-w-xl mx-auto leading-relaxed">
                            Selecciona el método de conexión que mejor se adapte a tu negocio.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {/* Official Connection Card */}
                        <div
                            onClick={() => setConnectionMethod('OFFICIAL')}
                            className="group relative bg-white rounded-[2.5rem] p-8 border-2 border-gray-100 hover:border-green-500 hover:shadow-2xl hover:shadow-green-500/10 transition-all cursor-pointer overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                                    <ShieldCheck className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-gray-900">Oficial (Meta)</h3>
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wide rounded ml-1">Recomendado</span>
                                </div>
                            </div>

                            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6">
                                Conexión directa con Meta.
                                <br />
                                <span className="text-gray-400 text-xs">• Requiere Facebook Login</span>
                                <br />
                                <span className="text-gray-400 text-xs">• Precios estándar de Meta</span>
                            </p>

                            <div className="w-full py-3 bg-gray-50 text-gray-400 rounded-xl text-sm font-bold group-hover:bg-green-600 group-hover:text-white transition-colors text-center">
                                Seleccionar
                            </div>
                        </div>

                        {/* Ycloud Connection Card */}
                        <div
                            onClick={() => setConnectionMethod('YCLOUD')}
                            className="group relative bg-white rounded-[2.5rem] p-8 border-2 border-gray-100 hover:border-[#0057FF] hover:shadow-2xl hover:shadow-[#0057FF]/10 transition-all cursor-pointer overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0057FF]/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#0057FF] group-hover:scale-110 transition-transform">
                                    <Settings2 className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-gray-900">Rápida (Ycloud)</h3>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide rounded ml-1">Alternative</span>
                                </div>
                            </div>

                            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6">
                                Conexión vía partner Ycloud.
                                <br />
                                <span className="text-gray-400 text-xs">• Setup con API Key</span>
                                <br />
                                <span className="text-gray-400 text-xs">• Ideal high-volume / testing</span>
                            </p>

                            <div className="w-full py-3 bg-gray-50 text-gray-400 rounded-xl text-sm font-bold group-hover:bg-[#0057FF] group-hover:text-white transition-colors text-center">
                                Seleccionar
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (connectionMethod === 'YCLOUD') {
            return (
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                    <button
                        onClick={() => setConnectionMethod('SELECTION')}
                        className="flex items-center gap-2 text-gray-400 font-extrabold text-sm uppercase tracking-widest hover:text-green-600 transition-colors group mb-6"
                    >
                        <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform rotate-180" />
                        Volver a Selección
                    </button>

                    <YcloudSetup
                        agentId={formData.agentId || (agents.length > 0 ? agents[0].id : '')}
                        existingChannel={existingChannel}
                        onSuccess={() => router.refresh()}
                        onCancel={() => setConnectionMethod('SELECTION')}
                    />
                </div>
            );
        }

        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl shadow-green-500/20 relative overflow-hidden group">
                    {/* Back button to selection */}
                    <button
                        onClick={() => setConnectionMethod('SELECTION')}
                        className="absolute top-8 left-8 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-20"
                    >
                        <ArrowRight className="w-5 h-5 text-white rotate-180" />
                    </button>

                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-fullblur-[80px] -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-1000"></div>
                    <div className="relative z-10 text-center">
                        <div className="inline-flex items-center justify-center p-4 bg-white/20 backdrop-blur-md rounded-3xl mb-6 shadow-inner">
                            <Phone className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-4xl font-black tracking-tight text-white mb-4">Conexión Oficial</h2>
                        <p className="text-green-50 text-xl font-medium max-w-xl mx-auto leading-relaxed">
                            Vincula tu número de WhatsApp Business en un clic para automatizar tus respuestas con IA.
                        </p>
                    </div>
                </div>

                {/* Agent Selector */}
                <div className="max-w-md mx-auto">
                    <label className="text-sm font-extrabold text-gray-400 uppercase tracking-widest mb-3 block text-center">
                        Agente Responsable
                    </label>
                    <div className="relative">
                        <select
                            value={formData.agentId}
                            onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                            className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-gray-900 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all appearance-none cursor-pointer text-center pr-10 hover:border-green-200 shadow-sm"
                        >
                            {agents.map(agent => (
                                <option key={agent.id} value={agent.id}>{agent.name}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                            <ArrowRight className="w-5 h-5 rotate-90" />
                        </div>
                    </div>
                </div>

                {/* Embedded Signup Button */}
                <div className="max-w-md mx-auto">
                    <WhatsAppEmbeddedSignup
                        appId={metaAppId}
                        agentId={formData.agentId}
                        configId={existingChannel?.configJson?.configId || "1388941242686989"}
                        onSuccess={() => router.refresh()}
                    />
                </div>

                {/* Manual Link */}
                <div className="text-center pt-8">
                    <button
                        onClick={() => setShowManual(true)}
                        className="text-gray-400 text-xs font-bold hover:text-green-600 uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-full hover:bg-green-50"
                    >
                        <Settings2 className="w-4 h-4" />
                        Configuración Manual Avanzada
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl shadow-green-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-fullblur-[80px] -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-1000"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                            <Phone className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black tracking-tight text-white mb-2">WhatsApp Business</h2>
                            <div className="flex items-center gap-2 text-green-100 font-medium">
                                <span className="px-2 py-0.5 rounded-md bg-green-500/50 border border-green-400/50 text-xs font-bold uppercase tracking-wider">OFFICIAL API</span>
                                <span>Integración Directa</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-green-50 text-lg max-w-2xl font-medium leading-relaxed">
                        Configura manualmente tus credenciales de la API de WhatsApp Cloud para un control total.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Configuration Form */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm space-y-8">

                        {/* Agent Selection */}
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wider">
                                Agente Responsable
                            </label>
                            <div className="relative">
                                <select
                                    name="agentId"
                                    value={formData.agentId}
                                    onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                                    className="w-full pl-5 pr-10 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 font-medium focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all appearance-none cursor-pointer hover:bg-white"
                                    required
                                >
                                    <option value="">Selecciona un Agente...</option>
                                    {agents.map(agent => (
                                        <option key={agent.id} value={agent.id}>
                                            {agent.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <ArrowRight className="w-5 h-5 rotate-90" />
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gray-100"></div>

                        {/* Credentials */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-green-600" />
                                </div>
                                <h3 className="text-gray-900 font-bold text-lg">Credenciales de Meta</h3>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                        System User Access Token (Permanente)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={formData.accessToken}
                                            onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                                            placeholder="EAAG..."
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 font-mono text-sm focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all pr-12"
                                            required={!existingChannel}
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                                            <Info className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1.5 bg-green-50 inline-block px-3 py-1.5 rounded-lg border border-green-100">
                                        <Info className="w-3.5 h-3.5" />
                                        Requiere permisos `whatsapp_business_messaging`
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                            Phone Number ID
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.phoneNumberId}
                                            onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                                            placeholder="102030..."
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 font-mono text-sm focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all"
                                            required={!existingChannel}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                            WABA ID (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.wabaId}
                                            onChange={(e) => setFormData({ ...formData, wabaId: e.target.value })}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 font-mono text-sm focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gray-100"></div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-5 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-6 h-6" />
                                    {existingChannel ? 'Actualizar Configuración' : 'Conectar WhatsApp'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Templates Management Section */}
                    {existingChannel && (
                        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm space-y-8 mt-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                        <Copy className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h3 className="text-gray-900 font-bold text-lg">Plantillas de Mensaje (Templates)</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowTemplateManager(true)}
                                        className="px-4 py-2 text-xs font-bold bg-green-600 text-white hover:bg-green-500 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Crear Plantilla
                                    </button>
                                    <button
                                        onClick={fetchTemplates}
                                        disabled={isFetchingTemplates}
                                        className="px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center gap-2"
                                    >
                                        {isFetchingTemplates ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings2 className="w-3.5 h-3.5" />}
                                        Actualizar
                                    </button>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                Las plantillas son obligatorias para iniciar conversaciones o responder después de 24 horas.
                                <strong> Meta revisa que nuestra app pueda gestionar estos activos.</strong>
                            </p>

                            <div className="space-y-4">
                                <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 items-end">
                                    <div className="flex-1 space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Número de Prueba</label>
                                        <input
                                            type="text"
                                            value={testPhone}
                                            onChange={(e) => setTestPhone(e.target.value)}
                                            placeholder="Ej: 521..."
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="text-xs text-gray-400 italic mb-3">
                                        Formato internacional sin +
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {templates.length === 0 && !isFetchingTemplates && (
                                        <div className="text-center py-8 text-gray-400 italic text-sm">
                                            No se encontraron plantillas aprobadas en esta cuenta.
                                        </div>
                                    )}

                                    {templates.map((template) => (
                                        <div key={template.id} className="group relative flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900">{template.name}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${template.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {template.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                                    <span className="uppercase">{template.category}</span>
                                                    <span>•</span>
                                                    <span>{template.language}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDeleteTemplate(template.name)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar plantilla"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => prepareTest(template)}
                                                    disabled={isSendingTest === template.name}
                                                    className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                                >
                                                    {isSendingTest === template.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                                                    Probar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Back to Simple Mode Link */}
                    {metaAppId && !existingChannel && (
                        <div className="text-center">
                            <button
                                onClick={() => setShowManual(false)}
                                className="text-green-600 text-xs font-bold hover:text-green-700 uppercase tracking-widest transition-colors inline-flex items-center gap-2 px-4 py-2 rounded-full hover:bg-green-50"
                            >
                                ← Volver a Conexión Simple
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar Guide */}
                <div className="space-y-6">
                    {/* Webhook Info Card */}
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 blur-[50px] rounded-full"></div>

                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Configuración Webhook
                        </h3>

                        <div className="space-y-6 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Callback URL</label>
                                <div className="flex items-center gap-2 bg-slate-800/50 p-3 rounded-xl border border-white/5 group hover:border-green-500/30 transition-colors">
                                    <code className="text-xs font-mono text-green-300 flex-1 truncate">
                                        {webhookUrl}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(webhookUrl, 'URL')}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                                    >
                                        {copiedField === 'URL' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verify Token</label>
                                <div className="flex items-center gap-2 bg-slate-800/50 p-3 rounded-xl border border-white/5 group hover:border-green-500/30 transition-colors">
                                    <code className="text-xs font-mono text-green-300 flex-1 truncate">
                                        {formData.verifyToken}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(formData.verifyToken, 'Token')}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                                    >
                                        {copiedField === 'Token' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 pt-1">
                                    Usa este token para verificar el webhook en Meta.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Steps Card */}
                    <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-6">Guía Rápida</h3>
                        <div className="space-y-6">
                            {[
                                { title: 'Crea una App en Meta', desc: 'Tipo Negocios (Business)' },
                                { title: 'Añade el producto WhatsApp', desc: 'En la configuración de la app' },
                                { title: 'Genera el Token', desc: 'System User Token permanente' },
                                { title: 'Configura el Webhook', desc: 'Usa la URL y Token de arriba. Suscríbete a "messages".' }
                            ].map((step, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-sm font-bold text-green-600">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{step.title}</p>
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* Template Manager Overlay */}
            {showTemplateManager && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <TemplateManager
                        wabaId={formData.wabaId || existingChannel?.configJson?.wabaId}
                        accessToken={formData.accessToken || existingChannel?.configJson?.accessToken}
                        onSuccess={() => {
                            setShowTemplateManager(false);
                            fetchTemplates();
                        }}
                        onCancel={() => setShowTemplateManager(false)}
                    />
                </div>
            )}

            {/* Test Template Dialog */}
            <Dialog open={!!testTemplate} onOpenChange={(open) => !open && setTestTemplate(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Probar Plantilla: {testTemplate?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Número de Destino</Label>
                            <Input
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                placeholder="521..."
                            />
                        </div>

                        {/* Detect Variables in Body */}
                        {testTemplate?.components?.find((c: any) => c.type === 'BODY')?.text?.match(/{{(\d+)}}/g)?.map((match: string, idx: number) => {
                            const varNum = match.replace(/[{}]/g, '');
                            return (
                                <div key={idx} className="space-y-2">
                                    <Label>Variable {varNum} (Body)</Label>
                                    <Input
                                        value={testParams[varNum] || ''}
                                        onChange={(e) => setTestParams(prev => ({ ...prev, [varNum]: e.target.value }))}
                                        placeholder={`Valor para {{${varNum}}}`}
                                    />
                                </div>
                            );
                        })}

                        {/* Detect Header Text Variable (Simplified detection) */}
                        {testTemplate?.components?.find((c: any) => c.type === 'HEADER' && c.format === 'TEXT' && c.text.includes('{{1}}')) && (
                            <div className="space-y-2">
                                <Label>Variable Header</Label>
                                <Input
                                    value={headerParam}
                                    onChange={(e) => setHeaderParam(e.target.value)}
                                    placeholder="Valor para el Encabezado"
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setTestTemplate(null)}>Cancelar</Button>
                            <Button onClick={executeSendTest} disabled={isSendingTest === testTemplate?.name}>
                                {isSendingTest === testTemplate?.name && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Enviar Prueba
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
