'use client';

import { useState } from 'react';
import { createChannel, updateChannel } from '@/lib/actions/dashboard';
import { Loader2, Instagram, ShieldCheck, Key, Link2, Copy, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { InstagramEmbeddedSignup } from './InstagramEmbeddedSignup';

interface Agent {
    id: string;
    name: string;
}

interface InstagramConfigProps {
    agents: Agent[];
    existingChannel?: any;
    defaultAgentId?: string;
    metaAppId?: string;
}

export function InstagramConfig({ agents, existingChannel, defaultAgentId, metaAppId }: InstagramConfigProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [showManual, setShowManual] = useState(false);

    const [formData, setFormData] = useState({
        agentId: existingChannel?.agentId || defaultAgentId || (agents.length > 0 ? agents[0].id : ''),
        displayName: existingChannel?.displayName || 'Instagram DM',
        pageAccessToken: existingChannel?.configJson?.pageAccessToken || '',
        instagramAccountId: existingChannel?.configJson?.instagramAccountId || '',
        verifyToken: existingChannel?.configJson?.verifyToken || Math.random().toString(36).substring(7),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.pageAccessToken || !formData.instagramAccountId) {
            toast.error('Page Access Token e Instagram Account ID son obligatorios');
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                agentId: formData.agentId,
                displayName: formData.displayName,
                type: 'INSTAGRAM' as const,
                configJson: {
                    pageAccessToken: formData.pageAccessToken,
                    instagramAccountId: formData.instagramAccountId,
                    verifyToken: formData.verifyToken
                }
            };

            if (existingChannel) {
                await updateChannel(existingChannel.id, {
                    displayName: formData.displayName,
                    configJson: payload.configJson
                });
            } else {
                await createChannel(payload);
            }

            setIsSaved(true);
            toast.success('¡Configuración de Instagram guardada! 🎉');
            router.refresh();
            setTimeout(() => setIsSaved(false), 3000);
        } catch (error) {
            console.error('Error saving Instagram:', error);
            toast.error('Error al guardar la configuración');
        } finally {
            setIsLoading(false);
        }
    };

    const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/instagram`;

    // Automatic Setup Mode (Default if App ID exists)
    if (metaAppId && !showManual) {
        return (
            <div className="animate-fade-in space-y-8">
                <InstagramEmbeddedSignup
                    appId={metaAppId}
                    agentId={formData.agentId}
                    onSuccess={() => {
                        router.refresh();
                        setIsSaved(true);
                    }}
                />

                <div className="text-center">
                    <button
                        onClick={() => setShowManual(true)}
                        className="text-gray-400 text-xs font-bold hover:text-gray-600 uppercase tracking-widest transition-colors"
                    >
                        Configurar Manualmente (Avanzado)
                    </button>
                </div>

                {/* Show Agent Selector even in Auto Mode if there are multiple agents */}
                {agents.length > 1 && (
                    <div className="max-w-md mx-auto">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block text-center">
                            Agente que responderá
                        </label>
                        <select
                            disabled={!!existingChannel}
                            value={formData.agentId}
                            onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                            className="w-full px-5 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-pink-500/5 transition-all font-medium appearance-none cursor-pointer text-center"
                        >
                            {agents.map(agent => (
                                <option key={agent.id} value={agent.id}>{agent.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in">
            {/* Configuration Form */}
            <div className="space-y-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center text-pink-600">
                            <Key className="w-5 h-5" />
                        </div>
                        <h3 className="text-gray-900 font-extrabold text-lg tracking-tight">Credenciales de Meta</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Agente Responsable</label>
                            <p className="text-xs text-gray-500 ml-1 mb-2">Este agente responderá automáticamente los mensajes de Instagram</p>
                            <select
                                disabled={!!existingChannel}
                                value={formData.agentId}
                                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-pink-500/5 focus:bg-white focus:border-pink-500 transition-all font-medium appearance-none cursor-pointer disabled:opacity-50"
                            >
                                {agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Page Access Token</label>
                            <p className="text-xs text-gray-500 ml-1 mb-2">Token de acceso de tu página de Facebook conectada a Instagram</p>
                            <input
                                type="password"
                                value={formData.pageAccessToken}
                                onChange={(e) => setFormData({ ...formData, pageAccessToken: e.target.value })}
                                placeholder="EAAxxxxxx..."
                                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-pink-500/5 focus:bg-white focus:border-pink-500 transition-all font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Instagram Account ID</label>
                            <p className="text-xs text-gray-500 ml-1 mb-2">ID de tu cuenta de Instagram Business</p>
                            <input
                                type="text"
                                value={formData.instagramAccountId}
                                onChange={(e) => setFormData({ ...formData, instagramAccountId: e.target.value })}
                                placeholder="1234567890..."
                                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-pink-500/5 focus:bg-white focus:border-pink-500 transition-all font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <Link2 className="w-5 h-5" />
                        </div>
                        <h3 className="text-gray-900 font-extrabold text-lg tracking-tight">Configuración del Webhook</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-xs text-blue-700 leading-relaxed font-medium space-y-2">
                            <p className="font-bold">📍 ¿Dónde configurar esto?</p>
                            <p>En Meta for Developers → Tu App → Instagram → Configuration</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Callback URL</label>
                            <div className="relative">
                                <input
                                    readOnly
                                    type="text"
                                    value={webhookUrl}
                                    className="w-full px-5 py-3.5 pr-12 bg-gray-50 border border-transparent rounded-2xl text-sm transition-all font-mono text-gray-600"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(webhookUrl);
                                        toast.success('URL copiada al portapapeles');
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <Copy className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 ml-1">Verify Token</label>
                            <div className="relative">
                                <input
                                    readOnly
                                    type="text"
                                    value={formData.verifyToken}
                                    className="w-full px-5 py-3.5 pr-12 bg-gray-50 border border-transparent rounded-2xl text-sm transition-all font-mono text-gray-600"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(formData.verifyToken);
                                        toast.success('Token copiado al portapapeles');
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <Copy className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-xs text-amber-700 leading-relaxed font-medium space-y-2">
                            <p className="font-bold">⚠️ Importante: Suscripciones</p>
                            <p>No olvides suscribirte a <span className="font-bold">messages</span> y <span className="font-bold">messaging_postbacks</span></p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !formData.pageAccessToken || !formData.instagramAccountId}
                    className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-pink-600/20 hover:shadow-pink-600/30 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isSaved ? (
                        <>
                            <CheckCircle2 className="w-5 h-5" />
                            <span>¡Guardado!</span>
                        </>
                    ) : (
                        <span>{existingChannel ? 'Actualizar Configuración' : 'Activar Canal Instagram'}</span>
                    )}
                </button>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={async () => {
                            if (!formData.pageAccessToken) return toast.error('Pega un token primero');
                            const { testInstagramConnection } = await import('@/lib/actions/instagram-auth');
                            toast.promise(testInstagramConnection(formData.pageAccessToken), {
                                loading: 'Probando token...',
                                success: (data) => {
                                    if (data.success) return `¡Token Válido! Conectado como: ${data.name}`;
                                    throw new Error(data.error);
                                },
                                error: (err) => `Error: ${err.message}`
                            });
                        }}
                        className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors mb-4"
                    >
                        Probar Conexión (Debug)
                    </button>
                </div>

                {metaAppId && (
                    <div className="text-center pt-2">
                        <button
                            onClick={() => setShowManual(false)}
                            className="text-pink-600 text-xs font-bold hover:text-pink-700 uppercase tracking-widest transition-colors"
                        >
                            ← Volver a Conexión Automática
                        </button>
                    </div>
                )}
            </div>

            {/* Guide Column */}
            <div className="space-y-8">
                <div className="bg-gradient-to-br from-pink-900 to-purple-900 p-8 rounded-[2.5rem] border border-pink-800 shadow-xl space-y-6 text-left">
                    <div className="flex items-center gap-3 text-white">
                        <Instagram className="w-6 h-6 text-pink-400" />
                        <h3 className="font-extrabold text-xl tracking-tight">Guía Paso a Paso</h3>
                    </div>

                    <div className="space-y-6 text-gray-300 text-sm font-medium">
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-pink-800 flex items-center justify-center text-sm text-white shrink-0 font-bold">1</div>
                            <div className="space-y-1">
                                <p className="text-white font-bold">Cuenta Instagram Business</p>
                                <p className="text-sm">Asegúrate de tener una cuenta de Instagram Business (no personal). Si no la tienes, conviértela desde la app de Instagram en Configuración → Cambiar a cuenta profesional.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-pink-800 flex items-center justify-center text-sm text-white shrink-0 font-bold">2</div>
                            <div className="space-y-1">
                                <p className="text-white font-bold">Conectar a Facebook</p>
                                <p className="text-sm">Tu Instagram Business debe estar conectado a una Página de Facebook. Ve a Instagram → Configuración → Cuenta → Páginas vinculadas.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-pink-800 flex items-center justify-center text-sm text-white shrink-0 font-bold">3</div>
                            <div className="space-y-2">
                                <p className="text-white font-bold">Crear App en Meta</p>
                                <p className="text-sm">Ve a <a href="https://developers.facebook.com" target="_blank" className="underline text-pink-400 hover:text-pink-300">developers.facebook.com</a> → Mis Apps → Crear App de tipo <span className="text-white font-bold">Business</span>.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-pink-800 flex items-center justify-center text-sm text-white shrink-0 font-bold">4</div>
                            <div className="space-y-1">
                                <p className="text-white font-bold">Añadir Instagram</p>
                                <p className="text-sm">En tu app, ve a Productos → Añadir Producto → Selecciona <span className="text-white font-bold">Instagram</span> → Configurar.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-pink-800 flex items-center justify-center text-sm text-white shrink-0 font-bold">5</div>
                            <div className="space-y-2">
                                <p className="text-white font-bold">Generar Access Token</p>
                                <p className="text-sm">Instagram → Configuración → Generar token. Asegúrate de seleccionar permisos:</p>
                                <ul className="list-disc list-inside text-xs space-y-1 text-pink-200">
                                    <li><code className="text-pink-300">instagram_basic</code></li>
                                    <li><code className="text-pink-300">instagram_manage_messages</code></li>
                                    <li><code className="text-pink-300">pages_messaging</code></li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-pink-800 flex items-center justify-center text-sm text-white shrink-0 font-bold">6</div>
                            <div className="space-y-1">
                                <p className="text-white font-bold">Copiar Instagram Account ID</p>
                                <p className="text-sm">En la misma página, copia el <span className="text-white font-bold">Instagram Account ID</span> (número largo).</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-pink-800 flex items-center justify-center text-sm text-white shrink-0 font-bold">7</div>
                            <div className="space-y-1">
                                <p className="text-white font-bold">Configurar Webhook</p>
                                <p className="text-sm">Instagram → Configuration → Webhooks → Editar. Pega la <span className="text-white font-bold">Callback URL</span> y el <span className="text-white font-bold">Verify Token</span> de arriba.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-pink-800 flex items-center justify-center text-sm text-white shrink-0 font-bold">8</div>
                            <div className="space-y-1">
                                <p className="text-white font-bold">Suscripciones</p>
                                <p className="text-sm">Haz clic en <span className="text-white font-bold">Suscribirse</span> a los campos: <code className="text-pink-300">messages</code> y <code className="text-pink-300">messaging_postbacks</code>.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm text-white shrink-0 font-bold">✓</div>
                            <div className="space-y-1">
                                <p className="text-white font-bold">¡Listo! 🎉</p>
                                <p className="text-sm">Guarda la configuración arriba. Tu chatbot ahora responderá automáticamente los DMs de Instagram.</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-pink-800">
                        <div className="flex items-center gap-2 text-pink-400 text-xs font-bold uppercase tracking-widest">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Conexión Segura y Automática</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Tu chatbot responderá 24/7 sin intervención manual</p>
                    </div>

                    <a
                        href="https://developers.facebook.com/docs/messenger-platform/instagram"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-pink-400 hover:text-pink-300 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        <span>Documentación oficial de Meta</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
