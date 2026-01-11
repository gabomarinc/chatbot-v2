import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface StepIdentityProps {
    name: string;
    onChange: (name: string) => void;
}

export function StepIdentity({ name, onChange }: StepIdentityProps) {
    return (

        <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-gradient-to-tr from-[#21AC96] to-[#4ADE80] rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-[#21AC96]/20 mb-4 transform -rotate-6">
                    <span className="text-3xl">👋</span>
                </div>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">¡Hola! Vamos a crear algo genial</h2>
                <p className="text-xl text-gray-500 leading-relaxed max-w-md mx-auto">
                    Todo gran asistente empieza con un nombre. <br />¿Cómo te gustaría llamar al tuyo?
                </p>
            </div>

            <div className="w-full max-w-lg">
                <div className="relative group">
                    <Input
                        id="agentName"
                        value={name}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Ej: Sofia de Ventas..."
                        className="text-2xl py-9 px-8 rounded-2xl border-2 border-gray-100 shadow-xl shadow-gray-100/50 text-center placeholder:text-gray-300 focus:border-[#21AC96] focus:ring-4 focus:ring-[#21AC96]/10 transition-all bg-white"
                        autoFocus
                    />
                    <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[#21AC96] to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </div>
                <p className="text-center text-sm text-gray-400 mt-6 font-medium">
                    Podrás cambiar esto más tarde en la configuración
                </p>
            </div>
        </div>
    );
}
