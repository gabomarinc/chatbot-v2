import { Briefcase, Headphones, HeartHandshake } from 'lucide-react';

interface StepIntentProps {
    intent: string;
    onChange: (intent: string) => void;
}

export function StepIntent({ intent, onChange }: StepIntentProps) {
    const options = [
        {
            id: 'SALES',
            label: 'Comercial / Ventas',
            description: 'Enfocado en captar leads, cerrar ventas y persuadir.',
            icon: Briefcase
        },
        {
            id: 'SUPPORT',
            label: 'Soporte Técnico',
            description: 'Ayuda a resolver problemas y dudas técnicas.',
            icon: Headphones
        },
        {
            id: 'SERVICE',
            label: 'Atención al Cliente',
            description: 'Información general, horarios y preguntas frecuentes.',
            icon: HeartHandshake
        }
    ];

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-bold text-gray-900">¿Cuál es el propósito principal?</h2>
                <p className="text-gray-500">Esto ayudará a definir la estrategia inicial de tu IA.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {options.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = intent === opt.id;
                    return (
                        <button
                            key={opt.id}
                            onClick={() => onChange(opt.id)}
                            className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 group hover:shadow-lg ${isSelected
                                    ? 'border-[#21AC96] bg-[#21AC96]/5 shadow-md scale-[1.02]'
                                    : 'border-gray-100 bg-white hover:border-[#21AC96]/50'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${isSelected ? 'bg-[#21AC96] text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-[#21AC96]/10 group-hover:text-[#21AC96]'
                                }`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <h3 className={`font-bold text-lg mb-2 ${isSelected ? 'text-[#21AC96]' : 'text-gray-900'}`}>
                                {opt.label}
                            </h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                {opt.description}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
