'use client'

import { useState, useEffect } from 'react';
import { X, MessageSquare, User, Calendar, Bot, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProspectDetailsModal } from '@/components/prospects/ProspectDetailsModal';
import { getProspectDetails } from '@/lib/actions/dashboard';

interface Conversation {
    id: string;
    contactName: string | null;
    externalId: string;
    createdAt: Date | string;
    agent: {
        id: string;
        name: string;
    };
    channel: {
        type: string;
        displayName: string;
    } | null;
    _count: {
        messages: number;
    };
}

interface ConversationsDayModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversations: Conversation[];
    date: Date | string;
    isLoading?: boolean;
}

export function ConversationsDayModal({ isOpen, onClose, conversations, date, isLoading = false }: ConversationsDayModalProps) {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [modalData, setModalData] = useState<any>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    const handleConversationClick = async (conversationId: string) => {
        setSelectedConversationId(conversationId);
        setIsLoadingDetails(true);
        setModalData(null);

        try {
            const data = await getProspectDetails(conversationId);
            setModalData(data);
        } catch (error) {
            console.error("Error fetching conversation details:", error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleCloseDetails = () => {
        setSelectedConversationId(null);
        setModalData(null);
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const formattedDate = format(dateObj, "EEEE, d 'de' MMMM", { locale: es });

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-[#21AC96]/5 to-transparent">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#21AC96]/10 flex items-center justify-center text-[#21AC96]">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-extrabold text-gray-900">Conversaciones del {format(dateObj, 'd MMM', { locale: es })}</h2>
                                <p className="text-sm text-gray-400 font-medium capitalize">{formattedDate}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
                        >
                            <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="mb-4 px-4 py-2 bg-gray-50 rounded-xl">
                            <p className="text-sm font-bold text-gray-700">
                                Total: <span className="text-[#21AC96]">{conversations.length}</span> conversaciones
                            </p>
                        </div>

                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="animate-pulse">
                                        <div className="h-20 bg-gray-100 rounded-2xl"></div>
                                    </div>
                                ))}
                            </div>
                        ) : conversations.length > 0 ? (
                            <div className="space-y-3">
                                {conversations.map((conv) => (
                                    <div
                                        key={conv.id}
                                        onClick={() => handleConversationClick(conv.id)}
                                        className="p-4 bg-gray-50/50 rounded-2xl hover:bg-gray-100 hover:shadow-md transition-all cursor-pointer group border border-transparent hover:border-[#21AC96]/20"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#21AC96] to-[#1a8a78] flex items-center justify-center text-white font-bold shadow-lg shadow-[#21AC96]/20 group-hover:scale-110 transition-transform">
                                                    {(conv.contactName || conv.externalId).charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-base font-extrabold text-gray-900 truncate">
                                                            {conv.contactName || conv.externalId}
                                                        </h3>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                                                        <div className="flex items-center gap-1.5">
                                                            <Bot className="w-3.5 h-3.5 text-[#21AC96]" />
                                                            <span>{conv.agent.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                                                            <span>{conv._count.messages} mensajes</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                            <span>{format(new Date(conv.createdAt), 'HH:mm', { locale: es })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#21AC96] transition-colors flex-shrink-0" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                                    <MessageSquare className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="text-sm text-gray-400 font-bold">No hay conversaciones este día</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Prospect Details Modal */}
            {selectedConversationId && (
                <ProspectDetailsModal
                    isOpen={!!selectedConversationId}
                    onClose={handleCloseDetails}
                    prospectData={modalData}
                    isLoading={isLoadingDetails}
                />
            )}
        </>
    );
}


