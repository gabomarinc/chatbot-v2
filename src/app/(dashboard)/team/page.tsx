import { getTeamMembers } from '@/lib/actions/dashboard';
import { Plus, User, Mail, Shield, MoreVertical, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function TeamPage() {
    const members = await getTeamMembers();

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-2">Equipo</h1>
                    <p className="text-gray-500 font-medium">Gestiona los permisos y accesos de tus colaboradores</p>
                </div>
                <button className="flex items-center gap-2 px-5 py-3 bg-[#21AC96] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all cursor-pointer group active:scale-95">
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
                                                member.role === 'OWNER' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-50 text-gray-600 border-gray-100'
                                            )}>
                                                <Shield className="w-3 h-3" />
                                                {member.role === 'OWNER' ? 'Administrador' : 'Miembro'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                <span className="text-sm text-gray-700 font-bold">Activo</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
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
    );
}
