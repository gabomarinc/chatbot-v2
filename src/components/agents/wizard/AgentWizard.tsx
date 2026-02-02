import { useState } from 'react';
import { X, Loader2, Wand2, ChevronLeft, ChevronRight } from 'lucide-react';
import { StepIdentity } from './steps/StepIdentity';
import { StepIntent } from './steps/StepIntent';
import { StepPrimarySource } from './steps/StepPrimarySource';
import { StepAdditionalSources } from './steps/StepAdditionalSources';
import { StepChannels } from './steps/StepChannels';
import { StepSuccess } from './steps/StepSuccess';
import { StepAvatar } from './steps/StepAvatar';
import { Button } from '@/components/ui/button';
import { createAgentFromWizard, updateAgentWizard, WizardPersonalityOption } from '@/lib/actions/wizard';
import { toast } from 'sonner';

interface AgentWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onAgentCreated?: () => void;
}

export function AgentWizard({ isOpen, onClose, onAgentCreated }: AgentWizardProps) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
    const [webChannelId, setWebChannelId] = useState<string | null>(null);

    // Wizard Data State
    const [data, setData] = useState({
        name: '',
        intent: '',
        allowEmojis: true,
        primarySource: null as any,
        additionalSources: {
            templates: [] as string[],
            pdf: null as File | null
        },
        avatarUrl: null as string | null,
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
        },
        // New WhatsApp Config
        whatsappConfig: {
            phoneNumberId: '',
            accessToken: '',
            verifyToken: ''
        }
    });

    if (!isOpen) return null;

    const totalSteps = 6; // 7 is success, so 6 input steps

    const handleNext = async () => {
        if (step === 1 && !data.name) return toast.error('Escribe un nombre');
        if (step === 2 && !data.intent) return toast.error('Selecciona el propósito');
        if (step === 3 && !data.primarySource) return toast.error('Analiza tu sitio web');
        if (step === 4 && data.additionalSources.templates.length === 0) return toast.error('Selecciona al menos una plantilla');
        // Step 5 (Avatar) is optional, no validation needed

        if (step === 3) {
            // STEP 3 -> 4: After Primary Source, move to Additional Sources
            setStep(s => s + 1);
        } else if (step === 4) {
            // STEP 4 -> 5: After Additional Sources, move to Avatar
            setStep(s => s + 1);
        } else if (step === 5) {
            // STEP 5 -> 6: CREATE AGENT (after Avatar)
            await handleCreateAgent();
        } else if (step < totalSteps) {
            setStep(s => s + 1);
        } else {
            // FINISH (Step 6 -> 7)
            await handleFinish();
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(s => s - 1);
    };

    const handleCreateAgent = async () => {
        setIsLoading(true);
        try {
            const wizardPayload = {
                name: data.name,
                intent: data.intent,
                avatarUrl: data.avatarUrl,
                primarySource: data.primarySource,
                additionalSources: data.additionalSources,
                channels: {
                    web: true,
                    whatsapp: false,
                    instagram: false,
                    messenger: false
                },
                allowEmojis: data.allowEmojis,
                webConfig: data.webConfig,
                whatsappConfig: data.whatsappConfig
            };

            const result = await createAgentFromWizard(wizardPayload);

            if (result.success && result.agentId) {
                setCreatedAgentId(result.agentId);
                setWebChannelId(result.webChannelId || null);
                toast.success('¡Agente creado!');
                setStep(s => s + 1); // Move to Channels step
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
        } catch (error: any) {
            console.error('Error creating agent:', error);
            toast.error(error.message || 'Error al crear el agente');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinish = async () => {
        setIsLoading(true);
        try {
            if (!createdAgentId) throw new Error("No hay ID de agente");

            // Update with final channel config
            await updateAgentWizard(createdAgentId, {
                channels: data.channels,
                webConfig: data.webConfig
            });

            // Success
            toast.success('¡Agente configurado exitosamente!');
            setStep(7); // Success Step (step 7, not 6)
            if (onAgentCreated) onAgentCreated();
        } catch (error: any) {
            console.error('Wizard finish error:', error);
            toast.error(`Error al finalizar configuración: ${error.message} `);
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
            case 3: return <StepPrimarySource intent={data.intent} name={data.name} primarySource={data.primarySource} onChange={ps => setData({ ...data, primarySource: ps })} />;
            case 4: return <StepAdditionalSources additionalSources={data.additionalSources} onChange={as => setData({ ...data, additionalSources: as })} />;
            case 5: {
                // Extract company name from primarySource if available
                let companyName: string | undefined;
                if (data.primarySource?.type === 'WEB' && typeof data.primarySource.source === 'string') {
                    try {
                        const url = data.primarySource.source.startsWith('http') ? data.primarySource.source : `https://${data.primarySource.source}`;
                        const hostname = new URL(url).hostname.replace('www.', '');
                        companyName = hostname.split('.')[0];
                        companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
                    } catch (e) { }
                }

                return <StepAvatar
                    name={data.name}
                    intent={data.intent}
                    companyName={companyName}
                    avatarUrl={data.avatarUrl}
                    onChange={url => setData({ ...data, avatarUrl: url })}
                />;
            }
            case 6: return <StepChannels
                channels={data.channels}
                webConfig={data.webConfig}
                whatsappConfig={data.whatsappConfig}
                agentId={createdAgentId}
                webChannelId={webChannelId}
                onChange={c => setData({ ...data, channels: c })}
                onWebConfigChange={c => setData({ ...data, webConfig: c })}
                onWhatsappConfigChange={c => setData({ ...data, whatsappConfig: c })}
            />;
            case 7: return <StepSuccess onClose={onClose} />;
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

                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-6 py-12">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full py-20 animate-in fade-in space-y-6">
                                <div className="relative">
                                    <div className="w-20 h-20 border-4 border-[#21AC96]/30 border-t-[#21AC96] rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Wand2 className="w-8 h-8 text-[#21AC96] animate-pulse" />
                                    </div>
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-bold text-gray-900">Creando tu Agente...</h3>
                                    <p className="text-gray-500 max-w-sm mx-auto">
                                        Estamos configurando el cerebro, conectando los canales y preparando todo para ti.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            renderStep()
                        )}
                    </div>
                </div>

                {/* Footer Navigation (only for steps 1-6) */}
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

                        <div className="flex items-center gap-3">
                            {/* Show "Skip" option for Avatar step */}
                            {step === 5 && !data.avatarUrl && (
                                <Button
                                    variant="ghost"
                                    onClick={handleNext}
                                    disabled={isLoading}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    Hacerlo más tarde
                                </Button>
                            )}

                            <Button
                                onClick={handleNext}
                                disabled={isLoading || (step === 1 && !data.name) || (step === 2 && !data.intent) || (step === 3 && !data.primarySource) || (step === 4 && data.additionalSources.templates.length === 0)}
                                className={`rounded-full px-8 h-12 shadow-lg transition-all ${(step === 1 && !data.name) || (step === 2 && !data.intent) || (step === 3 && !data.primarySource) || (step === 4 && data.additionalSources.templates.length === 0)
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                    : 'bg-[#21AC96] hover:bg-[#21AC96]/90 hover:shadow-xl text-white'
                                    }`}
                            >
                                {isLoading ? 'Creando...' : step === totalSteps ? 'Finalizar y Crear' : step === 5 && data.avatarUrl ? 'Continuar' : 'Siguiente'}
                                {!isLoading && step < totalSteps && <ChevronRight className="w-4 h-4 ml-2" />}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
