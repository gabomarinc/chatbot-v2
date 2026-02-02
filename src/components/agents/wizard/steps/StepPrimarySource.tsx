import { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { analyzeUrlAndGenerateQuestions, generateAgentPersonalities, WizardAnalysisResult, WizardPersonalityOption } from '@/lib/actions/wizard';
import { toast } from 'sonner';

interface StepPrimarySourceProps {
    intent: string;
    name: string;
    primarySource: any;
    onChange: (data: any) => void;
}

type AnalysisState = 'INPUT' | 'ANALYZING' | 'QUESTIONS' | 'GENERATING_OPTIONS' | 'SELECTION' | 'DONE';

export function StepPrimarySource({ intent, name, primarySource, onChange }: StepPrimarySourceProps) {
    const [inputVal, setInputVal] = useState('');
    const [analysisState, setAnalysisState] = useState<AnalysisState>('INPUT');
    const [analysisResult, setAnalysisResult] = useState<WizardAnalysisResult | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [personalityOptions, setPersonalityOptions] = useState<WizardPersonalityOption[]>([]);
    const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
    const [webError, setWebError] = useState<string | null>(null);

    const handleWebAnalysis = async () => {
        if (!inputVal) return toast.error('Ingresa una URL válida');

        setAnalysisState('ANALYZING');
        setScreenshotUrl(null);
        setWebError(null);

        const encodedUrl = encodeURIComponent(inputVal.startsWith('http') ? inputVal : `https://${inputVal}`);
        setScreenshotUrl(`https://api.microlink.io/?url=${encodedUrl}&screenshot=true&meta=false&embed=screenshot.url`);

        try {
            const result = await analyzeUrlAndGenerateQuestions(inputVal, intent);
            setAnalysisResult(result);
            setAnalysisState('QUESTIONS');
        } catch (error) {
            console.error(error);
            setWebError('Failed');
            setAnalysisState('INPUT');
        }
    };

    const handleGeneratePersonalities = async () => {
        if (!analysisResult) return;

        const allAnswered = analysisResult.questions.every(q => answers[q.id]?.length > 0);
        if (!allAnswered) return toast.error('Por favor responde todas las preguntas');

        setAnalysisState('GENERATING_OPTIONS');
        try {
            const qaPairs = analysisResult.questions.map(q => ({ question: q.text, answer: answers[q.id] }));
            const options = await generateAgentPersonalities(
                analysisResult.summary,
                qaPairs,
                intent,
                name,
                analysisResult.detectedCompanyName
            );
            setPersonalityOptions(options);
            setAnalysisState('SELECTION');
        } catch (error) {
            console.error(error);
            toast.error('Error generando personalidades.');
            setAnalysisState('QUESTIONS');
        }
    };

    const handleSelectPersonality = (option: WizardPersonalityOption) => {
        onChange({
            type: 'WEB',
            source: inputVal,
            personality: option,
            analysisSummary: analysisResult?.summary
        });
        setAnalysisState('DONE');
    };

    // ANALYZING STATE
    if (analysisState === 'ANALYZING') {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-8 animate-in fade-in max-w-2xl mx-auto">
                <div className="w-full bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 relative">
                    <div className="bg-gray-50 border-b border-gray-100 p-3 flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                        </div>
                        <div className="flex-1 bg-white h-6 rounded-md border border-gray-200 flex items-center px-3 mx-4">
                            <span className="text-[10px] text-gray-400 font-mono truncate">{inputVal}</span>
                        </div>
                    </div>
                    <div className="h-64 bg-gray-50 relative overflow-hidden flex flex-col items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#21AC96]/10 to-transparent animate-scan z-20 pointer-events-none"></div>

                        {screenshotUrl ? (
                            <img
                                src={screenshotUrl}
                                alt="Website Preview"
                                className="w-full h-full object-cover object-top opacity-0 animate-in fade-in duration-1000 fill-mode-forwards"
                                onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
                            />
                        ) : (
                            <div className="space-y-4 w-full opacity-30 blur-[1px] p-8">
                                <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto"></div>
                                <div className="h-32 bg-gray-200 rounded w-full"></div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="h-20 bg-gray-200 rounded"></div>
                                    <div className="h-20 bg-gray-200 rounded"></div>
                                    <div className="h-20 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        )}

                        <div className="absolute inset-x-0 bottom-6 flex justify-center z-30">
                            <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-gray-100 flex items-center gap-3">
                                <div className="w-4 h-4 border-2 border-[#21AC96] border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Analizando sitio web...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900">Analizando el ADN de tu negocio</h3>
                    <p className="text-gray-500 mt-2">Estamos leyendo tu sitio web para capturar tu esencia.</p>
                </div>
            </div>
        );
    }

    // GENERATING OPTIONS STATE
    if (analysisState === 'GENERATING_OPTIONS') {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-in fade-in">
                <div className="relative">
                    <Loader2 className="w-16 h-16 text-[#21AC96] animate-spin" />
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900">Diseñando personalidades...</h3>
                    <p className="text-gray-500">Creando las mejores estrategias de conversación para ti.</p>
                </div>
            </div>
        );
    }

    // QUESTIONS STATE
    if (analysisState === 'QUESTIONS') {
        return (
            <div className="space-y-6 animate-in slide-in-from-right">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">¡Entendido! 🧠</h2>
                    <p className="text-gray-500">Para afinar el entrenamiento, ayúdame con estas 3 preguntas clave:</p>
                </div>

                <div className="space-y-6 max-w-2xl mx-auto">
                    {analysisResult?.questions.map((q) => (
                        <div key={q.id} className="space-y-2">
                            <label className="font-semibold text-gray-800 flex items-start gap-2">
                                <span className="bg-[#21AC96]/10 text-[#21AC96] rounded px-2 text-sm mt-0.5">IA</span>
                                {q.text}
                            </label>
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {q.options?.map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                                            className={`px-4 py-2 rounded-full text-sm border transition-all ${answers[q.id] === opt
                                                ? 'bg-[#21AC96] text-white border-[#21AC96] font-medium shadow-sm'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-[#21AC96] hover:text-[#21AC96]'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                                <Textarea
                                    placeholder="O escribe tu propia respuesta..."
                                    value={!q.options?.includes(answers[q.id]) ? answers[q.id] || '' : ''}
                                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                    className="min-h-[80px]"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center mt-8">
                    <Button
                        onClick={handleGeneratePersonalities}
                        disabled={!analysisResult?.questions.every(q => answers[q.id]?.length > 0)}
                        className="bg-[#21AC96] hover:bg-[#21AC96]/90"
                    >
                        Generar Personalidades
                    </Button>
                </div>
            </div>
        );
    }

    // SELECTION STATE
    if (analysisState === 'SELECTION') {
        return (
            <div className="space-y-6 animate-in slide-in-from-right">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Elige la personalidad perfecta 🎯</h2>
                    <p className="text-gray-500">Selecciona el estilo que mejor represente a tu agente</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                    {personalityOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => handleSelectPersonality(option)}
                            className="p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-[#21AC96] hover:shadow-lg transition-all text-left group"
                        >
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#21AC96] transition-colors">
                                {option.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-2">{option.description}</p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // DONE STATE
    if (analysisState === 'DONE') {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-in fade-in">
                <div className="w-16 h-16 bg-[#21AC96]/10 rounded-full flex items-center justify-center">
                    <Globe className="w-8 h-8 text-[#21AC96]" />
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900">✅ Fuente principal configurada</h3>
                    <p className="text-gray-500">Continúa para agregar plantillas y fuentes adicionales</p>
                </div>
            </div>
        );
    }

    // INPUT STATE (Default)
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Entrena a tu Agente 📚</h2>
                <p className="text-gray-500">Ingresa la URL de tu sitio web para que la IA aprenda sobre tu negocio</p>
            </div>

            {webError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                    ⚠️ Error analizando la web. Verifica la URL e intenta de nuevo.
                </div>
            )}

            <div className="space-y-4">
                <div className="flex gap-3">
                    <div className="flex-1">
                        <Input
                            placeholder="https://tuempresa.com"
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleWebAnalysis()}
                            className="h-12"
                        />
                    </div>
                    <Button
                        onClick={handleWebAnalysis}
                        disabled={!inputVal}
                        className="bg-[#21AC96] hover:bg-[#21AC96]/90 h-12 px-8"
                    >
                        <Globe className="w-4 h-4 mr-2" />
                        Analizar Web e IA
                    </Button>
                </div>
                <p className="text-xs text-gray-400">
                    Analizaremos tu web y te haremos 3 preguntas clave para personalizar el agente
                </p>
            </div>
        </div>
    );
}
