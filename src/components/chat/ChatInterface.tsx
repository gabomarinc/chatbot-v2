'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Send, MoreVertical, Phone, Video, UserPlus, X, Calendar, MessageCircle, Bot, Paperclip, User, Hand, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getChatMessages } from '@/lib/actions/dashboard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AssignConversationModal } from './AssignConversationModal';
import { assumeConversation, delegateToBot } from '@/lib/actions/conversations';
import { useRouter } from 'next/navigation';

interface Message {
    id: string;
    role: 'USER' | 'AGENT' | 'HUMAN';
    content: string;
    createdAt: Date;
}

interface Conversation {
    id: string;
    agent: { name: string; avatar?: string };
    lastMessageAt: Date | null;
    messages: Message[];
    _count: { messages: number };
    contactName?: string | null;
    externalId: string;
    status: 'OPEN' | 'PENDING' | 'CLOSED';
    channel?: { type: string; displayName: string };
    assignedTo?: string | null;
    assignedUser?: { id: string; name: string | null; email: string } | null;
}

interface TeamMember {
    id: string;
    user: {
        id: string;
        name: string | null;
        email: string;
    };
}

interface ChatInterfaceProps {
    initialConversations: Conversation[];
    initialConversationId?: string;
    teamMembers: TeamMember[];
    currentUserId?: string;
    userRole?: 'OWNER' | 'MANAGER' | 'AGENT' | null;
}

