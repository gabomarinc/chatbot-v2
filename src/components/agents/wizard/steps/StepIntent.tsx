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
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-3 mb-10">
                <h2 className="text-3xl font-extrabold text-gray-900">¿Cuál será su misión principal? 🎯</h2>
                <p className="text-lg text-gray-510">Define el rol de tu agente para que podamos entrenarlo correctamente.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {options.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = intent === opt.id;
                    return (
                        <button
                            key={opt.id}
                            onClick={() => onChange(opt.id)}
                            className={`group relative p-8 rounded-3xl border-2 text-left transition-all duration-300 hover:-translate-y-1 ${isSelected
                                ? 'border-[#21AC96] bg-[#21AC96]/5 shadow-[0_10px_40px_-10px_rgba(33,172,150,0.3)]'
                                : 'border-transparent bg-gray-50 hover:bg-white hover:border-gray-100 hover:shadow-xl'
                                }`}
                        >
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${isSelected
                                ? 'bg-gradient-to-br from-[#21AC96] to-[#1a8a78] text-white shadow-lg shadow-[#21AC96]/30 scale-110'
                                : 'bg-white text-gray-400 group-hover:text-[#21AC96] group-hover:bg-[#21AC96]/10 shadow-sm'
                                }`}>
                                <Icon className="w-8 h-8" />
                            </div>

                            <h3 className={`font-bold text-xl mb-3 ${isSelected ? 'text-[#21AC96]' : 'text-gray-900'}`}>
                                {opt.label}
                            </h3>
                            <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-600">
                                {opt.description}
                            </p>

                            {/* Checkmark indicator */}
                            <div className={`absolute top-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-[#21AC96] bg-[#21AC96] scale-100' : 'border-gray-200 scale-0 group-hover:scale-100'
                                }`}>
                                <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
