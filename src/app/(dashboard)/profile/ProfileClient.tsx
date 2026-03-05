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
    const [timezone, setTimezone] = useState(initialTimezone);
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

            const result = await updateUserProfileWithTimezone(user.id, name, finalAvatarUrl || undefined, timezone);

            if (result.error) {
                setErrorMessage(result.error);
            } else {
                setSuccessMessage('Perfil actualizado exitosamente');
                // Update session to reflect name changes
                await updateSession();
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
            case 'OWNER':
                return 'Propietario';
            case 'MANAGER':
                return 'Administrador';
            case 'AGENT':
                return 'Agente';
            default:
                return role;
        }
    };

    return (
        <div className="p-2 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-gray-900 mb-2 text-2xl font-semibold">Mi Perfil</h1>
                <p className="text-gray-500">Gestiona tu información personal y preferencias</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Profile Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Personal Information */}
                    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                        <h2 className="text-gray-900 mb-6 text-lg font-semibold">Información Personal</h2>

                        <form onSubmit={handleSave} className="space-y-6">
                            {/* Avatar */}
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div
                                        onClick={handleAvatarClick}
                                        className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#21AC96] to-[#1a8a78] flex items-center justify-center text-white text-3xl font-bold cursor-pointer hover:opacity-90 transition-opacity shadow-lg relative overflow-hidden group"
                                    >
                                        {avatarPreview ? (
                                            <img
                                                src={avatarPreview}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span>{user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Upload className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm text-gray-700 mb-2 font-medium">Nombre</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Tu nombre completo"
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {/* Email (Read-only) */}
                            <div>
                                <label className="block text-sm text-gray-700 mb-2 font-medium flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={user.email}
                                    disabled
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1">El email no puede ser modificado</p>
                            </div>

                            {/* Timezone */}
                            <div>
                                <label className="block text-sm text-gray-700 mb-2 font-medium flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Zona Horaria
                                </label>
                                <select
                                    value={timezone}
                                    onChange={(e) => setTimezone(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                >
                                    <option value="America/Panama">América/Panamá (UTC-5)</option>
                                    <option value="America/Mexico_City">América/México (UTC-6)</option>
                                    <option value="America/Bogota">América/Bogotá (UTC-5)</option>
                                    <option value="America/Lima">América/Lima (UTC-5)</option>
                                    <option value="America/Santiago">América/Santiago (UTC-3)</option>
                                    <option value="America/Buenos_Aires">América/Buenos Aires (UTC-3)</option>
                                    <option value="America/New_York">América/New York (UTC-5)</option>
                                    <option value="America/Los_Angeles">América/Los Angeles (UTC-8)</option>
                                    <option value="Europe/Madrid">Europa/Madrid (UTC+1)</option>
                                </select>
                            </div>

                            {/* Messages */}
                            {errorMessage && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="text-sm">{errorMessage}</span>
                                </div>
                            )}
                            {successMessage && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-600">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="text-sm">{successMessage}</span>
                                </div>
                            )}

                            {/* Save Button */}
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save className="w-5 h-5" />
                                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Column - Statistics */}
                <div className="space-y-6">
                    {/* Account Info */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <h3 className="text-gray-900 mb-4 text-base font-semibold">Información de Cuenta</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Miembro desde</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {stats.memberSince ? format(new Date(stats.memberSince), 'd MMM yyyy', { locale: es as any }) : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Workspace</p>
                                <p className="text-sm font-medium text-gray-900">{stats.workspaceName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Rol</p>
                                <p className="text-sm font-medium text-gray-900">{getRoleLabel(stats.workspaceRole)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <h3 className="text-gray-900 mb-4 text-base font-semibold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                            Estadísticas
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                                <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Agentes creados</p>
                                    <p className="text-lg font-bold text-gray-900">{stats.agentsCreated}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Conversaciones</p>
                                    <p className="text-lg font-bold text-gray-900">{stats.conversationsHandled}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                                <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center">
                                    <Radio className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Canales configurados</p>
                                    <p className="text-lg font-bold text-gray-900">{stats.channelsConfigured}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                                <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                                    <Coins className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Créditos utilizados</p>
                                    <p className="text-lg font-bold text-gray-900">{stats.creditsUsed.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

