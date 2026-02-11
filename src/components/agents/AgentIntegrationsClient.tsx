'use client';

import { useState } from 'react';
import { initiateGoogleAuth } from '@/lib/actions/integrations';
import { Loader2, CheckCircle2, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

interface AgentIntegrationsClientProps {
    agentId: string;
    existingIntegrations: any[];
}

export function AgentIntegrationsClient({ agentId, existingIntegrations }: AgentIntegrationsClientProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const integrations = [
        {
            id: 'GOOGLE_CALENDAR',
            name: 'Google Calendar',
            description: 'Sincroniza y gestiona eventos automáticamente',
            icon: '📅',
            color: 'purple',
        },
        {
            id: 'ZOHO',
            name: 'Zoho CRM',
            description: 'Crea leads y contactos automáticamente desde el chat',
            icon: '🟠',
            color: 'orange',
        },
        {
            id: 'CRM_SYNC',
            name: 'CRM Sync',
            description: 'Sincroniza tus prospectos con HubSpot, Pipedrive o Salesforce',
            icon: '🔄',
            color: 'blue',
            isComingSoon: true,
        },
    ];

    const handleActivate = async (provider: string, isComingSoon?: boolean) => {
        if (isComingSoon) {
            toast.info(`La integración con ${provider} estará disponible próximamente.`);
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
        } catch (error) {
            console.error('Activation error:', error);
            toast.error('Error al iniciar la activación.');
        } finally {
            setIsLoading(null);
        }
    };

    const isEnabled = (provider: string) => {
        return existingIntegrations.find(i => i.provider === provider && i.enabled);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {integrations.map((integration) => {
                const active = isEnabled(integration.id);
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

                        <button
                            onClick={() => handleActivate(integration.id, integration.isComingSoon)}
                            disabled={!!isLoading || integration.isComingSoon}
                            className={`w-full px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2
                                ${integration.isComingSoon
                                    ? 'bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed'
                                    : active
                                        ? 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100'
                                        : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'
                                }
                            `}
                        >
                            {isLoading === integration.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : integration.isComingSoon ? (
                                'Bloqueado'
                            ) : active ? (
                                'Configurar'
                            ) : (
                                'Activar integración'
                            )}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
