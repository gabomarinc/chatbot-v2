'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';
import { useState } from 'react';
import { TestAgentModal } from './TestAgentModal';

interface Tab {
    id: string;
    label: string;
    icon: string;
    href: string;
}

import { AgentTour } from './AgentTour';

// ... (previous imports)

interface AgentLayoutClientProps {
    agentId: string;
    agentName: string;
    tabs: Tab[];
    userRole: 'OWNER' | 'MANAGER' | 'AGENT' | null;
    hasSeenTour: boolean;
}

export function AgentLayoutClient({ agentId, agentName, tabs, userRole, hasSeenTour }: AgentLayoutClientProps) {
    // Check if user can manage agents (OWNER or MANAGER)
    const canManage = userRole === 'OWNER' || userRole === 'MANAGER';
    const pathname = usePathname();
    const router = useRouter(); // Import useRouter
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [configMode, setConfigMode] = useState<'BASIC' | 'ADVANCED'>('BASIC');

    const basicTabs = ['profile', 'job', 'training', 'channels'];
    const visibleTabs = configMode === 'BASIC'
        ? tabs.filter(t => basicTabs.includes(t.id))
        : tabs.filter(t => !basicTabs.includes(t.id));

    return (
        <div className="space-y-10">
            <AgentTour hasSeenTour={hasSeenTour} />

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Config Toggle */}
                <div id="config-toggle" className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Configuración</span>
                    <div className="flex bg-gray-100/80 rounded-xl p-1 gap-1">
                        <button
                            onClick={() => {
                                setConfigMode('BASIC');
                                router.push(`/agents/${agentId}/profile`);
                            }}
                            id="config-basic"
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                configMode === 'BASIC'
                                    ? 'bg-white text-[#21AC96] shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600'
                            )}
                        >
                            Básica
                        </button>
                        <button
                            onClick={() => {
                                setConfigMode('ADVANCED');
                                router.push(`/agents/${agentId}/settings`);
                            }}
                            id="config-advanced"
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                configMode === 'ADVANCED'
                                    ? 'bg-white text-[#21AC96] shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600'
                            )}
                        >
                            Avanzada
                        </button>
                    </div>
                </div>

                <button
                    id="test-agent-btn"
                    onClick={() => setIsTestModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95 font-bold text-sm"
                >
                    <Play className="w-4 h-4" />
                    Probar Agente
                </button>
            </div>

            {/* Tabs Nav */}
            <div className="bg-white rounded-[1.5rem] md:rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-1.5 md:p-2">
                <div className="flex overflow-x-auto no-scrollbar gap-1 px-1">
                    {visibleTabs.map((tab) => {
                        const isActive = pathname === tab.href;
                        return (
                            <Link
                                id={`tab-${tab.id}`}
                                key={tab.id}
                                href={tab.href}
                                className={cn(
                                    "flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl text-[13px] md:text-sm font-bold transition-all whitespace-nowrap",
                                    isActive
                                        ? 'bg-[#21AC96]/10 text-[#21AC96] shadow-sm'
                                        : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                                )}
                            >
                                <span className="text-base md:text-lg">{tab.icon}</span>
                                {tab.label}
                            </Link>
                        );
                    })}
                </div>
            </div>

            <TestAgentModal
                isOpen={isTestModalOpen}
                onClose={() => setIsTestModalOpen(false)}
                agentId={agentId}
                agentName={agentName}
            />
        </div>
    );
}
