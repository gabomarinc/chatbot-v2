import { BadgeCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepSuccessProps {
    onClose: () => void;
}

export function StepSuccess({ onClose }: StepSuccessProps) {
    return (
        <div className="space-y-8 animate-in zoom-in-50 duration-500 text-center py-8">
            <div className="flex justify-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                    <BadgeCheck className="w-12 h-12 text-green-600" />
                </div>
            </div>

            <div className="space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">¡Tu Agente está listo! 🚀</h2>
                <p className="text-gray-500 max-w-md mx-auto">
                    Hemos configurado tu asistente con la personalidad y conocimientos seleccionados. Ya puedes empezar a probarlo.
                </p>
            </div>

            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-6 rounded-2xl max-w-lg mx-auto relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles className="w-24 h-24 text-indigo-600" />
                </div>

                <div className="relative z-10 text-left space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">Pro</span>
                        <h3 className="font-bold text-indigo-900 text-lg">¿Buscas resultados perfectos?</h3>
                    </div>
                    <p className="text-indigo-800 text-sm leading-relaxed">
                        El entrenamiento automático es genial, pero un experto puede llevar tu IA al siguiente nivel afinando cada respuesta.
                    </p>
                    <Button variant="outline" className="w-full bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800">
                        Agenda una sesión con un experto
                    </Button>
                </div>
            </div>

            <div className="pt-4">
                <Button onClick={onClose} size="lg" className="px-12 bg-[#21AC96] hover:bg-[#21AC96]/90 text-white rounded-full text-lg shadow-lg hover:shadow-xl transition-all">
                    Ir al Panel de Control
                </Button>
            </div>
        </div>
    );
}
