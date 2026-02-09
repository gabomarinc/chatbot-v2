'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { testAgent } from '@/lib/actions/testing';
import { toast } from 'sonner';

interface Message {
    id: string;
    role: 'USER' | 'AGENT';
    content: string;
    createdAt: Date;
}

interface TestAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    agentId: string;
    agentName: string;
}

export function TestAgentModal({ isOpen, onClose, agentId, agentName }: TestAgentModalProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [visitorId] = useState(() => `test-${Math.random().toString(36).slice(2, 9)}`);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Usually we need a channelId to use sendWidgetMessage. 
    // We'll search for the first active channel of the agent.
    const [channelId, setChannelId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // In a real scenario, we might want to fetch an active channel or have a special "internal" channel
            // For now, we'll assume there's a way to get it or we'll need to pass it.
            // Let's look for a channel in the parent or pass it as prop.
        }
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'USER',
            content: input,
            createdAt: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Map the current state messages into a simplified role/content format
            const history = messages.map(m => ({
                role: m.role,
                content: m.content
            }));

            const data = await testAgent(agentId, input, visitorId, history);

            const agentMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'AGENT',
                content: data.agentMsg.content,
                createdAt: new Date()
            };

            setMessages(prev => [...prev, agentMsg]);
        } catch (error) {
            console.error('[TestAgentModal] Error:', error);

            // Display error message in chat instead of just a toast
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'AGENT',
                content: `❌ Error: ${error instanceof Error ? error.message : 'Error desconocido al procesar la solicitud'}`,
                createdAt: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);

            toast.error('Error al enviar mensaje de prueba');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-end p-4 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white w-full max-w-lg h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">
                {/* Header */}
                <div className="px-8 py-6 bg-gray-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#21AC96] rounded-xl flex items-center justify-center">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="font-extrabold text-lg tracking-tight">{agentName}</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                Modo Prueba
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Messages Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/50">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-gray-200 shadow-sm">
                                <MessageSquare className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-gray-900 font-extrabold text-lg">Prueba tu Agente</h3>
                                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                                    Hazle preguntas para verificar si está usando correctamente el conocimiento de los entrenamientos.
                                </p>
                            </div>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div key={msg.id} className={cn(
                            "flex items-start gap-3",
                            msg.role === 'USER' ? "flex-row-reverse" : ""
                        )}>
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
                                msg.role === 'USER' ? "bg-gray-900 text-white" : "bg-[#21AC96] text-white"
                            )}>
                                {msg.role === 'USER' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div className={cn(
                                "max-w-[80%] p-4 rounded-2xl text-sm font-medium leading-relaxed",
                                msg.role === 'USER'
                                    ? "bg-gray-900 text-white rounded-tr-none shadow-lg shadow-gray-900/10"
                                    : "bg-white text-gray-900 rounded-tl-none shadow-sm border border-gray-100"
                            )}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#21AC96] text-white flex items-center justify-center shadow-sm">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                                <Loader2 className="w-5 h-5 animate-spin text-[#21AC96]" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-8 bg-white border-t border-gray-100">
                    <div className="relative group">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Haz una pregunta..."
                            className="w-full pl-6 pr-14 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:bg-white focus:border-[#21AC96] transition-all font-medium"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 top-2 w-10 h-10 bg-[#21AC96] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all active:scale-90 disabled:opacity-50"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
