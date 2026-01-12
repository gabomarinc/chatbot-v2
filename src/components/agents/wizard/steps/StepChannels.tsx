import { Globe, Smartphone, MessageCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

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
    onChange: (channels: any) => void;
    onWebConfigChange: (config: any) => void;
}

export function StepChannels({ channels, webConfig, onChange, onWebConfigChange }: StepChannelsProps) {

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

                    {/* CONFIGURACIÓN EXPANDIBLE */}
                    {channels.web && (
                        <div className="animate-in slide-in-from-top-2 border-t border-[#21AC96]/20 pt-4 mt-2 space-y-4">
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

                            {/* PREVIEW MINIATURA */}
                            <div className="bg-gray-100 p-4 rounded-xl flex justify-end items-end h-32 relative overflow-hidden border border-gray-200">
                                <div className="absolute top-2 left-2 text-[10px] text-gray-400 font-bold uppercase">Vista Previa</div>
                                {/* Message Bubble */}
                                {webConfig.welcomeMessage && (
                                    <div className="bg-white p-2 rounded-lg rounded-br-none shadow-sm text-xs text-gray-700 mb-2 mr-2 max-w-[200px] border border-gray-100 animate-in zoom-in slide-in-from-right duration-300">
                                        {webConfig.welcomeMessage}
                                    </div>
                                )}
                                {/* Chat Button */}
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg z-10"
                                    style={{ backgroundColor: webConfig.primaryColor }}
                                >
                                    <MessageCircle className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* WhatsApp */}
                <div className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${channels.whatsapp ? 'border-[#21AC96] bg-[#21AC96]/5' : 'border-gray-100 bg-white'}`}>
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
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
                * Podrás configurar los detalles de conexión de cada canal más tarde.
            </p>
        </div>
    );
}
