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
    metadata?: {
        type?: string;
        url?: string;
        fileName?: string;
    };
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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';

        // Validate file type
        if (!isImage && !isPDF) {
            alert('Por favor selecciona una imagen o un PDF');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('El archivo debe ser menor a 10MB');
            return;
        }

        setSelectedFile(file);
        setFileType(isPDF ? 'pdf' : 'image');

        // Create preview (only for images)
        if (isImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setFilePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            // For PDFs, just show the filename
            setFilePreview(null);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setFilePreview(null);
        setFileType(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedFile) return;

        const content = newMessage || (fileType === 'pdf' ? 'Revisa este documento' : 'Mira esta imagen');
        const file = selectedFile;
        setNewMessage('');
        setSelectedFile(null);
        setFilePreview(null);
        setFileType(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

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
            createdAt: new Date(),
            metadata: filePreview ? { type: fileType || 'image', url: filePreview, fileName: file?.name } : 
                      (file && fileType === 'pdf' ? { type: 'pdf', fileName: file.name, url: '' } : undefined)
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setIsUploadingFile(!!file);

        try {
            // 3. Upload file if present
            let fileUrl: string | undefined;
            let fileTypeUploaded: 'pdf' | 'image' | undefined;
            let imageBase64: string | undefined;
            let extractedText: string | undefined;
            
            if (file) {
                try {
                    const formData = new FormData();
                    formData.append('file', file); // Use 'file' instead of 'image'

                    const uploadResponse = await fetch('/api/widget/upload-image', {
                        method: 'POST',
                        body: formData
                    });

                    if (!uploadResponse.ok) {
                        const errorData = await uploadResponse.json().catch(() => ({}));
                        throw new Error(errorData.error || 'Error al subir el archivo');
                    }

                    const uploadData = await uploadResponse.json();
                    fileUrl = uploadData.url;
                    fileTypeUploaded = uploadData.type as 'pdf' | 'image';
                    extractedText = uploadData.extractedText; // For PDFs

                    // Convert to base64 for AI processing (images only)
                    if (fileTypeUploaded === 'image') {
                        const reader = new FileReader();
                        imageBase64 = await new Promise<string>((resolve, reject) => {
                            reader.onload = (e) => resolve(e.target?.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                        });
                    }
                } catch (error) {
                    console.error('Error uploading file:', error);
                    setIsUploadingFile(false);
                    setIsLoading(false);
                    setMessages(prev => prev.filter(msg => msg.id !== tempId));
                    alert(error instanceof Error ? error.message : 'Error al subir el archivo. Por favor, intenta de nuevo.');
                    return;
                }
            }

            setIsUploadingFile(false);

            // 4. Send to Server
            const { sendWidgetMessage } = await import('@/lib/actions/widget');

            const { userMsg: savedUserMsg, agentMsg } = await sendWidgetMessage({
                channelId: channel.id,
                content: content,
                visitorId,
                fileUrl,
                fileType: fileTypeUploaded,
                imageBase64: fileTypeUploaded === 'image' ? imageBase64 : undefined,
                extractedText
            });

            // 5. Update UI with Real Agent Reply (only if bot responded)
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
            setIsUploadingFile(false);
            
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
                                {/* Show image if present */}
                                {msg.metadata?.type === 'image' && msg.metadata?.url && (
                                    <div className="mb-2 rounded-xl overflow-hidden max-w-xs">
                                        <img 
                                            src={msg.metadata.url} 
                                            alt="Imagen adjunta"
                                            className="w-full h-auto object-contain"
                                        />
                                    </div>
                                )}
                                
                                {/* Show PDF link if present */}
                                {msg.metadata?.type === 'pdf' && msg.metadata?.url && (
                                    <div className="mb-2 p-3 bg-gray-50 rounded-xl border border-gray-200 max-w-xs">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                            </svg>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-700 truncate">
                                                    {msg.metadata.fileName || 'Documento PDF'}
                                                </p>
                                                <a 
                                                    href={msg.metadata.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    Ver/Descargar PDF
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                {/* File Preview */}
                {filePreview && fileType === 'image' && (
                    <div className="mb-3 relative inline-block">
                        <div className="relative rounded-xl overflow-hidden max-w-[200px] border-2" style={{ borderColor: primaryColor }}>
                            <img 
                                src={filePreview} 
                                alt="Preview"
                                className="w-full h-auto object-contain max-h-32"
                            />
                            <button
                                type="button"
                                onClick={removeFile}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <span className="text-xs font-bold">×</span>
                            </button>
                        </div>
                    </div>
                )}
                
                {/* PDF Preview */}
                {selectedFile && fileType === 'pdf' && (
                    <div className="mb-3 p-3 bg-gray-50 rounded-xl border-2" style={{ borderColor: primaryColor }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-medium text-gray-700 truncate">{selectedFile.name}</span>
                            </div>
                            <button
                                type="button"
                                onClick={removeFile}
                                className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <span className="text-lg font-bold">×</span>
                            </button>
                        </div>
                    </div>
                )}
                
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                    />
                    <label
                        htmlFor="file-upload"
                        className="p-3 text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                        title="Adjuntar imagen o PDF"
                    >
                        <Paperclip className="w-5 h-5" />
                    </label>
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
                        disabled={(!newMessage.trim() && !selectedFile) || isLoading || isUploadingFile}
                        className="p-3 text-white rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 4px 12px ${primaryColor}40` }}
                    >
                        {(isLoading || isUploadingFile) ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
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
