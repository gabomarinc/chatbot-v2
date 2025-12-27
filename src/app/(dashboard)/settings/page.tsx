"use client"

import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { changePassword } from '@/lib/actions/auth';

export default function SettingsPage() {
    const { data: session } = useSession();
    const [workspaceName, setWorkspaceName] = useState('Mi Workspace');
    const [timezone, setTimezone] = useState('America/Panama');
    const [language, setLanguage] = useState('es');
    
    // Password change states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<{ [key: string]: string[] } | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    const userEmail = session?.user?.email || '';

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
                // Clear success message after 5 seconds
                setTimeout(() => setPasswordSuccess(false), 5000);
            }
        } catch (error) {
            setPasswordError({ form: ['Ocurrió un error inesperado. Inténtalo de nuevo.'] });
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <div className="p-2">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-gray-900 mb-2 text-2xl font-semibold">Configuraciones</h1>
                <p className="text-gray-500">Gestiona la configuración de tu workspace y cuenta</p>
            </div>

            <div className="max-w-3xl space-y-6">
                {/* Workspace Settings */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                    <h2 className="text-gray-900 mb-6 text-lg font-semibold">Configuración del Workspace</h2>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm text-gray-700 mb-2 font-medium">Nombre del Workspace</label>
                            <input
                                type="text"
                                value={workspaceName}
                                onChange={(e) => setWorkspaceName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-700 mb-2 font-medium">Zona horaria</label>
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
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-700 mb-2 font-medium">Idioma</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            >
                                <option value="es">Español</option>
                                <option value="en">English</option>
                                <option value="pt">Português</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Account Settings */}
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                    <h2 className="text-gray-900 mb-6 text-lg font-semibold">Configuración de la Cuenta</h2>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm text-gray-700 mb-2 font-medium">Email</label>
                            <input
                                type="email"
                                value={userEmail}
                                disabled
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1">El email no puede ser modificado</p>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-700 mb-2 font-medium">Cambiar contraseña</label>
                            <form onSubmit={handlePasswordChange} className="space-y-3">
                                <div>
                                    <input
                                        type="password"
                                        placeholder="Contraseña actual"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                                            passwordError?.currentPassword ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
                                        }`}
                                    />
                                    {passwordError?.currentPassword && (
                                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {passwordError.currentPassword[0]}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <input
                                        type="password"
                                        placeholder="Nueva contraseña"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                                            passwordError?.newPassword ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
                                        }`}
                                    />
                                    {passwordError?.newPassword && (
                                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {passwordError.newPassword[0]}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <input
                                        type="password"
                                        placeholder="Confirmar nueva contraseña"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full px-4 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                                            passwordError?.confirmPassword ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
                                        }`}
                                    />
                                    {passwordError?.confirmPassword && (
                                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {passwordError.confirmPassword[0]}
                                        </p>
                                    )}
                                </div>
                                {passwordError?.form && (
                                    <p className="text-sm text-red-600 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {passwordError.form[0]}
                                    </p>
                                )}
                                {passwordSuccess && (
                                    <p className="text-sm text-green-600 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        Contraseña cambiada exitosamente
                                    </p>
                                )}
                                <button
                                    type="submit"
                                    disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save className="w-5 h-5" />
                                    {isChangingPassword ? 'Cambiando...' : 'Cambiar contraseña'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Save Button for Workspace Settings */}
                <div className="flex justify-end">
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium cursor-pointer">
                        <Save className="w-5 h-5" />
                        Guardar cambios
                    </button>
                </div>
            </div>
        </div>
    );
}
