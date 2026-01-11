import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface StepIdentityProps {
    name: string;
    onChange: (name: string) => void;
}

export function StepIdentity({ name, onChange }: StepIdentityProps) {
    return (
    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4 max-w-lg mx-auto">
                <span className="text-4xl animate-bounce inline-block mb-2">👋</span>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">¡Hola! Vamos a crear algo genial</h2>
                <p className="text-lg text-gray-500 leading-relaxed">
                    Todo gran asistente empieza con un nombre. <br />¿Cómo te gustaría llamar a tu nuevo agente?
                </p>
            </div>

            <div className="w-full max-w-xl relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#21AC96] to-[#4ADE80] rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-500"></div>
                <div className="relative">
                    <Input
                        id="agentName"
                        value={name}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Ej: Sofia de Ventas..."
                        className="text-2xl py-8 px-8 rounded-xl border-gray-200 shadow-xl shadow-gray-100/50 text-center placeholder:text-gray-300 focus:ring-2 focus:ring-[#21AC96] focus:border-transparent transition-all"
                        autoFocus
                    />
                </div>
                <p className="text-center text-sm text-gray-400 mt-4">
                    Podrás cambiar esto más tarde en la configuración.
                </p>
            </div>
        </div>
    );
}
