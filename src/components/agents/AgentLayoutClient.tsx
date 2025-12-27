'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

interface AgentLayoutClientProps {
    agentId: string;
    agentName: string;
    tabs: Tab[];
    userRole: 'OWNER' | 'MANAGER' | 'AGENT' | null;
}

export function AgentLayoutClient({ agentId, agentName, tabs, userRole }: AgentLayoutClientProps) {
    // Check if user can manage agents (OWNER or MANAGER)
    const canManage = userRole === 'OWNER' || userRole === 'MANAGER';
    const pathname = usePathname();
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);

    return (
        <div className="space-y-10">
            {/* Action Bar */}
            <div className="flex justify-end">
                <button
                    onClick={() => setIsTestModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95 font-bold text-sm"
                >
                    <Play className="w-4 h-4" />
                    Probar Agente
                </button>
            </div>

            {/* Tabs Nav */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-2">
                <div className="flex overflow-x-auto scrollbar-hide gap-1">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.href;
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={cn(
                                    "flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap",
                                    isActive
                                        ? 'bg-[#21AC96]/10 text-[#21AC96] shadow-sm'
                                        : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                                )}
                            >
                                <span className="text-lg">{tab.icon}</span>
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
