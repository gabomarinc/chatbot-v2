'use client';

import { X, Globe, Phone, Instagram, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ConnectChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    agentId?: string;
}

export function ConnectChannelModal({ isOpen, onClose, agentId }: ConnectChannelModalProps) {
    if (!isOpen) return null;

    // Construir URLs con agentId si está disponible
    const buildUrl = (baseUrl: string) => {
        if (agentId) {
            return `${baseUrl}?agentId=${agentId}`;
        }
        return baseUrl;
    };

    // Prevent scrolling when modal is open
    // useEffect(() => {
    //     document.body.style.overflow = 'hidden';
    //     return () => { document.body.style.overflow = 'unset'; }
    // }, []);

    const WhatsAppIcon = ({ className }: { className?: string }) => (
        <img
            src="/whatsapp-icono.png"
            alt="WhatsApp"
            className={cn("object-contain", className)}
        />
    );

    const InstagramIcon = ({ className }: { className?: string }) => (
        <img
            src="/instagram-icono.png"
            alt="Instagram"
            className={cn("object-contain", className)}
        />
    );

    const TikTokIcon = ({ className }: { className?: string }) => (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
        >
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47V18c0 1.94-1.06 3.75-2.84 4.59-1.54.74-3.41.87-5.02.26-2.12-.78-3.7-3.05-3.56-5.32-.08-2.61 1.76-5.1 4.31-5.69.57-.14 1.16-.19 1.74-.15v4.13c-.3-.04-.61-.03-.91.03-1.07.18-1.92 1.25-1.78 2.33a2.12 2.12 0 001.31 1.63c.69.23 1.48.15 2.1-.25.56-.34.9-.98.88-1.64V.02z" />
        </svg>
    );

    const channels = [
        {
            id: 'web',
            name: 'Widget Web',
            icon: Globe,
            description: 'Chat en tu sitio web',
            color: 'bg-[#21AC96]',
            textColor: 'text-[#21AC96]',
            href: '/channels/setup/web',
            enabled: true
        },
        {
            id: 'whatsapp',
            name: 'WhatsApp',
            icon: WhatsAppIcon,
            description: 'WhatsApp Business API',
            color: 'bg-white border border-gray-100',
            textColor: 'text-green-600',
            href: '/channels/setup/whatsapp',
            enabled: true
        },
        {
            id: 'instagram',
            name: 'Instagram',
            icon: InstagramIcon,
            description: 'DM y Comentarios',
            color: 'bg-white border border-gray-100',
            textColor: 'text-pink-600',
            href: '/channels/setup/instagram',
            enabled: true
        },
        {
            id: 'messenger',
            name: 'Messenger',
            icon: MessageCircle,
            description: 'Facebook Messenger',
            color: 'bg-blue-500',
            textColor: 'text-blue-600',
            href: '/channels/setup/messenger',
            enabled: false
        },
        {
            id: 'tiktok',
            name: 'TikTok',
            icon: TikTokIcon,
            description: 'TikTok Business',
            color: 'bg-black',
            textColor: 'text-black',
            href: '/channels/setup/tiktok',
            enabled: false
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200 border border-gray-100">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-gray-400" />
                </button>

                <div className="text-center mb-10">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Conectar un Canal</h2>
                    <p className="text-gray-500 font-medium max-w-lg mx-auto">Selecciona la plataforma donde deseas integrar tu agente de IA.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {channels.map((channel) => (
                        channel.enabled ? (
                            <Link
                                key={channel.id}
                                href={buildUrl(channel.href)}
                                onClick={onClose}
                                className="group relative flex flex-col items-center text-center p-6 rounded-3xl border-2 border-transparent bg-gray-50 hover:bg-white hover:border-[#21AC96]/20 hover:shadow-xl hover:shadow-[#21AC96]/10 transition-all cursor-pointer active:scale-95"
                            >
                                <div className={cn(
                                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm text-white",
                                    channel.color
                                )}>
                                    <channel.icon className="w-8 h-8" />
                                </div>
                                <h3 className="font-extrabold text-gray-900 mb-1">{channel.name}</h3>
                                <p className="text-xs text-gray-400 font-medium px-2">{channel.description}</p>

                                <div className="mt-4 px-3 py-1 bg-[#21AC96]/10 text-[#21AC96] rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    Disponible
                                </div>
                            </Link>
                        ) : (
                            <div
                                key={channel.id}
                                className="relative flex flex-col items-center text-center p-6 rounded-3xl border border-gray-100 bg-white opacity-60 grayscale cursor-not-allowed"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
                                    <channel.icon className="w-8 h-8" />
                                </div>
                                <h3 className="font-extrabold text-gray-900 mb-1">{channel.name}</h3>
                                <p className="text-xs text-gray-400 font-medium px-2">{channel.description}</p>

                                <div className="mt-4 px-3 py-1 bg-gray-100 text-gray-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    Próximamente
                                </div>
                            </div>
                        )
                    ))}
                </div>
            </div>
        </div>
    );
}
