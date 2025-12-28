'use client'

import { useState } from 'react';
import { X, User, Check } from 'lucide-react';
import { assignConversation, unassignConversation } from '@/lib/actions/conversations';
import { useRouter } from 'next/navigation';

interface TeamMember {
    id: string;
    user: {
        id: string;
        name: string | null;
        email: string;
    };
}

interface AssignConversationModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: string;
    currentAssignedUserId?: string | null;
    teamMembers: TeamMember[];
    currentUserId?: string;
    userRole?: 'OWNER' | 'MANAGER' | 'AGENT' | null;
}

export function AssignConversationModal({
    isOpen,
    onClose,
    conversationId,
    currentAssignedUserId,
    teamMembers,
    currentUserId,
    userRole
}: AssignConversationModalProps) {
    const router = useRouter();
    const [isAssigning, setIsAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    // Filter members: OWNER/MANAGER can assign to anyone, AGENT can only assign to themselves
    const availableMembers = userRole === 'AGENT'
        ? teamMembers.filter(m => m.user.id === currentUserId)
        : teamMembers;

    const handleAssign = async (userId: string) => {
        setIsAssigning(true);
        setError(null);
        try {
            const result = await assignConversation(conversationId, userId);
            if (result.error) {
                setError(result.error);
            } else {
                router.refresh();
                onClose();
            }
        } catch (err) {
            setError('Error al asignar conversación');
        } finally {
            setIsAssigning(false);
        }
    };

    const handleUnassign = async () => {
        setIsAssigning(true);
        setError(null);
        try {
            const result = await unassignConversation(conversationId);
            if (result.error) {
                setError(result.error);
            } else {
                router.refresh();
                onClose();
            }
        } catch (err) {
            setError('Error al desasignar conversación');
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-extrabold text-gray-900">Asignar Conversación</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        disabled={isAssigning}
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
                        {error}
                    </div>
                )}

                <div className="space-y-3 mb-6">
                    {currentAssignedUserId ? (
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium mb-1">Asignada actualmente a:</p>
                                    <p className="text-base font-bold text-gray-900">
                                        {teamMembers.find(m => m.user.id === currentAssignedUserId)?.user.name || 
                                         teamMembers.find(m => m.user.id === currentAssignedUserId)?.user.email || 
                                         'Usuario desconocido'}
                                    </p>
                                </div>
                                {(userRole === 'OWNER' || userRole === 'MANAGER' || currentAssignedUserId === currentUserId) && (
                                    <button
                                        onClick={handleUnassign}
                                        disabled={isAssigning}
                                        className="px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        Desasignar
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl mb-4">
                            <p className="text-sm text-yellow-700 font-medium">Esta conversación no está asignada</p>
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-bold text-gray-700 mb-3 block">
                            {userRole === 'AGENT' ? 'Asignar a mí' : 'Asignar a:'}
                        </label>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {availableMembers.map((member) => {
                                const isCurrent = member.user.id === currentAssignedUserId;
                                const isCurrentUser = member.user.id === currentUserId;
                                
                                return (
                                    <button
                                        key={member.id}
                                        onClick={() => handleAssign(member.user.id)}
                                        disabled={isAssigning || isCurrent}
                                        className={`
                                            w-full p-4 rounded-2xl border-2 transition-all text-left
                                            ${isCurrent 
                                                ? 'bg-[#1E9A86]/10 border-[#1E9A86] cursor-not-allowed' 
                                                : 'border-gray-100 hover:border-[#1E9A86] hover:bg-[#1E9A86]/5 cursor-pointer'
                                            }
                                            ${isAssigning ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`
                                                    w-10 h-10 rounded-xl flex items-center justify-center
                                                    ${isCurrent 
                                                        ? 'bg-gradient-to-br from-[#1E9A86] to-[#158571] text-white' 
                                                        : 'bg-gray-100 text-gray-500'
                                                    }
                                                `}>
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">
                                                        {member.user.name || member.user.email}
                                                        {isCurrentUser && (
                                                            <span className="ml-2 text-xs text-gray-500">(Yo)</span>
                                                        )}
                                                    </p>
                                                    {member.user.name && (
                                                        <p className="text-sm text-gray-500">{member.user.email}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {isCurrent && (
                                                <Check className="w-5 h-5 text-[#1E9A86]" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isAssigning}
                        className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}


