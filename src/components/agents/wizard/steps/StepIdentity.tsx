import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface StepIdentityProps {
    name: string;
    onChange: (name: string) => void;
}

export function StepIdentity({ name, onChange }: StepIdentityProps) {
    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Vamos a crear tu Agente</h2>
                <p className="text-gray-500">Empecemos por lo básico. ¿Cómo se llamará tu asistente virtual?</p>
            </div>

            <div className="space-y-3">
                <Label htmlFor="agentName" className="text-base font-semibold text-gray-700">Nombre del Agente</Label>
                <Input
                    id="agentName"
                    value={name}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Ej: Sofia de Ventas, Soporte Técnico..."
                    className="text-lg py-6 px-4 rounded-xl border-gray-200 focus:ring-[#21AC96] focus:border-[#21AC96]"
                    autoFocus
                />
            </div>
        </div>
    );
}