export function ChatInterface({ initialConversations, initialConversationId, teamMembers, currentUserId, userRole }: ChatInterfaceProps) {
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(initialConversationId || null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeConversation = conversations.find(c => c.id === selectedConvId);

    useEffect(() => {
        if (selectedConvId) {
            loadMessages(selectedConvId);
        }
    }, [selectedConvId]);

    const loadMessages = async (id: string) => {
        setIsLoadingMessages(true);
        try {
            const msgs = await getChatMessages(id);
            // Transform date strings to Date objects if needed
            setMessages(msgs.map(m => ({ ...m, createdAt: new Date(m.createdAt) })) as any);
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        // Mock local send for immediate feedback
        const tempMsg: Message = {
            id: Date.now().toString(),
            role: 'HUMAN', // Acting as human operator
            content: newMessage,
            createdAt: new Date()
        };

        setMessages(prev => [...prev, tempMsg]);
        setNewMessage('');
        // NOTE: Real implementation would verify with server
    };

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden mx-6 mb-6 animate-fade-in">
            {/* Sidebar List */}
            <div className="w-80 border-r border-gray-100 flex flex-col bg-white">
                <div className="p-6 border-b border-gray-50">
                    <div className="relative group">
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1E9A86] transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar chats..."
                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#1E9A86]/5 focus:bg-white focus:border-[#1E9A86] transition-all font-medium placeholder-gray-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => setSelectedConvId(conv.id)}
                            className={cn(
                                "w-full p-4 rounded-2xl flex items-start gap-4 transition-all text-left group border border-transparent hover:border-gray-100",
                                selectedConvId === conv.id
                                    ? "bg-[#1E9A86]/5 border-[#1E9A86]/10 shadow-sm"
                                    : "hover:bg-gray-50"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-105 shadow-sm",
                                selectedConvId === conv.id
                                    ? "bg-gradient-to-br from-[#1E9A86] to-[#158571] text-white shadow-[#1E9A86]/20"
                                    : "bg-gray-100 text-gray-500"
                            )}>
                                {conv.channel?.type === 'WHATSAPP' ? '📱' : '💬'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className={cn(
                                            "text-sm font-bold truncate",
                                            selectedConvId === conv.id ? "text-gray-900" : "text-gray-700"
                                        )}>
                                            {conv.contactName || conv.externalId}
                                        </span>
                                        {conv.assignedUser && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1E9A86]/10 text-[#1E9A86] rounded-lg text-[10px] font-bold border border-[#1E9A86]/20 shrink-0">
                                                <User className="w-3 h-3" />
                                                {conv.assignedUser.name || conv.assignedUser.email.split('@')[0]}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium shrink-0">
                                        {conv.lastMessageAt ? format(new Date(conv.lastMessageAt), 'HH:mm') : ''}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 truncate font-medium">
                                    {conv.messages[0]?.content || 'Sin mensajes'}
                                </p>
                            </div>
                        </button>
                    ))}

                    {conversations.length === 0 && (
                        <div className="text-center py-10 px-6">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                                <MessageCircle className="w-6 h-6" />
                            </div>
                            <p className="text-xs text-gray-400 font-medium">No hay conversaciones activas</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            {selectedConvId && activeConversation ? (
                <div className="flex-1 flex flex-col bg-[#F8FAFC]">
                    {/* Chat Header */}
                    <div className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#1E9A86] to-[#158571] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#1E9A86]/20 font-bold text-lg">
                                {activeConversation.contactName?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                                <h3 className="text-gray-900 text-sm font-extrabold">{activeConversation.contactName || activeConversation.externalId}</h3>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "w-1.5 h-1.5 rounded-full animate-pulse",
                                        activeConversation.assignedUser ? "bg-blue-500" : "bg-green-500"
                                    )}></span>
                                    <p className="text-xs text-gray-500 font-medium">
                                        {activeConversation.assignedUser 
                                            ? `Manejada por ${activeConversation.assignedUser.name || activeConversation.assignedUser.email.split('@')[0]}`
                                            : `Atendido por ${activeConversation.agent.name} (Bot)`
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2.5 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-gray-600 hover:scale-105 active:scale-95">
                                <Phone className="w-5 h-5" />
                            </button>
                            <button className="p-2.5 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-gray-600 hover:scale-105 active:scale-95">
                                <Video className="w-5 h-5" />
                            </button>
                            <button className="p-2.5 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-gray-600 hover:scale-105 active:scale-95">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Feed */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        {isLoadingMessages ? (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm font-medium animate-pulse">
                                Cargando historial...
                            </div>
                        ) : messages.length > 0 ? (
                            messages.map((msg, i) => {
                                const isAgent = msg.role === 'AGENT';
                                const isHuman = msg.role === 'HUMAN';
                                const isUser = msg.role === 'USER';
                                return (
                                    <div key={msg.id} className={cn("flex w-full", isUser ? 'justify-start' : 'justify-end')}>
                                        <div className={cn(
                                            "max-w-[70%] space-y-1",
                                            isUser ? 'order-1' : 'order-2'
                                        )}>
                                            <div className={cn(
                                                "p-4 shadow-sm text-sm font-medium leading-relaxed",
                                                isAgent || isHuman
                                                    ? "bg-gradient-to-br from-[#1E9A86] to-[#158571] text-white rounded-[1.25rem] rounded-tr-none shadow-[#1E9A86]/10"
                                                    : "bg-white text-gray-800 border border-gray-100 rounded-[1.25rem] rounded-tl-none"
                                            )}>
                                                {msg.content}
                                            </div>
                                            <div className={cn(
                                                "flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider",
                                                isUser ? "justify-start pl-2" : "justify-end pr-2"
                                            )}>
                                                {isAgent && <Bot className="w-3 h-3" />}
                                                {isHuman && <span className="text-[#1E9A86]">Tú</span>}
                                                <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center text-gray-300">
                                    <MessageCircle className="w-8 h-8" />
                                </div>
                                <span className="font-medium">No hay mensajes aún</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-white border-t border-gray-100">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                            <button type="button" className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Escribe un mensaje..."
                                className="flex-1 bg-gray-50 border-0 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1E9A86]/20 transition-all placeholder-gray-400"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="p-4 bg-[#1E9A86] text-white rounded-2xl shadow-lg shadow-[#1E9A86]/20 hover:bg-[#158571] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 text-gray-400 p-8 text-center animate-fade-in">
                    <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                        <MessageCircle className="w-10 h-10 text-[#1E9A86]/40" />
                    </div>
                    <h3 className="text-gray-900 font-extrabold text-xl mb-2">Selecciona una conversación</h3>
                    <p className="max-w-xs text-gray-500 font-medium">Elige un chat de la lista para ver el historial y responder en tiempo real.</p>
                </div>
            )}

            {/* Right Info Panel (Optional/Collapsible) */}
            {selectedConvId && activeConversation && (
                <div className="w-80 bg-white border-l border-gray-100 hidden xl:flex flex-col p-6 overflow-y-auto">
                    <div className="text-center mb-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-inner">
                            👤
                        </div>
                        <h3 className="text-gray-900 font-extrabold text-lg mb-1">{activeConversation.contactName || 'Desconocido'}</h3>
                        <p className="text-sm text-gray-500 font-medium">{activeConversation.externalId}</p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Asignación</label>
                            {activeConversation.assignedUser ? (
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-xs text-gray-500 font-medium mb-2">Asignada a:</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-[#1E9A86] to-[#158571] rounded-lg flex items-center justify-center">
                                            <User className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                {activeConversation.assignedUser.name || activeConversation.assignedUser.email.split('@')[0]}
                                            </p>
                                            {activeConversation.assignedUser.name && (
                                                <p className="text-xs text-gray-500 truncate">{activeConversation.assignedUser.email}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                                    <p className="text-xs text-yellow-700 font-medium">No asignada - El bot está manejando la conversación</p>
                                </div>
                            )}
                            
                            {/* Asumir Conversación - Solo mostrar si NO está asignada */}
                            {!activeConversation.assignedUser && (
                                <button 
                                    onClick={async () => {
                                        if (!selectedConvId || isProcessing) return;
                                        setIsProcessing(true);
                                        try {
                                            const result = await assumeConversation(selectedConvId);
                                            if (result.error) {
                                                alert(result.error);
                                            } else {
                                                router.refresh();
                                            }
                                        } catch (error) {
                                            console.error('Error assuming conversation:', error);
                                            alert('Error al asumir la conversación');
                                        } finally {
                                            setIsProcessing(false);
                                        }
                                    }}
                                    disabled={isProcessing}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-[#1E9A86] text-white rounded-xl hover:bg-[#158571] transition-colors font-bold text-xs group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Hand className="w-4 h-4" />
                                    {isProcessing ? 'Procesando...' : 'Asumir Conversación'}
                                </button>
                            )}

                            {/* Delegar Conversación - Solo mostrar si está asignada Y es del usuario actual */}
                            {activeConversation.assignedUser && activeConversation.assignedUser.id === currentUserId && (
                                <button 
                                    onClick={async () => {
                                        if (!selectedConvId || isProcessing) return;
                                        setIsProcessing(true);
                                        try {
                                            const result = await delegateToBot(selectedConvId);
                                            if (result.error) {
                                                alert(result.error);
                                            } else {
                                                router.refresh();
                                            }
                                        } catch (error) {
                                            console.error('Error delegating to bot:', error);
                                            alert('Error al delegar la conversación');
                                        } finally {
                                            setIsProcessing(false);
                                        }
                                    }}
                                    disabled={isProcessing}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors font-bold text-xs group disabled:opacity-50 disabled:cursor-not-allowed border border-blue-200"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {isProcessing ? 'Procesando...' : 'Delegar al Bot'}
                                </button>
                            )}

                            {/* Cambiar asignación - Solo para OWNER/MANAGER o si está asignada */}
                            {(userRole === 'OWNER' || userRole === 'MANAGER' || activeConversation.assignedUser) && (
                                <button 
                                    onClick={() => setIsAssignModalOpen(true)}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-bold text-xs group"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    {activeConversation.assignedUser ? 'Cambiar asignación' : 'Asignar a otro'}
                                </button>
                            )}
                            <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-bold text-xs group">
                                <Calendar className="w-4 h-4 text-gray-400 group-hover:text-[#1E9A86] transition-colors" />
                                Agendar cita
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors font-bold text-xs group">
                                <X className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                                Cerrar atención
                            </button>
                        </div>

                        <div className="border-t border-gray-100 pt-6 space-y-4">
                            <div>
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Canal</label>
                                <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    {activeConversation.channel?.type || 'WEBCHAT'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Estado</label>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                    {activeConversation.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Conversation Modal */}
            {selectedConvId && (
                <AssignConversationModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    conversationId={selectedConvId}
                    currentAssignedUserId={activeConversation?.assignedTo || null}
                    teamMembers={teamMembers}
                    currentUserId={currentUserId}
                    userRole={userRole}
                />
            )}
        </div>
    );
}
