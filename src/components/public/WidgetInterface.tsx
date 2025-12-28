'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Message {
    id: string;
    role: 'USER' | 'AGENT' | 'HUMAN';
    content: string;
    createdAt: Date;
}

interface WidgetInterfaceProps {
    channel: {
        id: string;
        displayName: string;
        configJson: any;
        agent: {
            name: string;
        };
    };
}

export function WidgetInterface({ channel }: WidgetInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const config = channel.configJson || {};
    const primaryColor = config.color || '#21AC96';

    useEffect(() => {
        // Use welcome message if no history (TODO: Fetch history based on session/cookie)
        if (messages.length === 0 && config.welcomeMessage) {
            setMessages([{
                id: 'welcome',
                role: 'AGENT',
                content: config.welcomeMessage,
                createdAt: new Date()
            }]);
        }
    }, [config.welcomeMessage, messages.length]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const content = newMessage;
        setNewMessage('');

        // 1. Visitor ID Management
        let visitorId = localStorage.getItem('konsul_visitor_id');
        if (!visitorId) {
            visitorId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('konsul_visitor_id', visitorId);
        }

        // 2. Optimistic UI
        const tempId = Date.now().toString();
        const userMsg: Message = {
            id: tempId,
            role: 'USER',
            content: content,
            createdAt: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            // 3. Send to Server
            // Dynamically import to avoid server-only issues if any (though Next.js handles this)
            const { sendWidgetMessage } = await import('@/lib/actions/widget');

            const { userMsg: savedUserMsg, agentMsg } = await sendWidgetMessage({
                channelId: channel.id,
                content: content,
                visitorId
            });

            // 4. Update UI with Real Agent Reply (only if bot responded)
            // If agentMsg is null, it means a human is handling the conversation
            if (agentMsg) {
                const realAgentMsg: Message = {
                    id: agentMsg.id,
                    role: 'AGENT',
                    content: agentMsg.content,
                    createdAt: new Date(agentMsg.createdAt)
                };
                setMessages(prev => [...prev, realAgentMsg]);
            }
            setIsLoading(false);

        } catch (error) {
            console.error('Error sending message:', error);
            setIsLoading(false);
            
            // Remove the optimistic message on error
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            
            // Show error message to user
            const errorMsg: Message = {
                id: `error-${Date.now()}`,
                role: 'AGENT',
                content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
                createdAt: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            {/* Header */}
            <div
                className="h-16 px-4 flex items-center gap-3 shadow-md z-10 text-white"
                style={{ backgroundColor: primaryColor }}
            >
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-white uppercase backdrop-blur-sm">
                    {channel.agent.name.charAt(0)}
                </div>
                <div>
                    <h1 className="font-bold text-sm tracking-wide">{config.title || channel.displayName}</h1>
                    <div className="flex items-center gap-1.5 opacity-90">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                        <span className="text-xs font-medium">En línea</span>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.map((msg) => {
                    const isUser = msg.role === 'USER';
                    return (
                        <div key={msg.id} className={cn("flex w-full", isUser ? 'justify-end' : 'justify-start')}>
                            <div className={cn(
                                "max-w-[85%] px-4 py-3 text-sm shadow-sm",
                                isUser
                                    ? "bg-white text-gray-800 rounded-[1.25rem] rounded-tr-none border border-gray-100" // User style (White Bubble)
                                    : "text-white rounded-[1.25rem] rounded-tl-none shadow-md" // Agent style (Primary Color)
                            )}
                                style={!isUser ? { backgroundColor: primaryColor } : {}}
                            >
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                <span className={cn(
                                    "text-[10px] block mt-1 font-medium opacity-70",
                                    isUser ? "text-right text-gray-400" : "text-left text-white/80"
                                )}>
                                    {format(msg.createdAt, 'HH:mm')}
                                </span>
                            </div>
                        </div>
                    );
                })}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="px-4 py-3 bg-white rounded-[1.25rem] rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={config.placeholder || 'Escribe un mensaje...'}
                        className="flex-1 bg-gray-50 border-0 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all placeholder-gray-400"
                        style={{ '--tw-ring-color': primaryColor } as any}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || isLoading}
                        className="p-3 text-white rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 4px 12px ${primaryColor}40` }}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
                <div className="text-center mt-3">
                    <p className="text-[10px] text-gray-300 font-medium flex items-center justify-center gap-1">
                        Powered by <span className="font-bold text-gray-400">Kônsul AI</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
