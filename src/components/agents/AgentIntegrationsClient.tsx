'use client';

import { useState } from 'react';
import { initiateGoogleAuth, deleteIntegration, saveOdooIntegration } from '@/lib/actions/integrations';
import { Loader2, CheckCircle2, Trash2, AlertTriangle, Globe, Database, User, Key, Search, Sparkles, LayoutGrid } from 'lucide-react';
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
    const [odooConfig, setOdooConfig] = useState({
        url: '',
        db: '',
        username: '',
        apiKey: ''
    });

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
    ];

    const onDemandIntegrations: Integration[] = [
        {
            id: 'ALTAPLAZA',
            name: 'Altaplaza - Konsul API',
            description: 'Integración privada para registro y consulta de facturas',
            icon: '🛍️',
            color: 'blue',
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
        } catch (error) {
            console.error('Activation error:', error);
            toast.error('Error al iniciar la activación.');
        } finally {
            setIsLoading(null);
        }
    };

    const handleAltaplazaConnect = () => {
        if (altaplazaPassword === 'ALtaplaza2026@.') {
            toast.success('¡Acceso concedido! Conectando con Altaplaza...');
            setTimeout(() => {
                setIsAltaplazaModalOpen(false);
                setAltaplazaPassword('');
                toast.success('Integración con Altaplaza activada correctamente.');
            }, 1000);
        } else {
            toast.error('Contraseña incorrecta. Acceso denegado.');
        }
    };

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
                        Soportadas
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
                            className={`bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${integration.isComingSoon ? 'opacity-80' : ''}`}
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
                                        'Reconectar'
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
                <DialogContent className="max-w-md w-full bg-white rounded-[2.5rem] p-6 md:p-10 border-none shadow-2xl">
                    <DialogHeader className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 mb-6 transition-transform hover:scale-110 duration-300 mx-auto">
                            <span className="text-4xl text-center">🛍️</span>
                        </div>
                        <DialogTitle className="text-center text-2xl font-black text-gray-900 tracking-tight w-full flex justify-center">
                            Altaplaza - Konsul API
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
                                    type="password"
                                    placeholder="Ingrese la contraseña"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                                    value={altaplazaPassword}
                                    onChange={(e) => setAltaplazaPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAltaplazaConnect()}
                                />
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
                            disabled={!altaplazaPassword}
                            className="flex-[1.5] rounded-2xl h-12 text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                        >
                            Activar Integración
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isOdooModalOpen} onOpenChange={setIsOdooModalOpen}>
                <DialogContent className="max-w-md w-full bg-white rounded-[2.5rem] p-6 md:p-10 border-none shadow-2xl">
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

            <Dialog open={!!integrationToDelete} onOpenChange={(open) => !open && setIntegrationToDelete(null)}>
                <DialogContent className="max-w-md w-full bg-white rounded-[2.5rem] p-6 md:p-10 border-none shadow-2xl">
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
        </div>
    );
}
