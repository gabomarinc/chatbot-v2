"use client"

import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, Trash2, Loader2, Lock, ShieldAlert, Globe, Layout, UserCircle, Key } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { changePassword, deleteUserAccount } from '@/lib/actions/auth';
import { getWorkspaceInfo } from '@/lib/actions/workspace';
import { updateWorkspaceSettings } from '@/lib/actions/workspace-settings';
import { toast } from 'sonner';

export default function SettingsPage() {
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(true);
    const [workspace, setWorkspace] = useState<{ id: string, name: string, role: string } | null>(null);
    const [workspaceName, setWorkspaceName] = useState('');
    const [timezone, setTimezone] = useState('America/Panama');
    const [language, setLanguage] = useState('es');

    // Password change states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<{ [key: string]: string[] } | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // Delete Account states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');

    const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);

    useEffect(() => {
        async function fetchInfo() {
            try {
                const info = await getWorkspaceInfo();
                if (info) {
                    setWorkspace({ id: info.id, name: info.name, role: info.role });
                    setWorkspaceName(info.name);
                }
            } catch (error) {
                console.error("Error fetching workspace info:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchInfo();
    }, []);

    const userEmail = session?.user?.email || '';

    const handleWorkspaceSave = async () => {
        if (!workspace?.id) return;
        setIsSavingWorkspace(true);
        try {
            const result = await updateWorkspaceSettings(workspace.id, { name: workspaceName });
            if (result.success) {
                toast.success('Configuración del workspace guardada');
            } else {
                toast.error(result.error || 'Error al guardar');
            }
        } catch (error) {
            toast.error('Ocurrió un error inesperado');
        } finally {
            setIsSavingWorkspace(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!session?.user?.id) {
            setPasswordError({ form: ['Debes iniciar sesión para cambiar tu contraseña'] });
            return;
        }

        setIsChangingPassword(true);
        setPasswordError(null);
        setPasswordSuccess(false);

        try {
            const result = await changePassword(
                session.user.id,
                currentPassword,
                newPassword,
                confirmPassword
            );

            if (result.error) {
                setPasswordError(result.error);
            } else if (result.success) {
                setPasswordSuccess(true);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                toast.success('Contraseña actualizada correctamente');
                // Clear success message after 5 seconds
                setTimeout(() => setPasswordSuccess(false), 5000);
            }
        } catch (error) {
            setPasswordError({ form: ['Ocurrió un error inesperado. Inténtalo de nuevo.'] });
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteInput !== 'ELIMINAR MIS DATOS') {
            toast.error('Debes escribir "ELIMINAR MIS DATOS" para confirmar');
            return;
        }

        if (!session?.user?.id) return;

        setIsDeletingAccount(true);
        try {
            const result = await deleteUserAccount(session.user.id);
            if (result?.success) {
                toast.success('Cuenta eliminada permanentemente');
                await signOut({ callbackUrl: '/login' });
            } else {
                toast.error(result?.error || 'Error al eliminar la cuenta');
                setIsDeletingAccount(false);
            }
        } catch (error) {
            console.error('Delete account error:', error);
            toast.error('Ocurrió un error inesperado');
            setIsDeletingAccount(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-[#21AC96] animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
            {/* Header Section with Gradient Background */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 mb-10 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#21AC96] opacity-10 blur-[100px] -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#21AC96] opacity-5 blur-[80px] -ml-32 -mb-32"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-[#21AC96]/10 rounded-2xl border border-[#21AC96]/20">
                                <Layout className="w-6 h-6 text-[#21AC96]" />
                            </div>
                            <span className="text-[10px] font-black text-[#21AC96] uppercase tracking-[0.2em]">Configuraciones Avanzadas</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">Ajustes del Sistema</h1>
                        <p className="text-slate-400 text-lg">Personaliza tu experiencia y gestiona la seguridad de tu entorno.</p>
                    </div>
                    <div className="hidden md:block">
                        <div className="px-5 py-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                            <span className="text-slate-400 text-xs block mb-1">ID de Workspace</span>
                            <span className="text-white font-mono text-sm">{workspace?.id || '---'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Forms */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Workspace Settings Card */}
                    <div className="group bg-white rounded-[2rem] p-8 md:p-10 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-[#21AC96]/5 transition-all">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-[#21AC96]/10 group-hover:text-[#21AC96] transition-colors">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Preferencias del Workspace</h2>
                                <p className="text-slate-500 text-sm">Define la identidad y ubicación de tu entorno.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Workspace</label>
                                    <input
                                        type="text"
                                        value={workspaceName}
                                        onChange={(e) => setWorkspaceName(e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#21AC96]/10 focus:border-[#21AC96] transition-all font-semibold text-slate-700"
                                        placeholder="Ej. Mi Empresa AI"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Zona Horaria</label>
                                    <select
                                        value={timezone}
                                        onChange={(e) => setTimezone(e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#21AC96]/10 focus:border-[#21AC96] transition-all font-semibold text-slate-700 appearance-none cursor-pointer"
                                    >
                                        <option value="America/Panama">🇵🇦 América/Panamá (UTC-5)</option>
                                        <option value="America/Mexico_City">🇲🇽 América/México (UTC-6)</option>
                                        <option value="America/Bogota">CO América/Bogotá (UTC-5)</option>
                                        <option value="America/Lima">🇵🇪 América/Lima (UTC-5)</option>
                                        <option value="America/Santiago">🇨🇱 América/Santiago (UTC-3)</option>
                                        <option value="America/Buenos_Aires">🇦🇷 América/Buenos Aires (UTC-3)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Idioma de Interfaz</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['es', 'en', 'pt'].map((lang) => (
                                        <button
                                            key={lang}
                                            onClick={() => setLanguage(lang)}
                                            className={`px-4 py-4 rounded-2xl text-sm font-black transition-all border ${
                                                language === lang 
                                                ? 'bg-[#21AC96] border-[#21AC96] text-white shadow-lg shadow-[#21AC96]/20' 
                                                : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >
                                            {lang === 'es' ? 'Español' : lang === 'en' ? 'English' : 'Português'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    onClick={handleWorkspaceSave}
                                    disabled={isSavingWorkspace}
                                    className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl hover:bg-[#21AC96] transition-all font-black text-xs uppercase tracking-[0.1em] disabled:opacity-50"
                                >
                                    {isSavingWorkspace ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {isSavingWorkspace ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Security Card */}
                    <div className="group bg-white rounded-[2rem] p-8 md:p-10 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-[#21AC96]/5 transition-all">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Seguridad de la Cuenta</h2>
                                <p className="text-slate-500 text-sm">Gestiona tus credenciales y acceso al sistema.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                        <UserCircle className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Email Registrado</span>
                                        <span className="text-slate-700 font-bold">{userEmail}</span>
                                    </div>
                                    <div className="px-3 py-1 bg-slate-200 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">Bloqueado</div>
                                </div>
                            </div>

                            <form onSubmit={handlePasswordChange} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Cambiar Contraseña</label>
                                        <div className="relative">
                                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                                                <Key className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="password"
                                                placeholder="Contraseña actual"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className={`w-full pl-14 pr-5 py-4 bg-slate-50 border rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 transition-all font-semibold text-slate-700 ${passwordError?.currentPassword ? 'border-red-300 ring-red-500/10' : 'border-slate-100'}`}
                                            />
                                        </div>
                                        {passwordError?.currentPassword && (
                                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-bold">
                                                <AlertCircle className="w-3 h-3" />
                                                {passwordError.currentPassword[0]}
                                            </p>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="password"
                                            placeholder="Nueva contraseña"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className={`w-full pl-14 pr-5 py-4 bg-slate-50 border rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 transition-all font-semibold text-slate-700 ${passwordError?.newPassword ? 'border-red-300 ring-red-500/10' : 'border-slate-100'}`}
                                        />
                                        {passwordError?.newPassword && (
                                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-bold">
                                                <AlertCircle className="w-3 h-3" />
                                                {passwordError.newPassword[0]}
                                            </p>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="password"
                                            placeholder="Confirmar nueva contraseña"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`w-full pl-14 pr-5 py-4 bg-slate-50 border rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 transition-all font-semibold text-slate-700 ${passwordError?.confirmPassword ? 'border-red-300 ring-red-500/10' : 'border-slate-100'}`}
                                        />
                                        {passwordError?.confirmPassword && (
                                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-bold">
                                                <AlertCircle className="w-3 h-3" />
                                                {passwordError.confirmPassword[0]}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {passwordError?.form && (
                                    <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-3 text-sm font-bold">
                                        <AlertCircle className="w-5 h-5" />
                                        {passwordError.form[0]}
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                                        className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl hover:bg-purple-600 transition-all font-black text-xs uppercase tracking-[0.1em] disabled:opacity-50"
                                    >
                                        {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                                        {isChangingPassword ? 'Cambiando...' : 'Actualizar Credenciales'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right Column: Danger Zone and Info */}
                <div className="lg:col-span-4 space-y-8">
                    
                    {/* Status Card */}
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#21AC96] opacity-10 rounded-full -mr-16 -mt-16"></div>
                        <h3 className="text-lg font-black mb-6 tracking-tight flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
                            Sistema Activo
                        </h3>
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center py-3 border-b border-white/5">
                                <span className="text-slate-400 text-sm">Tu Rol</span>
                                <span className="bg-[#21AC96] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{workspace?.role || '---'}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-white/5">
                                <span className="text-slate-400 text-sm">Versión del Core</span>
                                <span className="font-mono text-xs font-bold text-slate-300">v2.4.0-internal</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-slate-400 text-sm">Seguridad SSL</span>
                                <span className="text-green-400 text-[10px] font-black uppercase tracking-widest">Activo</span>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-50 rounded-[2rem] p-8 border border-red-100">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-600 shadow-sm">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-red-600 tracking-tight">Zona de Peligro</h2>
                                <p className="text-red-800/60 text-xs">Acciones irreversibles sobre tu cuenta.</p>
                            </div>
                        </div>

                        {!showDeleteConfirm ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-full py-4 bg-white border border-red-200 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
                            >
                                Iniciar Eliminación de Cuenta
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-red-700 text-xs leading-relaxed font-bold">
                                    ¡Atención! Esto borrará permanentemente tus agentes, contactos y configuraciones.
                                </p>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-red-400 uppercase tracking-widest block">Escribe: ELIMINAR MIS DATOS</label>
                                    <input
                                        type="text"
                                        value={deleteInput}
                                        onChange={(e) => setDeleteInput(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-red-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold text-red-700 text-sm mb-4"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            setShowDeleteConfirm(false);
                                            setDeleteInput('');
                                        }}
                                        className="py-3 bg-white text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all font-black text-[10px] uppercase tracking-widest"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={isDeletingAccount || deleteInput !== 'ELIMINAR MIS DATOS'}
                                        className="flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                                    >
                                        {isDeletingAccount && <Loader2 className="w-3 h-3 animate-spin" />}
                                        Eliminar Todo
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
