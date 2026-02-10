'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveGlobalSettings, getGlobalSettings } from '@/lib/actions/admin'; // We will create this
import { Loader2, Key, CheckCircle, ShieldAlert } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export default function AdminSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [openaiKey, setOpenaiKey] = useState('');
    const [googleKey, setGoogleKey] = useState('');
    const [metaAppId, setMetaAppId] = useState('');
    const [instagramAppId, setInstagramAppId] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const settings = await getGlobalSettings();
            if (settings) {
                setOpenaiKey(settings.openaiKey);
                setGoogleKey(settings.googleKey);
                setMetaAppId(settings.metaAppId);
                setInstagramAppId(settings.instagramAppId || '');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar configuraciones');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setIsSaving(true);
        try {
            const result = await saveGlobalSettings({ openaiKey, googleKey, metaAppId, instagramAppId });
            if (result.success) {
                toast.success('Configuraciones guardadas correctamente');
            } else {
                toast.error('Error al guardar');
            }
        } catch (error) {
            toast.error('Error inesperado');
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configuración Global</h1>
                <p className="text-slate-500 mt-2">Gestiona las llaves maestras de la plataforma.</p>
            </div>

            <div className="grid gap-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-teal-600" />
                            <CardTitle>Motores de IA</CardTitle>
                        </div>
                        <CardDescription>
                            Define las API Keys que se usarán para generar respuestas en todos los agentes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">OpenAI API Key (GPT-4o)</Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-400 text-xs">sk-</span>
                                    </div>
                                    <Input
                                        type="password"
                                        value={openaiKey}
                                        onChange={(e) => setOpenaiKey(e.target.value)}
                                        className="pl-8 font-mono text-sm"
                                        placeholder="sk-..."
                                    />
                                </div>
                                <p className="text-xs text-slate-500">Usada para modelos GPT-4o-mini y GPT-4o.</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Google Gemini API Key</Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-400 text-xs">AI</span>
                                    </div>
                                    <Input
                                        type="password"
                                        value={googleKey}
                                        onChange={(e) => setGoogleKey(e.target.value)}
                                        className="pl-8 font-mono text-sm"
                                        placeholder="AIza..."
                                    />
                                </div>
                                <p className="text-xs text-slate-500">Usada para modelos Gemini 1.5 Flash y Pro.</p>
                            </div>

                            <div className="pt-6 mt-6 border-t border-slate-100">
                                <Label className="text-sm font-bold text-slate-800">Conexión Profesional de WhatsApp</Label>
                                <CardDescription className="mb-4">
                                    Configura el ID de tu App de Meta para habilitar el flujo de "Embedded Signup" oficial.
                                </CardDescription>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider ml-1">Meta App ID</Label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <ShieldAlert className="h-4 w-4 text-gray-300" />
                                        </div>
                                        <Input
                                            type="text"
                                            value={metaAppId}
                                            onChange={(e) => setMetaAppId(e.target.value)}
                                            className="pl-9 font-mono text-sm"
                                            placeholder="Ej: 1528394019284..."
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400">Encuentra este ID en el panel principal de tu App en Meta for Developers.</p>
                                </div>

                                <div className="space-y-2 mt-4">
                                    <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider ml-1">Instagram App ID</Label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <ShieldAlert className="h-4 w-4 text-gray-300" />
                                        </div>
                                        <Input
                                            type="text"
                                            value={instagramAppId}
                                            onChange={(e) => setInstagramAppId(e.target.value)}
                                            className="pl-9 font-mono text-sm"
                                            placeholder="Ej: 25648355308093184..."
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400">ID específico para Instagram Login (diferente al de Facebook/WhatsApp).</p>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3">
                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg text-xs font-medium mr-auto border border-amber-100">
                                    <ShieldAlert className="h-4 w-4" />
                                    Estas llaves tienen acceso total de facturación.
                                </div>
                                <Button type="submit" disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white">
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="mr-2 h-4 w-4" /> Guardar Cambios
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
