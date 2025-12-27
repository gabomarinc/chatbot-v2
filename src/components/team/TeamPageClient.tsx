'use client'

import { useState, useEffect, useRef } from 'react';
import { Plus, User, Mail, Shield, MoreVertical, Trash2, Edit, Users, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InviteMemberModal } from './InviteMemberModal';
import { MaxMembersModal } from './MaxMembersModal';
import { removeTeamMember, updateTeamMemberRole } from '@/lib/actions/team';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface TeamMember {
    id: string;
    role: 'OWNER' | 'MANAGER' | 'AGENT';
    user: {
        id: string;
        name: string | null;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        lastLoginAt: Date | null;
    };
}

interface TeamPageClientProps {
    initialMembers: TeamMember[];
    currentMemberCount: number;
    maxMembers: number;
    currentUserId?: string;
    currentPlanName?: string;
}

export function TeamPageClient({ initialMembers, currentMemberCount, maxMembers, currentUserId, currentPlanName = 'Actual' }: TeamPageClientProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [members, setMembers] = useState(initialMembers);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isMaxMembersModalOpen, setIsMaxMembersModalOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const actionMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    useEffect(() => {
        setMounted(true);
    }, []);

    // Get current user ID from session or prop
    const currentUser = currentUserId || session?.user?.id;

    // Helper to determine user status
    const getUserStatus = (member: TeamMember): 'active' | 'pending' | 'offline' => {
        // Current user is always active
        if (currentUser && member.user.id === currentUser) {
            return 'active';
        }
        
        // If no lastLoginAt, user has never logged in - Pending
        if (!member.user.lastLoginAt) {
            return 'pending';
        }
        
        // User has logged in before - check if it's recent (within last 30 minutes = active, otherwise offline)
        const lastLogin = new Date(member.user.lastLoginAt).getTime();
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (now - lastLogin < thirtyMinutes) {
            return 'active';
        }
        
        return 'offline';
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

    const formatLastLogin = (lastLoginAt: Date | null) => {
        if (!lastLoginAt) return 'Nunca';
        
        const date = new Date(lastLoginAt);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const oneDay = 24 * 60 * 60 * 1000;
        
        if (diffMs < oneDay) {
            return formatDistanceToNow(date, { addSuffix: true, locale: es });
        }
        
        return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
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

    const handleInviteSuccess = async () => {
        // Refresh the page to show new member
        router.refresh();
        // Wait a moment and refresh again to ensure data is synced
        await new Promise(resolve => setTimeout(resolve, 1500));
        router.refresh();
    };

    const canInvite = currentMemberCount < maxMembers;

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isActionMenuOpen) {
                const menuElement = actionMenuRefs.current[isActionMenuOpen];
                const buttonElement = buttonRefs.current[isActionMenuOpen];
                if (
                    menuElement && !menuElement.contains(event.target as Node) &&
                    buttonElement && !buttonElement.contains(event.target as Node)
                ) {
                    setIsActionMenuOpen(null);
                }
            }
        };

        if (isActionMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isActionMenuOpen]);

    return (
        <>
            <div className="max-w-[1600px] mx-auto animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-3">Equipo</h1>
                        <div className="flex items-center gap-3 flex-wrap">
                            <p className="text-gray-500 font-medium">
                                Gestiona los permisos y accesos de tus colaboradores
                            </p>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold border bg-blue-50 text-blue-600 border-blue-100">
                                <Users className="w-4 h-4" />
                                <span>{currentMemberCount}/{maxMembers} miembros</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <button 
                            onClick={() => {
                                if (canInvite) {
                                    setIsInviteModalOpen(true);
                                } else {
                                    setIsMaxMembersModalOpen(true);
                                }
                            }}
                            className="flex items-center gap-2 px-5 py-3 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all cursor-pointer active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            Invitar Colaborador
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)] relative">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-50">
                                    <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Usuario / Email</th>
                                    <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Rol del Sistema</th>
                                    <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                                    <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Último Login</th>
                                    <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {members.length > 0 ? (
                                    members.map((member) => {
                                        const status = getUserStatus(member);
                                        const buttonRect = buttonRefs.current[member.id]?.getBoundingClientRect();
                                        return (
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
                                                    {status === 'active' && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                            <span className="text-sm text-gray-700 font-bold">Activo</span>
                                                        </div>
                                                    )}
                                                    {status === 'pending' && (
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-amber-500" />
                                                            <span className="text-sm text-amber-600 font-bold">Pendiente</span>
                                                        </div>
                                                    )}
                                                    {status === 'offline' && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                                            <span className="text-sm text-gray-600 font-bold">Desconectado</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-sm text-gray-700 font-medium">
                                                        {formatLastLogin(member.user.lastLoginAt)}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex justify-end">
                                                        <div className="relative">
                                                            <button 
                                                                ref={(el) => {
                                                                    if (el) buttonRefs.current[member.id] = el;
                                                                }}
                                                                onClick={() => setIsActionMenuOpen(isActionMenuOpen === member.id ? null : member.id)}
                                                                disabled={member.role === 'OWNER'}
                                                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <MoreVertical className="w-5 h-5" />
                                                            </button>
                                                            
                                                            {isActionMenuOpen === member.id && mounted && buttonRect && (
                                                                createPortal(
                                                                    <div 
                                                                        ref={(el) => {
                                                                            if (el) actionMenuRefs.current[member.id] = el;
                                                                        }}
                                                                        className="fixed bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[200] min-w-[192px]"
                                                                        style={{
                                                                            top: `${Math.min(buttonRect.bottom + 8, window.innerHeight - 150)}px`,
                                                                            right: `${Math.max(window.innerWidth - buttonRect.right, 16)}px`,
                                                                        }}
                                                                    >
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
                                                                    </div>,
                                                                    document.body
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
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
                onSuccess={handleInviteSuccess}
            />
            
            <MaxMembersModal
                isOpen={isMaxMembersModalOpen}
                onClose={() => setIsMaxMembersModalOpen(false)}
                currentPlanName={currentPlanName}
                currentMaxMembers={maxMembers}
            />
        </>
    );
}
