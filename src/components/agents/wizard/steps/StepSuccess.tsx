import { BadgeCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepSuccessProps {
    onClose: () => void;
}

export function StepSuccess({ onClose }: StepSuccessProps) {
    return (
        <div className="space-y-10 animate-in zoom-in-50 duration-700 py-12 flex flex-col items-center justify-center relative">
            {/* Background decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-teal-200/20 to-lime-200/20 rounded-full blur-3xl -z-10 animate-pulse" />

            <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-br from-[#21AC96] to-[#4ADE80] rounded-3xl rotate-3 flex items-center justify-center shadow-2xl shadow-[#21AC96]/40 animate-bounce">
                    <BadgeCheck className="w-16 h-16 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center animate-spin-slow">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
            </div>

            <div className="space-y-4 text-center max-w-lg">
                <h2 className="text-4xl font-black text-gray-900 tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    ¡Tu Agente está vivo! 🚀
                </h2>
                <p className="text-xl text-gray-500 leading-relaxed">
                    Hemos configurado todo con éxito. Tu asistente virtual está listo para aprender y ayudar.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 w-full max-w-md">
                <Button
                    onClick={onClose}
                    size="lg"
                    className="w-full bg-[#21AC96] hover:bg-[#21AC96]/90 text-white rounded-2xl h-14 text-lg font-bold shadow-xl shadow-[#21AC96]/20 hover:shadow-2xl hover:scale-[1.02] transition-all"
                >
                    Ir al Panel de Control
                </Button>

                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-400">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <span>Puedes seguir entrenándolo en cualquier momento</span>
                </div>
            </div>
        </div>
    );
}
