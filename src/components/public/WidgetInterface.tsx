'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Loader2, Mic, MicOff, Square, Trash2, Play, Pause } from 'lucide-react';
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
            avatarUrl?: string | null;
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

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

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

    // Polling for new messages
    useEffect(() => {
        const fetchMessages = async () => {
            const visitorId = localStorage.getItem('konsul_visitor_id');
            if (!visitorId) return;

            try {
                const { getWidgetMessages } = await import('@/lib/actions/widget');
                const serverMessages = await getWidgetMessages(channel.id, visitorId);

                if (serverMessages && serverMessages.length > 0) {
                    setMessages(prev => {
                        const currentIds = new Set(prev.map(p => p.id));
                        const newMessages = serverMessages.filter((m: any) => !currentIds.has(m.id));

                        if (newMessages.length === 0) return prev;

                        const mapped = newMessages.map((m: any) => ({
                            id: m.id,
                            role: m.role as 'USER' | 'AGENT' | 'HUMAN',
                            content: m.content,
                            createdAt: new Date(m.createdAt),
                            metadata: m.metadata as any
                        }));

                        return [...prev, ...mapped].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
                    });
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        };

        const interval = setInterval(fetchMessages, 3000);

        // Initial fetch
        fetchMessages();

        return () => clearInterval(interval);
    }, [channel.id]);

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
        if (file.size > 5 * 1024 * 1024) {
            alert('El archivo debe ser menor a 5MB');
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

    // --- Audio Recording Logic ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);
            setAudioChunks([]);

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    setAudioChunks((prev) => [...prev, e.data]);
                }
            };

            recorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
            setRecordingDuration(0);

            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("No se pudo acceder al micrófono. Por favor verifica los permisos.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
            // Transition to sending after state updates
            setTimeout(() => handleSendAudio(), 100);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
            setAudioChunks([]);
        }
    };

    const handleSendAudio = async () => {
        // This will be called via useEffect or timeout when chunks are ready
    };

    // Handle audio chunks processing when recording stops
    useEffect(() => {
        if (!isRecording && audioChunks.length > 0) {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            processAudioMessage(audioBlob);
            setAudioChunks([]);
        }
    }, [isRecording, audioChunks]);

    const processAudioMessage = async (blob: Blob) => {
        setIsTranscribing(true);
        setIsLoading(true);

        const visitorId = localStorage.getItem('konsul_visitor_id') || (Math.random().toString(36).substring(2) + Date.now().toString(36));
        localStorage.setItem('konsul_visitor_id', visitorId);

        const tempId = 'audio-' + Date.now();
        const userMsg: Message = {
            id: tempId,
            role: 'USER',
            content: '(Nota de voz)',
            createdAt: new Date(),
            metadata: { type: 'audio', url: URL.createObjectURL(blob) }
        };
        setMessages(prev => [...prev, userMsg]);

        try {
            const formData = new FormData();
            formData.append('file', blob, 'recording.webm');

            const uploadResponse = await fetch('/api/widget/upload-audio', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) throw new Error('Error al transcribir el audio');

            const { url, transcription } = await uploadResponse.json();

            const { sendWidgetMessage } = await import('@/lib/actions/widget');
            const { userMsg: savedUserMsg, agentMsg } = await sendWidgetMessage({
                channelId: channel.id,
                content: transcription || 'Nota de voz',
                visitorId,
                fileUrl: url,
                fileType: 'audio',
                transcription: transcription
            });

            setMessages(prev => prev.map(msg =>
                msg.id === tempId
                    ? { ...msg, id: savedUserMsg.id, content: transcription, metadata: { ...msg.metadata, url, transcription } }
                    : msg
            ));

            if (agentMsg) {
                setMessages(prev => [...prev, {
                    id: agentMsg.id,
                    role: 'AGENT',
                    content: agentMsg.content,
                    createdAt: new Date(agentMsg.createdAt),
                    metadata: agentMsg.metadata
                }]);
            }
        } catch (err) {
            console.error("Audio processing error:", err);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert("Error al procesar la nota de voz. Intenta de nuevo.");
        } finally {
            setIsTranscribing(false);
            setIsLoading(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const togglePlayAudio = (messageId: string, url: string) => {
        if (playingMessageId === messageId) {
            audioPlayerRef.current?.pause();
            setPlayingMessageId(null);
        } else {
            if (audioPlayerRef.current) {
                audioPlayerRef.current.src = url;
                audioPlayerRef.current.play();
                setPlayingMessageId(messageId);
                audioPlayerRef.current.onended = () => setPlayingMessageId(null);
            }
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
        // Store initial metadata for images (base64 preview) or PDFs
        const initialMetadata = filePreview && fileType === 'image'
            ? { type: 'image' as const, url: filePreview, fileName: file?.name }
            : (file && fileType === 'pdf' ? { type: 'pdf' as const, fileName: file.name, url: '' } : undefined);

        const userMsg: Message = {
            id: tempId,
            role: 'USER',
            content: content,
            createdAt: new Date(),
            metadata: initialMetadata
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

            // 5. Update UI with Real User Message (update with real fileUrl from server)
            // Update the optimistic message with the real URL from server (replace base64 preview with R2 URL)
            const finalMetadata = fileUrl
                ? {
                    type: fileTypeUploaded || 'image',
                    url: fileUrl, // Use the real URL from R2, not the base64 preview
                    fileName: file?.name
                }
                : initialMetadata; // Fallback to initial metadata if no fileUrl

            setMessages(prev => prev.map(msg =>
                msg.id === tempId
                    ? {
                        ...msg,
                        id: savedUserMsg.id,
                        metadata: finalMetadata // Update with real fileUrl from server
                    }
                    : msg
            ));

            // 5.5. Update UI with Real Agent Reply (only if bot responded)
            if (agentMsg) {
                const realAgentMsg: Message = {
                    id: agentMsg.id,
                    role: 'AGENT',
                    content: agentMsg.content,
                    createdAt: new Date(agentMsg.createdAt),
                    metadata: agentMsg.metadata // Include metadata for images sent by agent
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
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-white uppercase backdrop-blur-sm overflow-hidden">
                    {channel.agent.avatarUrl ? (
                        <img
                            src={channel.agent.avatarUrl}
                            alt={channel.agent.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        channel.agent.name.charAt(0)
                    )}
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
                                {(() => {
                                    const metadata = msg.metadata;
                                    // Handle both object and parsed JSON
                                    const metadataObj = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
                                    const imageType = metadataObj?.type;
                                    const imageUrl = metadataObj?.url;

                                    if (imageType === 'image' && imageUrl) {
                                        return (
                                            <div className="mb-2 rounded-xl overflow-hidden max-w-xs">
                                                <img
                                                    src={imageUrl}
                                                    alt="Imagen adjunta"
                                                    className="w-full h-auto object-contain"
                                                    onError={(e) => {
                                                        console.error('Error loading image:', imageUrl);
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Show PDF link if present */}
                                {(() => {
                                    const metadata = msg.metadata;
                                    // Handle both object and parsed JSON
                                    const metadataObj = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
                                    const pdfType = metadataObj?.type;
                                    const pdfUrl = metadataObj?.url;

                                    if (pdfType === 'pdf' && pdfUrl) {
                                        return (
                                            <div className="mb-2 p-3 bg-gray-50 rounded-xl border border-gray-200 max-w-xs">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                    </svg>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-700 truncate">
                                                            {metadataObj.fileName || 'Documento PDF'}
                                                        </p>
                                                        <a
                                                            href={pdfUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                        >
                                                            Ver/Descargar PDF
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Handle Audio Playback
                                    if (metadataObj?.type === 'audio' && metadataObj?.url) {
                                        const isPlaying = playingMessageId === msg.id;
                                        return (
                                            <div className={cn(
                                                "mb-3 p-3 rounded-xl border backdrop-blur-sm",
                                                isUser
                                                    ? "bg-gray-50 border-gray-100"
                                                    : "bg-white/10 border-white/20"
                                            )}>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => togglePlayAudio(msg.id, metadataObj.url!)}
                                                        className={cn(
                                                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                                            isUser ? "bg-gray-200 text-gray-600 hover:bg-gray-300" : "bg-white/20 text-white hover:bg-white/30"
                                                        )}
                                                    >
                                                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                                                    </button>
                                                    <div className="flex-1">
                                                        <div className={cn("h-1.5 rounded-full overflow-hidden", isUser ? "bg-gray-200" : "bg-white/20")}>
                                                            <div className={cn("h-full transition-all duration-300", isUser ? "bg-gray-600" : "bg-white", isPlaying ? "w-full animate-pulse" : "w-0")}></div>
                                                        </div>
                                                        <p className={cn("text-[10px] mt-1.5 font-bold uppercase tracking-wider opacity-80", isUser ? "text-gray-400" : "text-white")}>Nota de voz</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                                {(() => {
                                    const renderContent = (content: string) => {
                                        // 1. Handle markdown links: [text](url)
                                        let html = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-80 transition-opacity">$1</a>');

                                        // 2. Handle raw URLs: http...
                                        // But avoid double-wrapping links that were already handled by markdown link regex
                                        // A simple way is to match URLs that are NOT preceded by quote or paren or already inside an <a> tag
                                        // Actually, let's just use a simpler approach: handle markdown first, then find remaining URLs.

                                        // For now, let's keep it simple as requested: make URLs clickable.
                                        // We'll use a safer regex for raw URLs
                                        const urlRegex = /(?<!href=")(?<!src=")(https?:\/\/[^\s<]+)/g;
                                        html = html.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-80 transition-opacity">$1</a>');

                                        // 3. Handle bold text: **text**
                                        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>');

                                        // 4. Handle line breaks
                                        return <div className="leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: html }} />;
                                    };

                                    return renderContent(msg.content);
                                })()}
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
                        disabled={(!newMessage.trim() && !selectedFile) || isLoading || isUploadingFile || isRecording}
                        className="p-3 text-white rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 4px 12px ${primaryColor}40` }}
                    >
                        {(isLoading || isUploadingFile || isTranscribing) ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                    {!newMessage.trim() && !selectedFile && (
                        <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={cn(
                                "p-3 rounded-xl transition-all active:scale-95 shadow-lg",
                                isRecording ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                        </button>
                    )}
                </form>
                {isRecording && (
                    <div className="mt-3 flex items-center justify-between bg-red-50 px-4 py-2 rounded-xl border border-red-100 animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 text-red-600 font-bold text-xs">
                            <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                            Grabando: {formatDuration(recordingDuration)}
                        </div>
                        <button onClick={cancelRecording} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <audio ref={audioPlayerRef} className="hidden" />
                <div className="text-center mt-3">
                    <p className="text-[10px] text-gray-300 font-medium flex items-center justify-center gap-1">
                        Powered by <span className="font-bold text-gray-400">Kônsul AI</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
