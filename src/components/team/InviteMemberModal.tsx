'use client'

import { useState } from 'react';
import { X, Mail, User, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { inviteTeamMember } from '@/lib/actions/team';
import { useRouter } from 'next/navigation';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentMemberCount: number;
    maxMembers: number;
}

export function InviteMemberModal({ isOpen, onClose, currentMemberCount, maxMembers }: InviteMemberModalProps) {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'MANAGER' | 'AGENT'>('AGENT');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!email.trim()) {
            setError('El email es requerido');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Por favor ingresa un email válido');
            return;
        }

        // Check if at limit
        if (currentMemberCount >= maxMembers) {
            setError(`Has alcanzado el límite de miembros para tu plan (${maxMembers} miembros). Por favor, actualiza tu plan.`);
            return;
        }

        setIsLoading(true);
        try {
            const result = await inviteTeamMember(email.trim().toLowerCase(), role);
            
            if (result.error) {
                setError(result.error);
            } else {
                setSuccess(true);
                setEmail('');
                setTimeout(() => {
                    onClose();
                    router.refresh();
                }, 2000);
            }
        } catch (err: any) {
            setError(err.message || 'Error al enviar la invitación');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setEmail('');
            setRole('AGENT');
            setError(null);
            setSuccess(false);
            onClose();
        }
    };

    const remainingSlots = maxMembers - currentMemberCount;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300 border border-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-extrabold text-gray-900">Invitar Colaborador</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {remainingSlots > 0 
                                ? `${remainingSlots} espacio${remainingSlots > 1 ? 's' : ''} disponible${remainingSlots > 1 ? 's' : ''}`
                                : 'Límite alcanzado'}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            Email del colaborador
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="colaborador@ejemplo.com"
                            disabled={isLoading || remainingSlots === 0}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#21AC96] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {remainingSlots === 0 && (
                            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Has alcanzado el límite de miembros. Actualiza tu plan para invitar más.
                            </p>
                        )}
                    </div>

                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            Rol
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole('MANAGER')}
                                disabled={isLoading}
                                className={`p-4 rounded-xl border-2 transition-all ${
                                    role === 'MANAGER'
                                        ? 'border-[#21AC96] bg-[#21AC96]/5'
                                        : 'border-gray-200 hover:border-gray-300'
                                } disabled:opacity-50`}
                            >
                                <div className="text-left">
                                    <div className="font-bold text-gray-900">Administrador</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Puede crear y gestionar agentes
                                    </div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('AGENT')}
                                disabled={isLoading}
                                className={`p-4 rounded-xl border-2 transition-all ${
                                    role === 'AGENT'
                                        ? 'border-[#21AC96] bg-[#21AC96]/5'
                                        : 'border-gray-200 hover:border-gray-300'
                                } disabled:opacity-50`}
                            >
                                <div className="text-left">
                                    <div className="font-bold text-gray-900">Agente</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Solo puede asumir conversaciones
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-green-600">¡Invitación enviada!</p>
                                <p className="text-xs text-green-600 mt-1">Se ha enviado un email al colaborador con las instrucciones.</p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || remainingSlots === 0}
                            className="flex-1 px-4 py-3 bg-[#21AC96] text-white rounded-xl font-bold hover:bg-[#1a8a78] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                'Enviar Invitación'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

