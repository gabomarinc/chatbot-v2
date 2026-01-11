'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';
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
        knowledge: null as any, // { type, source, personality, analysisSummary }
        channels: {
            web: true,
            whatsapp: false,
            messenger: false,
            instagram: false
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
            // 1. Construct Agent DTO
            const agentPayload = {
                name: data.name,
                model: 'gpt-4o-mini', // Default model
                systemPrompt: data.knowledge?.personality?.systemPrompt || 'Eres un asistente útil.',
                temperature: data.knowledge?.personality?.temperature || 0.7,
                // We'll need to handle the knowledge source creation in the backend too
                // or we accept we create the agent first then add source?
                // Ideally createAgent handles it or we call multiple actions.
                initialKnowledge: data.knowledge, // We'll need to support this in createAgent or a new action
                channels: data.channels
            };

            const response = await createAgent(agentPayload);

            setStep(5); // Success Step
            if (onAgentCreated) onAgentCreated();
        } catch (error) {
            console.error(error);
            toast.error('Error al crear el agente.');
        } finally {
            setIsLoading(false);
        }
    };

    // -- RENDER STEPS --
    const renderStep = () => {
        switch (step) {
            case 1: return <StepIdentity name={data.name} onChange={n => setData({ ...data, name: n })} />;
            case 2: return <StepIntent intent={data.intent} onChange={i => setData({ ...data, intent: i })} />;
            case 3: return <StepKnowledge intent={data.intent} knowledgeData={data.knowledge} onChange={k => setData({ ...data, knowledge: k })} />;
            case 4: return <StepChannels channels={data.channels} onChange={c => setData({ ...data, channels: c })} />;
            case 5: return <StepSuccess onClose={onClose} />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#21AC96]/10 rounded-lg flex items-center justify-center text-[#21AC96] font-bold">
                        <Wand2 className="w-4 h-4" />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900 leading-none">Asistente de Creación</h1>
                        <p className="text-xs text-gray-400 mt-1">Paso {step > totalSteps ? totalSteps : step} de {totalSteps}</p>
                    </div>
                </div>

                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            {/* Progress Bar */}
            {step <= totalSteps && (
                <div className="h-1 bg-gray-50">
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
                <div className="h-20 border-t border-gray-100 px-8 flex items-center justify-between bg-white">
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
                        disabled={isLoading}
                        className="bg-[#21AC96] hover:bg-[#21AC96]/90 text-white rounded-full px-8 h-12 shadow-lg hover:shadow-xl transition-all"
                    >
                        {isLoading ? 'Creando...' : step === totalSteps ? 'Finalizar y Crear' : 'Siguiente'}
                        {!isLoading && step < totalSteps && <ChevronRight className="w-4 h-4 ml-2" />}
                    </Button>
                </div>
            )}
        </div>
    );
}
