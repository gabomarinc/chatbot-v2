import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Clock, MessageCircle, FileText, Calendar, Send, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { AIInsightsTab } from './AIInsightsTab';
import { ActivityTimelineTab } from './ActivityTimelineTab';

interface ProspectDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    prospectData: any; // Using any for now, better to define a strict type based on server action return
    isLoading: boolean;
}

export function ProspectDetailsModal({ isOpen, onClose, prospectData, isLoading }: ProspectDetailsModalProps) {
    const [activeTab, setActiveTab] = useState<'resume' | 'chat' | 'documents'>('resume');

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#21AC96]/10 flex items-center justify-center text-[#21AC96]">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            {isLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-40 rounded-lg" />
                                    <Skeleton className="h-4 w-24 rounded-lg" />
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-xl font-bold text-gray-900">{prospectData?.contactName || prospectData?.externalId || 'Prospecto desconocido'}</h2>
                                    <p className="text-sm text-gray-500 font-medium">ID: {prospectData?.externalId}</p>
                                </>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200/50 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-6 border-b border-gray-100 bg-white">
                    <button
                        onClick={() => setActiveTab('resume')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'resume'
                            ? 'border-[#21AC96] text-[#21AC96]'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        Resumen Perfil
                    </button>
                    <button
                        onClick={() => setActiveTab('ai_insights' as any)}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === ('ai_insights' as any)
                            ? 'border-[#21AC96] text-[#21AC96]'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Inteligencia AI
                    </button>
                    <button
                        onClick={() => setActiveTab('timeline' as any)}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === ('timeline' as any)
                            ? 'border-[#21AC96] text-[#21AC96]'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <Calendar className="w-4 h-4" />
                        Actividad
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'chat'
                            ? 'border-[#21AC96] text-[#21AC96]'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        Historial Chat
                    </button>
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'documents'
                            ? 'border-transparent text-gray-400 hover:text-gray-600'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        Archivos
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-8">
                    {isLoading ? (
                        <div className="space-y-6">
                            <Skeleton className="h-24 w-full rounded-[2rem]" />
                            <div className="grid grid-cols-2 gap-6">
                                <Skeleton className="h-48 w-full rounded-[2rem]" />
                                <Skeleton className="h-48 w-full rounded-[2rem]" />
                            </div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'resume' && (
                                <div className="space-y-8 animate-fade-in">
                                    {/* Lead Score & Bio Banner */}
                                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32" />

                                        <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                                            <div className="shrink-0 relative">
                                                <svg className="w-32 h-32 transform -rotate-90">
                                                    <circle
                                                        cx="64"
                                                        cy="64"
                                                        r="58"
                                                        stroke="currentColor"
                                                        strokeWidth="8"
                                                        fill="transparent"
                                                        className="text-white/10"
                                                    />
                                                    <circle
                                                        cx="64"
                                                        cy="64"
                                                        r="58"
                                                        stroke="currentColor"
                                                        strokeWidth="8"
                                                        fill="transparent"
                                                        strokeDasharray={364.4}
                                                        strokeDashoffset={364.4 - (364.4 * (prospectData?.contact?.leadScore || 0)) / 100}
                                                        className="text-amber-500 transition-all duration-1000"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-3xl font-black">{prospectData?.contact?.leadScore || '-'}</span>
                                                    <span className="text-[10px] uppercase font-black tracking-widest opacity-60">Lead Score</span>
                                                </div>
                                            </div>

                                            <div className="flex-1 text-center md:text-left">
                                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-amber-500 mb-2">Resumen Ejecutivo</h3>
                                                <p className="text-lg font-medium leading-relaxed opacity-90 italic">
                                                    {prospectData?.contact?.summary || "No hay un resumen generado aún. Usa la pestaña Inteligencia AI para analizar a este contacto."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                                            <h3 className="text-gray-900 font-black flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                Ficha Técnica
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl group transition-all hover:bg-gray-100">
                                                    <Phone className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">WhatsApp / Tel</span>
                                                        <span className="text-gray-900 font-bold">{prospectData?.contact?.phone || prospectData?.externalId || '-'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl group transition-all hover:bg-gray-100">
                                                    <Mail className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Correo Electrónico</span>
                                                        <span className="text-gray-900 font-bold">{prospectData?.contact?.email || 'No captado'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl group transition-all hover:bg-gray-100">
                                                    <Clock className="w-4 h-4 text-gray-400 group-hover:text-gray-400" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primer Contacto</span>
                                                        <span className="text-gray-900 font-bold">
                                                            {format(new Date(prospectData?.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                                            <h3 className="text-gray-900 font-black flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-[#21AC96]">
                                                    <MessageCircle className="w-5 h-5" />
                                                </div>
                                                Comportamiento
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center p-4 border-b border-gray-50">
                                                    <span className="text-gray-500 font-bold text-sm">Origen</span>
                                                    <span className="px-3 py-1 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                        {prospectData?.channel?.type || 'WEB'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center p-4 border-b border-gray-50">
                                                    <span className="text-gray-500 font-bold text-sm">Agente Asignado</span>
                                                    <span className="font-black text-gray-900">{prospectData?.agent?.name || 'Sistema'}</span>
                                                </div>
                                                <div className="flex justify-between items-center p-4 border-b border-gray-50">
                                                    <span className="text-gray-500 font-bold text-sm">Volumen de Chat</span>
                                                    <span className="font-black text-[#21AC96]">{prospectData?.messages?.length || 0} mensajes</span>
                                                </div>
                                                <div className="flex justify-between items-center p-4">
                                                    <span className="text-gray-500 font-bold text-sm">Estado de Lead</span>
                                                    <span className="px-3 py-1 bg-emerald-100 text-[#1a8a78] rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                        {prospectData?.status || 'Abierto'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === ('ai_insights' as any) && (
                                <AIInsightsTab contactId={prospectData?.contact?.id} initialData={prospectData?.contact} />
                            )}

                            {activeTab === ('timeline' as any) && (
                                <ActivityTimelineTab
                                    contactId={prospectData?.contact?.id}
                                    activities={prospectData?.contact?.activities}
                                />
                            )}

                            {activeTab === 'chat' && (
                                <div className="flex flex-col h-[500px] bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                                        {prospectData?.messages?.length > 0 ? (
                                            prospectData.messages.map((msg: any) => (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[80%] rounded-2xl p-4 text-sm ${msg.role === 'USER'
                                                            ? 'bg-[#21AC96] text-white rounded-tr-none'
                                                            : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none shadow-sm'
                                                            }`}
                                                    >
                                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                                        <div className={`text-[10px] mt-2 font-medium ${msg.role === 'USER' ? 'text-white/70' : 'text-gray-400'
                                                            }`}>
                                                            {format(new Date(msg.createdAt), "HH:mm")}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                                <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
                                                <p>No hay mensajes disponibles</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 border-t border-gray-100 bg-white flex gap-3">
                                        <input
                                            type="text"
                                            placeholder="Escribir una nota o respuesta..."
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#21AC96]/20 focus:border-[#21AC96] transition-all"
                                            disabled
                                        />
                                        <button className="p-2.5 bg-[#21AC96] text-white rounded-xl hover:bg-[#1a8a78] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'documents' && (
                                <div className="space-y-4 animate-fade-in">
                                    {prospectData?.documents?.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {prospectData.documents.map((doc: any) => (
                                                <a
                                                    key={doc.id}
                                                    href={doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-[#21AC96]/30 hover:shadow-md transition-all group"
                                                >
                                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-gray-900 truncate">{doc.name}</h4>
                                                        <p className="text-xs text-gray-500 capitalize">{doc.type}</p>
                                                        <p className="text-[10px] text-gray-400 mt-1">
                                                            {format(new Date(doc.createdAt), "d MMM yyyy")}
                                                        </p>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-gray-100 text-center">
                                            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center shadow-inner mb-6">
                                                <Paperclip className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <h4 className="text-gray-900 font-bold text-lg mb-2">Sin documentos</h4>
                                            <p className="text-gray-400 max-w-sm mx-auto font-medium">
                                                El usuario no ha enviado ningún archivo adjunto en esta conversación.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
