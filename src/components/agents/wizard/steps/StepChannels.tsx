import { Globe, Smartphone, MessageCircle, Instagram, Facebook, Key, Hash, Lock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { WhatsAppEmbeddedSignup } from '@/components/channels/WhatsAppEmbeddedSignup';

interface StepChannelsProps {
    channels: {
        web: boolean;
        whatsapp: boolean;
        messenger: boolean;
        instagram: boolean;
    };
    webConfig: {
        title: string;
        welcomeMessage: string;
        primaryColor: string;
    };
    whatsappConfig?: {
        phoneNumberId: string;
        accessToken: string;
        verifyToken: string;
    };
    onChange: (channels: any) => void;
    onWebConfigChange: (config: any) => void;
    onWhatsappConfigChange?: (config: any) => void;
    agentId?: string | null;
    webChannelId?: string | null;
}

export function StepChannels({ channels, webConfig, whatsappConfig, onChange, onWebConfigChange, onWhatsappConfigChange, agentId, webChannelId }: StepChannelsProps) {

    const handleToggle = (key: string) => {
        onChange({ ...channels, [key]: !channels[key as keyof typeof channels] });
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-bold text-gray-900">¿Dónde vivirá tu Agente?</h2>
                <p className="text-gray-500">Selecciona los canales donde quieres habilitarlo.</p>
            </div>

            <div className="space-y-4 max-w-xl mx-auto">
                {/* Web Chat */}
                <div className={`p-5 rounded-2xl border-2 transition-all ${channels.web ? 'border-[#21AC96] bg-[#21AC96]/5' : 'border-gray-100 bg-white'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${channels.web ? 'bg-[#21AC96] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Sitio Web</h3>
                                <p className="text-sm text-gray-500">Widget de chat burbuja para tu página.</p>
                            </div>
                        </div>
                        <Switch checked={channels.web} onCheckedChange={() => handleToggle('web')} />
                    </div>

                    {/* CONFIGURACIÓN WEB */}
                    {channels.web && (
                        <div className="animate-in slide-in-from-top-2 border-t border-[#21AC96]/20 pt-4 mt-2 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-600 uppercase">Título del Widget</Label>
                                    <Input
                                        placeholder="Ej: Chat de Soporte"
                                        value={webConfig.title}
                                        onChange={(e) => onWebConfigChange({ ...webConfig, title: e.target.value })}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-600 uppercase">Color Principal</Label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={webConfig.primaryColor}
                                            onChange={(e) => onWebConfigChange({ ...webConfig, primaryColor: e.target.value })}
                                            className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                                        />
                                        <Input
                                            value={webConfig.primaryColor}
                                            onChange={(e) => onWebConfigChange({ ...webConfig, primaryColor: e.target.value })}
                                            className="bg-white font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-600 uppercase">Mensaje de Bienvenida</Label>
                                <Input
                                    placeholder="Hola 👋 ¿En qué puedo ayudarte hoy?"
                                    value={webConfig.welcomeMessage}
                                    onChange={(e) => onWebConfigChange({ ...webConfig, welcomeMessage: e.target.value })}
                                    className="bg-white"
                                />
                            </div>

                            {/* Snippet Preview */}
                            <div className="bg-gray-900 rounded-xl p-4 overflow-hidden relative group">
                                <div className="text-[10px] text-gray-500 font-bold uppercase mb-2">Código de Instalación (Previsualización)</div>
                                <pre className="font-mono text-[10px] text-green-400 opacity-60 break-all whitespace-pre-wrap">
                                    {webChannelId ? `<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://chat.realtos.ai'}/widget.js" data-channel-id="${webChannelId}"></script>` :
                                        `<script>
  window.chatConfig = { agentId: "${agentId || 'PENDING'}" };
</script>
<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://chat.realtos.ai'}/widget.js" async></script>`}
                                </pre>
                                {!agentId && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 backdrop-blur-[1px]">
                                        <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-bold border border-gray-700 shadow-lg">Se activará al crear el agente</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* WhatsApp */}
                <div className={`p-5 rounded-2xl border-2 transition-all ${channels.whatsapp ? 'border-[#21AC96] bg-[#21AC96]/5' : 'border-gray-100 bg-white'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${channels.whatsapp ? 'bg-[#21AC96] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">WhatsApp</h3>
                                <p className="text-sm text-gray-500">Conecta tu número de WhatsApp Business.</p>
                            </div>
                        </div>
                        <Switch checked={channels.whatsapp} onCheckedChange={() => handleToggle('whatsapp')} />
                    </div>

                    {channels.whatsapp && (
                        <div className="animate-in slide-in-from-top-2 border-t border-[#21AC96]/20 pt-4 mt-2">
                            {agentId ? (
                                <WhatsAppEmbeddedSignup
                                    appId={process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || ''}
                                    agentId={agentId}
                                    onSuccess={() => {
                                        // Optional: Refresh or show success
                                    }}
                                />
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-4 opacity-50">
                                    <div className="w-16 h-16 bg-[#1877F2]/10 text-[#1877F2] rounded-full flex items-center justify-center mx-auto">
                                        <Facebook className="w-8 h-8" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-500">
                                        Creando agente para habilitar conexión...
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Instagram */}
                <div className={`p-5 rounded-2xl border-2 transition-all ${channels.instagram ? 'border-[#21AC96] bg-[#21AC96]/5' : 'border-gray-100 bg-white'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${channels.instagram ? 'bg-[#21AC96] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                <Instagram className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Instagram</h3>
                                <p className="text-sm text-gray-500">Respuestas automáticas en DMs.</p>
                            </div>
                        </div>
                        <Switch checked={channels.instagram} onCheckedChange={() => handleToggle('instagram')} />
                    </div>

                    {channels.instagram && (
                        <div className="animate-in slide-in-from-top-2 border-t border-[#21AC96]/20 pt-4 mt-2">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded-lg flex items-center justify-center text-white shrink-0">
                                    <Instagram className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-900">Integración Directa</p>
                                    <p className="text-[10px] text-gray-500">
                                        Podrás seleccionar tu cuenta de Instagram Business después de crear el agente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Messenger */}
                <div className={`p-5 rounded-2xl border-2 transition-all ${channels.messenger ? 'border-[#21AC96] bg-[#21AC96]/5' : 'border-gray-100 bg-white'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${channels.messenger ? 'bg-[#21AC96] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                <Facebook className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Messenger</h3>
                                <p className="text-sm text-gray-500">Automatiza tu página de Facebook.</p>
                            </div>
                        </div>
                        <Switch checked={channels.messenger} onCheckedChange={() => handleToggle('messenger')} />
                    </div>

                    {channels.messenger && (
                        <div className="animate-in slide-in-from-top-2 border-t border-[#21AC96]/20 pt-4 mt-2">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 bg-[#1877F2] rounded-lg flex items-center justify-center text-white shrink-0">
                                    <Facebook className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-900">Integración Directa</p>
                                    <p className="text-[10px] text-gray-500">
                                        Podrás seleccionar tu Página de Facebook después de crear el agente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
                * Podrás cambiar estas configuraciones en cualquier momento.
            </p>
        </div>
    );
}
