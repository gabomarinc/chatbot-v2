'use client'

import { useState } from 'react';
import { Plus, User, Mail, Shield, MoreVertical, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InviteMemberModal } from './InviteMemberModal';
import { removeTeamMember, updateTeamMemberRole } from '@/lib/actions/team';
import { useRouter } from 'next/navigation';

interface TeamMember {
    id: string;
    role: 'OWNER' | 'MANAGER' | 'AGENT';
    user: {
        id: string;
        name: string | null;
        email: string;
    };
}

interface TeamPageClientProps {
    initialMembers: TeamMember[];
    currentMemberCount: number;
    maxMembers: number;
}

export function TeamPageClient({ initialMembers, currentMemberCount, maxMembers }: TeamPageClientProps) {
    const router = useRouter();
    const [members, setMembers] = useState(initialMembers);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

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

    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case 'OWNER':
                return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'MANAGER':
                return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'AGENT':
                return 'bg-gray-50 text-gray-600 border-gray-100';
            default:
                return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar a este miembro del equipo?')) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await removeTeamMember(memberId);
            if (result.error) {
                alert(result.error);
            } else {
                setMembers(members.filter(m => m.id !== memberId));
                router.refresh();
            }
        } catch (error) {
            alert('Error al eliminar miembro');
        } finally {
            setIsLoading(false);
            setIsActionMenuOpen(null);
        }
    };

    const handleUpdateRole = async (memberId: string, newRole: 'MANAGER' | 'AGENT') => {
        setIsLoading(true);
        try {
            const result = await updateTeamMemberRole(memberId, newRole);
            if (result.error) {
                alert(result.error);
            } else {
                setMembers(members.map(m => 
                    m.id === memberId ? { ...m, role: newRole } : m
                ));
                router.refresh();
            }
        } catch (error) {
            alert('Error al actualizar rol');
        } finally {
            setIsLoading(false);
            setIsActionMenuOpen(null);
        }
    };

    const canInvite = currentMemberCount < maxMembers;

    return (
        <>
            <div className="max-w-[1600px] mx-auto animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-2">Equipo</h1>
                        <p className="text-gray-500 font-medium">
                            Gestiona los permisos y accesos de tus colaboradores ({currentMemberCount}/{maxMembers} miembros)
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsInviteModalOpen(true)}
                        disabled={!canInvite}
                        className="flex items-center gap-2 px-5 py-3 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all cursor-pointer group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                        Invitar Colaborador
                    </button>
                </div>

                {/* List */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-50">
                                    <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Usuario / Email</th>
                                    <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Rol del Sistema</th>
                                    <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                                    <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {members.length > 0 ? (
                                    members.map((member) => (
                                        <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-[#21AC96]/5 flex items-center justify-center text-[#21AC96] group-hover:scale-110 transition-transform shadow-sm">
                                                        <User className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-900 font-extrabold tracking-tight">{member.user.name || 'Sin nombre'}</span>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                                            <Mail className="w-3 h-3" />
                                                            {member.user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={cn(
                                                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border",
                                                    getRoleBadgeStyle(member.role)
                                                )}>
                                                    <Shield className="w-3 h-3" />
                                                    {getRoleLabel(member.role)}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                    <span className="text-sm text-gray-700 font-bold">Activo</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="relative inline-block">
                                                    <button 
                                                        onClick={() => setIsActionMenuOpen(isActionMenuOpen === member.id ? null : member.id)}
                                                        disabled={member.role === 'OWNER'}
                                                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>
                                                    
                                                    {isActionMenuOpen === member.id && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-10">
                                                            {member.role !== 'OWNER' && member.role !== 'MANAGER' && (
                                                                <button
                                                                    onClick={() => handleUpdateRole(member.id, 'MANAGER')}
                                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                    Promover a Administrador
                                                                </button>
                                                            )}
                                                            {member.role === 'MANAGER' && (
                                                                <button
                                                                    onClick={() => handleUpdateRole(member.id, 'AGENT')}
                                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                    Degradar a Agente
                                                                </button>
                                                            )}
                                                            {member.role !== 'OWNER' && (
                                                                <>
                                                                    <div className="h-px bg-gray-100 my-1"></div>
                                                                    <button
                                                                        onClick={() => handleRemoveMember(member.id)}
                                                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                        Eliminar del equipo
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
                                                    <User className="w-10 h-10 text-gray-200" />
                                                </div>
                                                <h3 className="text-gray-900 font-extrabold text-xl tracking-tight mb-2">No hay miembros registrados</h3>
                                                <p className="text-gray-400 font-medium max-w-sm mx-auto">
                                                    Los miembros de tu equipo aparecerán aquí una vez que los invites a colaborar.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                currentMemberCount={currentMemberCount}
                maxMembers={maxMembers}
            />

            {/* Close action menu when clicking outside */}
            {isActionMenuOpen && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setIsActionMenuOpen(null)}
                />
            )}
        </>
    );
}

