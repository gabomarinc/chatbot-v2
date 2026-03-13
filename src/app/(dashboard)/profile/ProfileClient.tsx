'use client';

import { useState, useRef } from 'react';
import { Save, User, Mail, Calendar, TrendingUp, Bot, Radio, MessageSquare, Coins, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { updateUserProfileWithTimezone, uploadUserAvatar } from '@/lib/actions/auth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface ProfileClientProps {
    user: {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
        createdAt: Date;
        role: string;
    };
    stats: {
        agentsCreated: number;
        conversationsHandled: number;
        channelsConfigured: number;
        creditsUsed: number;
        workspaceName: string;
        workspaceRole: string;
        memberSince: Date | null;
    };
    initialTimezone: string;
}

export default function ProfileClient({ user, stats, initialTimezone }: ProfileClientProps) {
    const router = useRouter();
    const { update: updateSession } = useSession();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(user.name || '');
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user.image);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSuccessMessage(null);
        setErrorMessage(null);

        try {
            let finalAvatarUrl = avatarPreview;

            if (avatarFile) {
                const formData = new FormData();
                formData.append('file', avatarFile);
                const uploadResult = await uploadUserAvatar(user.id, formData);

                if (!uploadResult.success) {
                    setErrorMessage(uploadResult.error || 'Ocurrió un error al subir la imagen.');
                    setIsSaving(false);
                    return;
                }
                finalAvatarUrl = uploadResult.url || null;
            }

            const result = await updateUserProfileWithTimezone(user.id, name, finalAvatarUrl || undefined);

            if (result.error) {
                setErrorMessage(result.error);
            } else {
                setSuccessMessage('Perfil actualizado exitosamente');
                await updateSession({
                    name: name,
                    image: finalAvatarUrl
                });
                router.refresh();
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (error) {
            setErrorMessage('Ocurrió un error inesperado. Inténtalo de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'OWNER': return 'Propietario';
            case 'MANAGER': return 'Administrador';
            case 'AGENT': return 'Agente';
            default: return role;
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-12">
            {/* Hero Section with Mesh Gradient */}
            <div className="relative h-48 md:h-64 rounded-[2.5rem] overflow-hidden mb-16 shadow-2xl shadow-[#21AC96]/10">
                <div className="absolute inset-0 bg-[#21AC96] bg-gradient-to-br from-[#21AC96] via-[#1a8a78] to-[#125e52]"></div>
                <div className="absolute inset-0 opacity-30 mix-blend-overlay">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full fill-white">
                        <polygon points="0,100 100,0 100,100" />
                    </svg>
                </div>
                
                {/* User Hero Content */}
                <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 flex flex-col md:flex-row items-end gap-6">
                    <div className="relative group shrink-0 -mb-20 md:-mb-12">
                        <div 
                            onClick={handleAvatarClick}
                            className="w-32 h-32 md:w-36 md:h-36 rounded-3xl border-4 border-white bg-white shadow-2xl relative overflow-hidden cursor-pointer active:scale-95 transition-all"
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-4xl font-black text-gray-400">
                                    {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                                <Upload className="w-8 h-8 text-white animate-bounce" />
                            </div>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    </div>
                    
                    <div className="flex-1 text-white pb-2 text-center md:text-left">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 drop-shadow-md">
                            ¡Hola, {user.name?.split(' ')[0] || 'Usuario'}!
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 opacity-90">
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                                {getRoleLabel(stats.workspaceRole)}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 px-3 py-1 bg-black/10 rounded-full border border-white/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                Online
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-2 md:px-0">
                {/* Left: Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-xl shadow-gray-200/50">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#21AC96]/10 flex items-center justify-center">
                                    <User className="w-6 h-6 text-[#21AC96]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Información Personal</h2>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Actualiza cómo te ven los demás</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1">Nombre Completo</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#21AC96] transition-colors">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Tu nombre completo"
                                            className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-transparent focus:border-[#21AC96] focus:bg-white rounded-[1.25rem] transition-all focus:outline-none text-xs font-bold text-gray-900 shadow-inner"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] ml-1 flex items-center gap-2">
                                        Email <span className="text-[8px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-500">Bloqueado</span>
                                    </label>
                                    <div className="relative opacity-60">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="email"
                                            value={user.email}
                                            disabled
                                            className="w-full pl-11 pr-4 py-4 bg-gray-100 border border-transparent rounded-[1.25rem] text-xs font-bold text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="space-y-1 text-center md:text-left">
                                    {errorMessage && (
                                        <p className="text-[10px] font-bold text-red-500 flex items-center gap-1.5">
                                            <AlertCircle className="w-3.5 h-3.5" /> {errorMessage}
                                        </p>
                                    )}
                                    {successMessage && (
                                        <p className="text-[10px] font-bold text-[#21AC96] flex items-center gap-1.5">
                                            <CheckCircle className="w-3.5 h-3.5" /> {successMessage}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-[#21AC96] hover:bg-[#1a8a78] text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] shadow-xl shadow-[#21AC96]/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Secondary Account Info Card */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <Bot className="w-32 h-32" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1 space-y-6">
                                <div>
                                    <h3 className="text-xl font-black mb-1">Tu Espacio de Trabajo</h3>
                                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Detalles de la suscripción y membresía</p>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Workspace</p>
                                        <p className="text-sm font-bold truncate">{stats.workspaceName || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Miembro Desde</p>
                                        <p className="text-sm font-bold flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-[#21AC96]" />
                                            {stats.memberSince ? format(new Date(stats.memberSince), 'd MMM yyyy', { locale: es as any }) : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Tu Rol</p>
                                        <span className="inline-block px-2 py-0.5 bg-white/10 rounded-md text-[10px] font-black uppercase tracking-wider text-[#21AC96]">
                                            {getRoleLabel(stats.workspaceRole)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Modern Stats Bento */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/50">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Actividad</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { label: 'Agentes Creados', value: stats.agentsCreated, icon: Bot, color: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-600' },
                                { label: 'Conversaciones', value: stats.conversationsHandled, icon: MessageSquare, color: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600' },
                                { label: 'Canales Activos', value: stats.channelsConfigured, icon: Radio, color: 'bg-orange-600', light: 'bg-orange-50', text: 'text-orange-600' },
                                { label: 'Créditos Usados', value: stats.creditsUsed.toLocaleString(), icon: Coins, color: 'bg-[#21AC96]', light: 'bg-emerald-50', text: 'text-[#21AC96]' },
                            ].map((stat, i) => (
                                <div key={i} className="group flex items-center gap-4 p-4 rounded-3xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                                    <div className={`w-12 h-12 rounded-2xl ${stat.light} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <stat.icon className={`w-6 h-6 ${stat.text}`} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
                                        <p className="text-xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200 group-hover:bg-[#21AC96] transition-colors"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#21AC96]/10 border border-[#21AC96]/20 p-6 rounded-[2rem] text-center">
                        <p className="text-[10px] font-black text-[#21AC96] uppercase tracking-[0.2em] mb-2">Truco Pro</p>
                        <p className="text-[11px] font-bold text-[#1a8a78] leading-relaxed">
                            Completa tu perfil para que tus agentes puedan identificarte mejor en flujos compartidos.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
