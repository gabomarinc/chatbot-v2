'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Wand2, Loader2 } from 'lucide-react';
import { StepIdentity } from './steps/StepIdentity';
import { StepIntent } from './steps/StepIntent';
import { StepKnowledge } from './steps/StepKnowledge';
import { StepChannels } from './steps/StepChannels';
import { StepSuccess } from './steps/StepSuccess';
import { Button } from '@/components/ui/button';
import { createAgentFromWizard, WizardPersonalityOption } from '@/lib/actions/wizard';
import { toast } from 'sonner';

interface AgentWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onAgentCreated?: () => void;
}

export function AgentWizard({ isOpen, onClose, onAgentCreated }: AgentWizardProps) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Wizard Data State
    const [data, setData] = useState({
        name: '',
        intent: '',
        allowEmojis: true,
        knowledge: null as any,
        channels: {
            web: true,
            whatsapp: false,
            messenger: false,
            instagram: false
        },
        // New Web Config
        webConfig: {
            title: '',
            welcomeMessage: '',
            primaryColor: '#21AC96'
        }
    });

    if (!isOpen) return null;

    const totalSteps = 4; // 5 is success, so 4 input steps

    const handleNext = async () => {
        if (step === 1 && !data.name) return toast.error('Escribe un nombre');
        if (step === 2 && !data.intent) return toast.error('Selecciona el propósito');
        if (step === 3 && !data.knowledge) return toast.error('Configura el conocimiento');

        if (step < totalSteps) {
            setStep(s => s + 1);
        } else {
            // FINISH
            await handleFinish();
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(s => s - 1);
    };

    const handleFinish = async () => {
        setIsLoading(true);
        try {
            // 1. Construct Agent Wizard Payload
            const wizardPayload = {
                name: data.name,
                intent: data.intent,
                knowledge: data.knowledge,
                channels: data.channels,
                allowEmojis: data.allowEmojis,
                webConfig: data.webConfig // Pass new config
            };
            const result = await createAgentFromWizard(wizardPayload);

            if (result && (result as any).success === false) {
                throw new Error((result as any).error || 'Error desconocido al crear el agente');
            }

            // Success
            toast.success('¡Agente creado exitosamente!');
            setStep(5); // Success Step
            if (onAgentCreated) onAgentCreated();
        } catch (error: any) {
            console.error('Wizard error:', error);
            toast.error(`Error al crear el agente: ${error.message || 'Inténtalo de nuevo.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    // -- RENDER STEPS --
    const renderStep = () => {
        switch (step) {
            case 1: return <StepIdentity
                name={data.name}
                allowEmojis={data.allowEmojis}
                onNameChange={n => setData({ ...data, name: n })}
                onEmojisChange={e => setData({ ...data, allowEmojis: e })}
            />;
            case 2: return <StepIntent intent={data.intent} onChange={i => setData({ ...data, intent: i })} />;
            case 3: return <StepKnowledge intent={data.intent} name={data.name} knowledgeData={data.knowledge} onChange={k => setData({ ...data, knowledge: k })} />;
            case 4: return <StepChannels
                channels={data.channels}
                webConfig={data.webConfig}
                onChange={c => setData({ ...data, channels: c })}
                onWebConfigChange={c => setData({ ...data, webConfig: c })}
            />;
            case 5: return <StepSuccess onClose={onClose} />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Header with clean design */}
                <div className="h-24 flex items-center justify-between px-10 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-[#21AC96]/10 rounded-2xl flex items-center justify-center text-[#21AC96]">
                            <Wand2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="font-extrabold text-2xl text-gray-900 tracking-tight">Asistente de Creación</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-medium text-gray-500">
                                    Paso {step > totalSteps ? totalSteps : step} de {totalSteps}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-full transition-all duration-200"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Progress Bar */}
                {step <= totalSteps && (
                    <div className="h-1 bg-gray-50 flex-none">
                        <div
                            className="h-full bg-[#21AC96] transition-all duration-500 ease-out"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-6 py-12">
                        {renderStep()}
                    </div>
                </div>

                {/* Footer Navigation (only for 1-4) */}
                {step <= totalSteps && (
                    <div className="h-20 border-t border-gray-100 px-8 flex items-center justify-between bg-white flex-none">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            disabled={step === 1 || isLoading}
                            className="text-gray-500 hover:text-gray-900"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" /> Atrás
                        </Button>

                        <Button
                            onClick={handleNext}
                            disabled={isLoading || (step === 1 && !data.name) || (step === 2 && !data.intent) || (step === 3 && !data.knowledge)}
                            className={`rounded-full px-8 h-12 shadow-lg transition-all ${(step === 1 && !data.name) || (step === 2 && !data.intent) || (step === 3 && !data.knowledge)
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' // Disabled style
                                : 'bg-[#21AC96] hover:bg-[#21AC96]/90 hover:shadow-xl text-white'
                                }`}
                        >
                            {isLoading ? 'Creando...' : step === totalSteps ? 'Finalizar y Crear' : 'Siguiente'}
                            {!isLoading && step < totalSteps && <ChevronRight className="w-4 h-4 ml-2" />}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
