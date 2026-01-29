'use client'

import { Bot, MessageSquare, User, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type SearchResult =
    | {
        id: string;
        name: string;
        type: 'agent';
        avatarUrl?: string | null;
    }
    | {
        id: string;
        contactName: string;
        agentName: string;
        channelType: string;
        channelName: string;
        lastMessageAt: Date;
        type: 'conversation';
    }
    | {
        id: string;
        name: string;
        email: string | null;
        lastContact: Date;
        type: 'prospect';
    }
    | {
        id: string;
        name: string;
        email: string | null;
        role: string;
        avatarUrl?: string | null;
        type: 'member';
    };

interface SearchDropdownProps {
    isOpen: boolean;
    query: string;
    results: {
        agents: Array<{
            id: string;
            name: string;
            avatarUrl: string | null;
            type: 'agent';
        }>;
        conversations: Array<{
            id: string;
            contactName: string;
            agentName: string;
            channelType: string;
            channelName: string;
            lastMessageAt: Date;
            type: 'conversation';
        }>;
        prospects: Array<{
            id: string;
            name: string;
            email: string | null;
            lastContact: Date;
            type: 'prospect';
        }>;
        team: Array<{
            id: string;
            name: string;
            email: string | null;
            role: string;
            avatarUrl?: string | null;
            type: 'member';
        }>;
    };
    isLoading?: boolean;
    onClose: () => void;
}

export function SearchDropdown({ isOpen, query, results, isLoading = false, onClose }: SearchDropdownProps) {
    const router = useRouter();

    if (!isOpen || !query || query.trim().length < 2) return null;

    const handleResultClick = (result: any) => {
        switch (result.type) {
            case 'agent':
                router.push(`/agents/${result.id}/profile`);
                break;
            case 'conversation':
                router.push(`/chat?conversationId=${result.id}`);
                break;
            case 'prospect':
                router.push(`/prospects`);
                break;
            case 'member':
                router.push(`/team`);
                break;
        }
        onClose();
    };

    const getChannelIcon = (channelType: string) => {
        switch (channelType) {
            case 'WHATSAPP':
                return '💬';
            case 'WEBCHAT':
                return '🌐';
            case 'INSTAGRAM':
                return '📷';
            case 'MESSENGER':
                return '💌';
            default:
                return '📱';
        }
    };

    const totalResults = results.agents.length + results.conversations.length + results.prospects.length + (results.team?.length || 0);

    return (
        <div className="absolute left-0 top-full mt-2 w-[600px] bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
            {isLoading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#21AC96]"></div>
                </div>
            ) : totalResults > 0 ? (
                <div className="max-h-[500px] overflow-y-auto">
                    {/* Team Members */}
                    {results.team?.length > 0 && (
                        <div className="p-4 border-b border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                                Equipo ({results.team.length})
                            </h3>
                            <div className="space-y-1">
                                {results.team.map((member) => (
                                    <div
                                        key={member.id}
                                        onClick={() => handleResultClick(member)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer group transition-all"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                                            {member.avatarUrl ? (
                                                <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
                                            <p className="text-xs text-gray-500 capitalize">{member.role.toLowerCase()}</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#21AC96] group-hover:translate-x-1 transition-all" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Agents */}
                    {results.agents.length > 0 && (
                        <div className="p-4 border-b border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                                Agentes ({results.agents.length})
                            </h3>
                            <div className="space-y-1">
                                {results.agents.map((agent) => (
                                    <div
                                        key={agent.id}
                                        onClick={() => handleResultClick(agent)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer group transition-all"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                                            {agent.avatarUrl ? (
                                                <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full rounded-xl object-cover" />
                                            ) : (
                                                <Bot className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{agent.name}</p>
                                            <p className="text-xs text-gray-500">Agente</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#21AC96] group-hover:translate-x-1 transition-all" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Conversations */}
                    {results.conversations.length > 0 && (
                        <div className="p-4 border-b border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                                Conversaciones ({results.conversations.length})
                            </h3>
                            <div className="space-y-1">
                                {results.conversations.map((conv) => (
                                    <div
                                        key={conv.id}
                                        onClick={() => handleResultClick(conv)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer group transition-all"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
                                            <MessageSquare className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{conv.contactName}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{conv.agentName}</span>
                                                <span>•</span>
                                                <span>{getChannelIcon(conv.channelType)} {conv.channelName}</span>
                                                {conv.lastMessageAt && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{format(new Date(conv.lastMessageAt), 'd MMM', { locale: es as any })}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#21AC96] group-hover:translate-x-1 transition-all" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Prospects */}
                    {results.prospects.length > 0 && (
                        <div className="p-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                                Prospectos ({results.prospects.length})
                            </h3>
                            <div className="space-y-1">
                                {results.prospects.map((prospect) => (
                                    <div
                                        key={prospect.id}
                                        onClick={() => handleResultClick(prospect)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer group transition-all"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center text-white flex-shrink-0">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{prospect.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                {prospect.email && <span>{prospect.email}</span>}
                                                {prospect.email && prospect.lastContact && <span>•</span>}
                                                {prospect.lastContact && (
                                                    <span>Último contacto: {format(new Date(prospect.lastContact), 'd MMM', { locale: es as any })}</span>
                                                )}
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#21AC96] group-hover:translate-x-1 transition-all" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <Bot className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm font-bold text-gray-600 mb-1">No se encontraron resultados</p>
                    <p className="text-xs text-gray-400">Intenta con otros términos de búsqueda</p>
                </div>
            )}
        </div>
    );
}

