import { Globe, Smartphone } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface StepChannelsProps {
    channels: {
        web: boolean;
        whatsapp: boolean;
        messenger: boolean;
        instagram: boolean;
    };
    onChange: (channels: any) => void;
}

export function StepChannels({ channels, onChange }: StepChannelsProps) {

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
                <div className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${channels.web ? 'border-[#21AC96] bg-[#21AC96]/5' : 'border-gray-100 bg-white'}`}>
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
