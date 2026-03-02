'use client';

import { useState, useEffect } from 'react';
import { initiateGoogleAuth, deleteIntegration, saveOdooIntegration, saveAltaplazaIntegration, getIntegrationStats, saveNeonCatalogIntegration, testNeonCatalogConnection, testEmailIMAPConnection, saveEmailIMAPIntegration } from '@/lib/actions/integrations';
import { analyzeInbox } from '@/lib/actions/email-analysis';
import { Loader2, CheckCircle2, Trash2, AlertTriangle, Globe, Database, User, Key, Search, Sparkles, LayoutGrid, Terminal, Mail, Server, ShieldCheck, ShieldAlert, BrainCircuit, RotateCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AgentIntegrationsClientProps {
    agentId: string;
    existingIntegrations: any[];
}

export function AgentIntegrationsClient({ agentId, existingIntegrations }: AgentIntegrationsClientProps) {
    const [activeTab, setActiveTab] = useState<'standard' | 'on-demand'>('standard');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [integrationToDelete, setIntegrationToDelete] = useState<string | null>(null);
    const [isOdooModalOpen, setIsOdooModalOpen] = useState(false);
    const [isAltaplazaModalOpen, setIsAltaplazaModalOpen] = useState(false);
    const [altaplazaPassword, setAltaplazaPassword] = useState('');
    const [showAltaplazaPassword, setShowAltaplazaPassword] = useState(false);
    const [integrationStats, setIntegrationStats] = useState<any>(null);
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const [odooConfig, setOdooConfig] = useState({
        url: '',
        db: '',
        username: '',
        apiKey: ''
    });
    const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isNeonModalOpen, setIsNeonModalOpen] = useState(false);
    const [neonConfig, setNeonConfig] = useState({
        connectionString: '',
        tableName: '',
        description: 'Consulta de precios y productos en base de datos externa.'
    });
    const [isTestingNeon, setIsTestingNeon] = useState(false);
    const [neonTestResult, setNeonTestResult] = useState<{ ok: boolean; columns?: string[]; error?: string } | null>(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailConfig, setEmailConfig] = useState({
        host: '',
        port: 993,
        secure: true,
        user: '',
        password: ''
    });
    const [isTestingEmail, setIsTestingEmail] = useState(false);
    const [emailTestResult, setEmailTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
    const [isAnalyzingEmail, setIsAnalyzingEmail] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);

    interface Integration {
        id: string;
        name: string;
        description: string;
        icon: string;
        color: string;
        isComingSoon?: boolean;
    }

    const integrations: Integration[] = [
        {
            id: 'ZOHO',
            name: 'Zoho CRM',
            description: 'Crea leads y contactos automáticamente desde el chat',
            icon: '🟠',
            color: 'orange',
        },
        {
            id: 'ODOO',
            name: 'Odoo CRM',
            description: 'Conecta tu instancia de Odoo para sincronizar leads y notas',
            icon: '🟣',
            color: 'purple',
        },
        {
            id: 'HUBSPOT',
            name: 'HubSpot CRM',
            description: 'Sincroniza contactos y tratos con tu cuenta de HubSpot',
            icon: '🟠',
            color: 'orange',
        },
        {
            id: 'GOOGLE_CALENDAR',
            name: 'Google Calendar',
            description: 'Sincroniza y gestiona eventos automáticamente',
            icon: '📅',
            color: 'purple',
            isComingSoon: true,
        },
        {
            id: 'EMAIL_IMAP',
            name: 'Analista de Correo',
            description: 'Conecta tu cuenta IMAP para que la IA analice tus correos y extraiga insights',
            icon: '📧',
            color: 'blue',
        },
    ];

    const onDemandIntegrations: Integration[] = [
        {
            id: 'ALTAPLAZA',
            name: 'Altaplaza - Kônsul API',
            description: 'Integración privada para registro y consulta de facturas',
            icon: '🛍️',
            color: 'blue',
        },
        {
            id: 'NEON_CATALOG',
            name: 'Neon DB - Catálogo de Precios',
            description: 'Consulta directa a tu base de datos Neon para precios y stock en tiempo real',
            icon: '🐘',
            color: 'teal',
        }
    ];

    const filteredOnDemand = onDemandIntegrations.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleActivate = async (provider: string, isComingSoon?: boolean) => {
        if (isComingSoon) {
            toast.info(`La integración con ${provider} estará disponible próximamente.`);
            return;
        }

        if (provider === 'ALTAPLAZA') {
            setIsAltaplazaModalOpen(true);
            return;
        }

        if (provider === 'NEON_CATALOG') {
            const existing = existingIntegrations.find(i => i.provider === 'NEON_CATALOG');
            if (existing && existing.configJson) {
                setNeonConfig(existing.configJson as any);
            }
            setIsNeonModalOpen(true);
            return;
        }

        setIsLoading(provider);
        try {
            if (provider === 'GOOGLE_CALENDAR') {
                const { url } = await initiateGoogleAuth(agentId);
                window.location.href = url;
            }
            if (provider === 'ZOHO') {
                window.location.href = `/api/oauth/zoho?agentId=${agentId}`;
            }
            if (provider === 'ODOO') {
                setIsOdooModalOpen(true);
            }
            if (provider === 'HUBSPOT') {
                window.location.href = `/api/oauth/hubspot?agentId=${agentId}`;
            }
            if (provider === 'EMAIL_IMAP') {
                const existing = existingIntegrations.find(i => i.provider === 'EMAIL_IMAP');
                if (existing && existing.configJson) {
                    setEmailConfig(existing.configJson as any);
                }
                setIsEmailModalOpen(true);
            }
        } catch (error) {
            console.error('Activation error:', error);
            toast.error('Error al iniciar la activación.');
        } finally {
            setIsLoading(null);
        }
    };

    const handleAltaplazaConnect = async () => {
        if (altaplazaPassword === 'ALtaplaza2026@.') {
            setIsLoading('ALTAPLAZA');
            try {
                await saveAltaplazaIntegration(agentId);
                toast.success('¡Acceso concedido! Integración con Altaplaza activada.');
                setIsAltaplazaModalOpen(false);
                setAltaplazaPassword('');
                window.location.reload();
            } catch (error) {
                console.error('Altaplaza connect error:', error);
                toast.error('Error al activar la integración.');
            } finally {
                setIsLoading(null);
            }
        } else {
            toast.error('Contraseña incorrecta. Acceso denegado.');
        }
    };
    const fetchStats = async () => {
        if (isDetailsModalOpen && selectedIntegration) {
            const active = isEnabled(selectedIntegration.id);
            if (active) {
                setIsStatsLoading(true);
                try {
                    const stats = await getIntegrationStats(agentId, selectedIntegration.id as any);
                    setIntegrationStats(stats);
                } catch (error) {
                    console.error('Error fetching stats:', error);
                } finally {
                    setIsStatsLoading(false);
                }
            } else {
                setIntegrationStats(null);
            }
        }
    };

    useEffect(() => {
        fetchStats();
        if (!isDetailsModalOpen) {
            setSelectedIntegration(null);
        }
    }, [isDetailsModalOpen, selectedIntegration, agentId]);

    const handleDisconnectClick = (activeIntegrationId: string) => {
        setIntegrationToDelete(activeIntegrationId);
    };

    const confirmDisconnect = async () => {
        if (!integrationToDelete) return;

        setIsLoading(integrationToDelete);
        try {
            await deleteIntegration(integrationToDelete);
            toast.success('Integración desconectada correctamente.');
            window.location.reload();
        } catch (error) {
            console.error('Disconnect error:', error);
            toast.error('Error al desconectar.');
        } finally {
            setIsLoading(null);
            setIntegrationToDelete(null);
        }
    };

    const handleSaveOdoo = async () => {
        setIsLoading('ODOO');
        try {
            await saveOdooIntegration(agentId, odooConfig);
            toast.success('Integración con Odoo guardada correctamente.');
            setIsOdooModalOpen(false);
            window.location.reload();
        } catch (error: any) {
            console.error('Odoo save error:', error);
            toast.error(error.message || 'Error al guardar la integración.');
        } finally {
            setIsLoading(null);
        }
    };

    const handleTestNeon = async () => {
        if (!neonConfig.connectionString || !neonConfig.tableName) {
            toast.error('Completa los campos de conexión y tabla.');
            return;
        }
        setIsTestingNeon(true);
        setNeonTestResult(null);
        try {
            const res = await testNeonCatalogConnection(neonConfig.connectionString, neonConfig.tableName);
            setNeonTestResult(res);
            if (res.ok) {
                toast.success('Conexión exitosa.');
            } else {
                toast.error('Error de conexión: ' + res.error);
            }
        } catch (err: any) {
            toast.error('Error al probar conexión.');
        } finally {
            setIsTestingNeon(false);
        }
    };

    const handleSaveNeon = async () => {
        setIsLoading('NEON_CATALOG');
        try {
            await saveNeonCatalogIntegration(agentId, neonConfig);
            toast.success('Configuración de Neon guardada.');
            setIsNeonModalOpen(false);
            window.location.reload();
        } catch (error: any) {
            toast.error('Error al guardar configuración.');
        } finally {
            setIsLoading(null);
        }
    };

    const handleTestEmail = async () => {
        if (!emailConfig.host || !emailConfig.user || !emailConfig.password) {
            toast.error('Completa los campos de servidor, usuario y contraseña.');
            return;
        }
        setIsTestingEmail(true);
        setEmailTestResult(null);
        try {
            const res = await testEmailIMAPConnection(emailConfig);
            setEmailTestResult(res);
            if (res.ok) {
                toast.success('Conexión IMAP exitosa.');
            } else {
                toast.error('Error de conexión IMAP: ' + res.error);
            }
        } catch (err: any) {
            toast.error('Error al probar conexión de correo.');
        } finally {
            setIsTestingEmail(false);
        }
    };

    const handleSaveEmail = async () => {
        setIsLoading('EMAIL_IMAP');
        try {
            await saveEmailIMAPIntegration(agentId, emailConfig);
            toast.success('Analista de Correo configurado correctamente.');
            setIsEmailModalOpen(false);
            window.location.reload();
        } catch (error: any) {
            toast.error('Error al guardar configuración de correo.');
        } finally {
            setIsLoading(null);
        }
    };

    const handleRunAnalysis = async () => {
        setIsAnalyzingEmail(true);
        setAnalysisResult(null);
        try {
            const res = await analyzeInbox(agentId);
            if (res.success) {
                setAnalysisResult(res.summary || null);
                toast.success('Análisis completado con éxito.');
            } else {
                toast.error('Error en el análisis: ' + res.error);
            }
        } catch (error) {
            toast.error('Error al ejecutar el analista de inbox.');
        } finally {
            setIsAnalyzingEmail(false);
        }
    };

    const isEnabled = (provider: string) => {
        return existingIntegrations.find(i => i.provider === provider && i.enabled);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm">
                <div className="flex p-1 bg-gray-50 rounded-2xl w-full md:w-auto">
                    <button
                        onClick={() => setActiveTab('standard')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl capitalize text-sm font-black transition-all ${activeTab === 'standard' ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Oficiales
                    </button>
                    <button
                        onClick={() => setActiveTab('on-demand')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl capitalize text-sm font-black transition-all ${activeTab === 'on-demand' ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Sparkles className="w-4 h-4" />
                        On Demand
                    </button>
                </div>

                {activeTab === 'on-demand' && (
                    <div className="relative w-full md:w-72 pr-2">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <Input
                            placeholder="Buscar integraciones..."
                            className="bg-gray-50 border-none rounded-xl pl-10 h-10 text-xs font-bold"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
                {(activeTab === 'standard' ? integrations : filteredOnDemand).map((integration) => {
                    const activeIntegration = isEnabled(integration.id);
                    const active = !!activeIntegration;

                    return (
                        <div
                            key={integration.id}
                            onClick={() => {
                                if (!integration.isComingSoon) {
                                    setSelectedIntegration(integration);
                                    setIsDetailsModalOpen(true);
                                }
                            }}
                            className={`bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98] ${integration.isComingSoon ? 'opacity-80 cursor-not-allowed' : ''}`}
                        >
                            {active && (
                                <div className="absolute top-0 right-0 p-4">
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                </div>
                            )}

                            {integration.isComingSoon && (
                                <div className="absolute top-0 right-0 p-4">
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                        Próximamente
                                    </span>
                                </div>
                            )}

                            <div className={`text-5xl mb-6 transition-all transform group-hover:scale-110 duration-500 origin-left ${integration.isComingSoon ? 'grayscale' : 'grayscale group-hover:grayscale-0'}`}>
                                {integration.icon}
                            </div>

                            <h3 className="text-gray-900 text-xl font-black mb-2 tracking-tight">
                                {integration.name}
                            </h3>
                            <p className="text-sm text-gray-400 font-bold leading-relaxed mb-8">
                                {integration.description}
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleActivate(integration.id, integration.isComingSoon)}
                                    disabled={!!isLoading || integration.isComingSoon}
                                    className={`flex-1 px-4 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2
                                    ${integration.isComingSoon
                                            ? 'bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed'
                                            : active
                                                ? 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100'
                                                : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'
                                        }
                                `}
                                >
                                    {isLoading === integration.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : integration.isComingSoon ? (
                                        'Bloqueado'
                                    ) : active ? (
                                        'Gestionar'
                                    ) : (
                                        'Activar'
                                    )}
                                </button>

                                {active && (
                                    <button
                                        onClick={() => handleDisconnectClick(activeIntegration.id)}
                                        disabled={!!isLoading}
                                        className="px-4 py-4 rounded-2xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all cursor-pointer flex items-center justify-center"
                                        title="Desconectar"
                                    >
                                        {isLoading === activeIntegration.id ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-5 h-5" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Dialog open={isAltaplazaModalOpen} onOpenChange={setIsAltaplazaModalOpen}>
                <DialogContent className="max-w-md w-[95%] sm:w-full bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-10 border-none shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
                    <DialogHeader className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 mb-6 transition-transform hover:scale-110 duration-300 mx-auto">
                            <span className="text-4xl text-center">🛍️</span>
                        </div>
                        <DialogTitle className="text-center text-2xl font-black text-gray-900 tracking-tight w-full flex justify-center">
                            Altaplaza - Kônsul API
                        </DialogTitle>
                        <DialogDescription className="text-center text-gray-400 font-bold leading-relaxed pt-2 w-full max-w-sm mx-auto">
                            Integración robusta diseñada para Altaplaza. Registra facturas, consulta estados de cuenta y sincroniza data en tiempo real.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-8">
                        <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100/50 flex justify-center">
                            <ul className="text-xs font-bold text-blue-700 space-y-3 inline-block">
                                <li className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0" />
                                    Conectar con el núcleo de Altaplaza
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0" />
                                    Registrar facturas automáticamente
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0" />
                                    Consultar historial de facturas
                                </li>
                            </ul>
                        </div>

                        <div className="group space-y-2 pt-2 flex flex-col items-center">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 w-full text-center group-focus-within:text-indigo-600 transition-colors">
                                Contraseña de Activación
                            </label>
                            <div className="relative w-full">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-indigo-400 transition-colors" />
                                <input
                                    type={showAltaplazaPassword ? "text" : "password"}
                                    placeholder="Ingrese la contraseña"
                                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                                    value={altaplazaPassword}
                                    onChange={(e) => setAltaplazaPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAltaplazaConnect()}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowAltaplazaPassword(!showAltaplazaPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none"
                                >
                                    {showAltaplazaPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-row items-center gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsAltaplazaModalOpen(false)}
                            className="flex-1 rounded-2xl h-12 text-xs font-black uppercase tracking-widest border-gray-100 hover:bg-gray-50 transition-all"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleAltaplazaConnect}
                            disabled={!altaplazaPassword || isLoading === 'ALTAPLAZA'}
                            className="flex-[1.5] rounded-2xl h-12 text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading === 'ALTAPLAZA' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Activar Integración'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isOdooModalOpen} onOpenChange={setIsOdooModalOpen}>
                <DialogContent className="max-w-md w-[95%] sm:w-full bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-10 border-none shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
                    <DialogHeader className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 mb-6 transition-transform hover:scale-110 duration-300 mx-auto">
                            <span className="text-4xl text-center">🟣</span>
                        </div>
                        <DialogTitle className="text-center text-2xl font-black text-gray-900 tracking-tight w-full flex justify-center">
                            Conectar Odoo CRM
                        </DialogTitle>
                        <DialogDescription className="text-center text-gray-400 font-bold leading-relaxed pt-2 w-full max-w-sm mx-auto">
                            Ingresa las credenciales de tu instancia de Odoo para comenzar.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-6">
                        <div className="group space-y-2 flex flex-col items-center">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 w-full text-center group-focus-within:text-indigo-600 transition-colors">
                                URL de Instancia
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-indigo-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="https://tu-empresa.odoo.com"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    value={odooConfig.url}
                                    onChange={(e) => setOdooConfig({ ...odooConfig, url: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="group space-y-2 flex flex-col items-center">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 w-full text-center group-focus-within:text-indigo-600 transition-colors">
                                    Base de Datos
                                </label>
                                <div className="relative">
                                    <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="db_name"
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        value={odooConfig.db}
                                        onChange={(e) => setOdooConfig({ ...odooConfig, db: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="group space-y-2 flex flex-col items-center">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 w-full text-center group-focus-within:text-indigo-600 transition-colors">
                                    Usuario (Email)
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        type="email"
                                        placeholder="usuario@email.com"
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        value={odooConfig.username}
                                        onChange={(e) => setOdooConfig({ ...odooConfig, username: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="group space-y-2 flex flex-col items-center">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 w-full text-center group-focus-within:text-indigo-600 transition-colors">
                                API Key
                            </label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-indigo-400 transition-colors" />
                                <input
                                    type="password"
                                    placeholder="••••••••••••••••"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                                    value={odooConfig.apiKey}
                                    onChange={(e) => setOdooConfig({ ...odooConfig, apiKey: e.target.value })}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold px-1">
                                Genera esta clave en tu perfil de Odoo &gt; Seguridad de la cuenta.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-row items-center gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsOdooModalOpen(false)}
                            className="flex-1 rounded-2xl h-12 text-xs font-black uppercase tracking-widest border-gray-100 hover:bg-gray-50 transition-all"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveOdoo}
                            disabled={isLoading === 'ODOO' || !odooConfig.url || !odooConfig.db || !odooConfig.username || !odooConfig.apiKey}
                            className="flex-[1.5] rounded-2xl h-12 text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading === 'ODOO' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Conectar Odoo'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isNeonModalOpen} onOpenChange={setIsNeonModalOpen}>
                <DialogContent className="max-w-md w-[95%] sm:w-full bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-10 border-none shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
                    <DialogHeader className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-50 mb-6 transition-transform hover:scale-110 duration-300 mx-auto">
                            <span className="text-4xl text-center">🐘</span>
                        </div>
                        <DialogTitle className="text-center text-2xl font-black text-gray-900 tracking-tight w-full flex justify-center">
                            Conectar Neon Database
                        </DialogTitle>
                        <DialogDescription className="text-center text-gray-400 font-bold leading-relaxed pt-2 w-full max-w-sm mx-auto">
                            Consulta el catálogo de productos y precios directamente desde tu base de datos Neon.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-6">
                        <div className="group space-y-2 flex flex-col items-center text-left">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 w-full group-focus-within:text-teal-600 transition-colors">
                                Connection String
                            </label>
                            <div className="relative w-full">
                                <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-teal-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="postgres://user:pass@host/db"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                    value={neonConfig.connectionString}
                                    onChange={(e) => setNeonConfig({ ...neonConfig, connectionString: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="group space-y-2 flex flex-col items-center text-left">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 w-full group-focus-within:text-teal-600 transition-colors">
                                Nombre de la Tabla
                            </label>
                            <div className="relative w-full">
                                <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-teal-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="products_table"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                    value={neonConfig.tableName}
                                    onChange={(e) => setNeonConfig({ ...neonConfig, tableName: e.target.value })}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold px-1 w-full">
                                El agente podrá buscar en todos los campos de texto de esta tabla.
                            </p>
                        </div>

                        {neonTestResult && (
                            <div className={`p-4 rounded-2xl border ${neonTestResult.ok ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'} text-xs font-bold animate-fade-in`}>
                                {neonTestResult.ok ? (
                                    <div>
                                        <p className="mb-2 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> Conexión exitosa. Columnas detectadas:
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {neonTestResult.columns?.map(col => (
                                                <span key={col} className="bg-white/50 px-2 py-0.5 rounded-lg border border-green-200">{col}</span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" /> Error: {neonTestResult.error}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex flex-row items-center gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={handleTestNeon}
                            disabled={isTestingNeon || !neonConfig.connectionString || !neonConfig.tableName}
                            className="flex-1 rounded-2xl h-12 text-xs font-black uppercase tracking-widest border-teal-100 text-teal-600 hover:bg-teal-50 transition-all"
                        >
                            {isTestingNeon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Probar'}
                        </Button>
                        <Button
                            onClick={handleSaveNeon}
                            disabled={isLoading === 'NEON_CATALOG' || !neonTestResult?.ok}
                            className={`flex-[1.5] rounded-2xl h-12 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                                ${neonTestResult?.ok ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                            `}
                        >
                            {isLoading === 'NEON_CATALOG' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Guardar'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
                <DialogContent className="max-w-md w-[95%] sm:w-full bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-10 border-none shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
                    <DialogHeader className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 mb-6 transition-transform hover:scale-110 duration-300 mx-auto">
                            <Mail className="h-8 w-8 text-blue-600" />
                        </div>
                        <DialogTitle className="text-center text-2xl font-black text-gray-900 tracking-tight w-full flex justify-center">
                            Conectar Analista de Correo
                        </DialogTitle>
                        <DialogDescription className="text-center text-gray-400 font-bold leading-relaxed pt-2 w-full max-w-sm mx-auto">
                            Configura tu cuenta IMAP para que la IA pueda leer y analizar tus correos.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-6">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 group space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                    Servidor IMAP
                                </label>
                                <div className="relative">
                                    <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="imap.gmail.com"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={emailConfig.host}
                                        onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="group space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                    Puerto
                                </label>
                                <input
                                    type="number"
                                    placeholder="993"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={emailConfig.port}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, port: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="group space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                Usuario / Email
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type="email"
                                    placeholder="usuario@tuempresa.com"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={emailConfig.user}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, user: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="group space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                Contraseña o App Password
                            </label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type="password"
                                    placeholder="••••••••••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                    value={emailConfig.password}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                                />
                            </div>
                            <p className="text-[9px] text-gray-400 font-bold px-1 italic">
                                * Se recomienda usar una "App Password" si usas 2FA.
                            </p>
                        </div>

                        {emailTestResult && (
                            <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fade-in ${emailTestResult.ok ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                {emailTestResult.ok ? <ShieldCheck className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
                                <div className="text-[10px] font-black tracking-tight uppercase">
                                    {emailTestResult.ok ? 'Conexión Segura Establecida' : `Error: ${emailTestResult.error}`}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex flex-row items-center gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={handleTestEmail}
                            disabled={isTestingEmail || !emailConfig.host || !emailConfig.user || !emailConfig.password}
                            className="flex-1 rounded-xl h-12 text-xs font-black uppercase tracking-widest border-blue-100 text-blue-600 hover:bg-blue-50 transition-all"
                        >
                            {isTestingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Probar'}
                        </Button>
                        <Button
                            onClick={handleSaveEmail}
                            disabled={isLoading === 'EMAIL_IMAP' || !emailTestResult?.ok}
                            className={`flex-[1.5] rounded-xl h-12 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                                ${emailTestResult?.ok ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                            `}
                        >
                            {isLoading === 'EMAIL_IMAP' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Guardar'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!integrationToDelete} onOpenChange={(open) => !open && setIntegrationToDelete(null)}>
                <DialogContent className="max-w-md w-[95%] sm:w-full bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-10 border-none shadow-2xl">
                    <DialogHeader className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 mb-6 transition-transform hover:scale-110 duration-300 mx-auto">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                        <DialogTitle className="text-center text-2xl font-black text-gray-900 tracking-tight w-full flex justify-center">
                            ¿Desconectar integración?
                        </DialogTitle>
                        <DialogDescription className="text-center text-gray-400 font-bold leading-relaxed pt-2 w-full max-w-sm mx-auto">
                            Al desconectar, el agente perderá acceso inmediato a esta herramienta.
                            Deberás volver a configurar si quieres usarla de nuevo.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-row items-center gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setIntegrationToDelete(null)}
                            className="flex-1 rounded-2xl h-12 text-xs font-black uppercase tracking-widest border-gray-100 hover:bg-gray-50 transition-all"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDisconnect}
                            className="flex-1 rounded-2xl h-12 text-xs font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Sí, desconectar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
                <DialogContent className="max-w-2xl w-[95%] sm:w-full bg-white rounded-[2rem] md:rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                    {selectedIntegration && (
                        <div className="flex flex-col h-full">
                            {/* Header Section */}
                            <div className="p-6 md:p-10 bg-gray-50/50 border-b border-gray-100 shrink-0">
                                <div className="flex items-center gap-4 md:gap-6">
                                    <div className="flex h-16 w-16 md:h-20 md:w-20 shrink-0 items-center justify-center rounded-2xl md:rounded-[2rem] bg-white shadow-xl shadow-gray-200/50 text-3xl md:text-5xl">
                                        {selectedIntegration.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h2 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight truncate">
                                                {selectedIntegration.name}
                                            </h2>
                                            {isEnabled(selectedIntegration.id) && (
                                                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-600 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-green-100 animate-pulse">
                                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                    Activo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs md:text-gray-400 font-bold leading-relaxed line-clamp-2 md:line-clamp-none">
                                            {selectedIntegration.description}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Status Body - Scrollable */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 no-scrollbar">
                                {isEnabled(selectedIntegration.id) ? (
                                    <div className="space-y-8">
                                        {/* Real-time Status */}
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-2">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Salud de Conexión</span>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${integrationStats?.health === 'WARNING' ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                                                    <span className="text-sm font-black text-gray-900">
                                                        {isStatsLoading ? 'Cargando...' : integrationStats?.health === 'WARNING' ? 'Atención' : 'Excelente'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-2">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sincronización</span>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs md:text-sm font-black text-gray-900">
                                                        {isStatsLoading ? '...' : integrationStats?.lastSync ? new Date(integrationStats.lastSync).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400">
                                                        {isStatsLoading ? '...' : integrationStats?.lastSync ? new Date(integrationStats.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-2 col-span-2 lg:col-span-1">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Eventos</span>
                                                <span className="text-xs md:text-sm font-black text-gray-900 flex items-center gap-2">
                                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                                    {isStatsLoading ? '...' : `${integrationStats?.eventsWeekly || 0} p.`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Features List */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Capacidades del Agente</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="flex items-center gap-3 md:gap-4 p-4 bg-indigo-50/30 rounded-xl md:rounded-2xl border border-indigo-100/50">
                                                    <div className="bg-indigo-600 p-2 rounded-lg md:rounded-xl">
                                                        <Database className="w-3 h-3 md:w-4 md:h-4 text-white" />
                                                    </div>
                                                    <span className="text-xs md:text-sm font-bold text-gray-700">Sincronización de Leads</span>
                                                </div>
                                                <div className="flex items-center gap-3 md:gap-4 p-4 bg-purple-50/30 rounded-xl md:rounded-2xl border border-purple-100/50">
                                                    <div className="bg-purple-600 p-2 rounded-lg md:rounded-xl">
                                                        <User className="w-3 h-3 md:w-4 md:h-4 text-white" />
                                                    </div>
                                                    <span className="text-xs md:text-sm font-bold text-gray-700">Enriquecimiento de Perfiles</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Email Analysis Section (Special feature) */}
                                        {selectedIntegration.id === 'EMAIL_IMAP' && (
                                            <div className="space-y-6 pt-4 animate-fade-in">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                                        <BrainCircuit className="w-4 h-4" />
                                                        Analista de Inbox Inteligente
                                                    </h4>
                                                    <Button
                                                        onClick={handleRunAnalysis}
                                                        disabled={isAnalyzingEmail}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest px-4 h-9 shadow-lg shadow-blue-100 transition-all flex items-center gap-2"
                                                    >
                                                        {isAnalyzingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                                                        {isAnalyzingEmail ? 'Analizando...' : 'Ejecutar Análisis'}
                                                    </Button>
                                                </div>

                                                {analysisResult ? (
                                                    <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 shadow-inner relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-4">
                                                            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                                                        </div>
                                                        <div className="prose prose-sm max-w-none prose-slate prose-headings:font-black prose-headings:tracking-tight prose-p:font-bold prose-p:text-gray-500 text-sm leading-relaxed">
                                                            {analysisResult.split('\n').map((line, i) => (
                                                                <p key={i} className="mb-2 last:mb-0">{line}</p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : isAnalyzingEmail ? (
                                                    <div className="flex flex-col items-center justify-center py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 animate-bounce">
                                                            <Mail className="w-8 h-8 text-blue-400" />
                                                        </div>
                                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Leyendo correos y extrayendo insights...</p>
                                                    </div>
                                                ) : (
                                                    <div className="bg-blue-50/30 p-8 rounded-3xl border border-blue-100/50 flex flex-col items-center text-center gap-3">
                                                        <p className="text-sm font-bold text-blue-700/70 max-w-sm">
                                                            Pulsa el botón de arriba para que la IA escanee tu bandeja de entrada y genere un reporte de oportunidades.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-6 md:space-y-8">
                                        {/* Promotional Content */}
                                        <div className="bg-indigo-50/50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-indigo-100 flex flex-col items-center text-center gap-4">
                                            <div className="h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-xl md:rounded-2xl bg-indigo-600 flex shadow-lg shadow-indigo-200">
                                                <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-indigo-50" />
                                            </div>
                                            <div className="max-w-sm">
                                                <h4 className="text-lg md:text-xl font-black text-indigo-900 mb-1 md:mb-2">Desbloquea el poder del CRM</h4>
                                                <p className="text-xs md:text-sm font-bold text-indigo-600/80 leading-relaxed px-2">
                                                    Al activar esta integración, tu agente podrá gestionar datos técnicos y sincronizar la información del cliente en tiempo real.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                            <div className="flex gap-4 p-4 md:p-6 bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm">
                                                <div className="w-10 h-10 shrink-0 rounded-xl bg-gray-50 flex items-center justify-center text-xl">✅</div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-[13px] md:text-sm">Instalación Rápida</p>
                                                    <p className="text-[10px] md:text-xs font-bold text-gray-400">Configura en menos de 2 minutos.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 p-4 md:p-6 bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm">
                                                <div className="w-10 h-10 shrink-0 rounded-xl bg-gray-50 flex items-center justify-center text-xl">🛡️</div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-[13px] md:text-sm">Seguridad de Datos</p>
                                                    <p className="text-[10px] md:text-xs font-bold text-gray-400">Encriptación de punto a punto.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 md:p-10 border-t border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsDetailsModalOpen(false)}
                                    className="w-full sm:w-auto px-8 rounded-2xl h-12 md:h-14 text-[10px] md:text-xs font-black uppercase tracking-widest border-gray-200 hover:bg-white transition-all shadow-sm order-2 sm:order-1"
                                >
                                    Cerrar
                                </Button>

                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1 justify-end order-1 sm:order-2">
                                    {isEnabled(selectedIntegration.id) ? (
                                        <>
                                            <Button
                                                onClick={() => {
                                                    const integration = isEnabled(selectedIntegration.id);
                                                    if (integration) {
                                                        setIsDetailsModalOpen(false);
                                                        handleDisconnectClick(integration.id);
                                                    }
                                                }}
                                                variant="outline"
                                                className="w-full sm:w-auto px-6 rounded-2xl h-12 md:h-14 text-[10px] md:text-xs font-black uppercase tracking-widest border-red-100 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Desconectar
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setIsDetailsModalOpen(false);
                                                    handleActivate(selectedIntegration.id);
                                                }}
                                                className="w-full sm:w-auto sm:min-w-[140px] rounded-2xl h-12 md:h-14 text-[10px] md:text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 transition-all"
                                            >
                                                Configurar
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            onClick={() => {
                                                setIsDetailsModalOpen(false);
                                                handleActivate(selectedIntegration.id);
                                            }}
                                            className="w-full sm:w-auto sm:px-12 rounded-2xl h-12 md:h-14 text-[10px] md:text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 transition-all"
                                        >
                                            Activar Ahora
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
