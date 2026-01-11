import { useState } from 'react';
import { Globe, FileText, Upload, BrainCircuit, CheckCircle2, Bot, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { analyzeUrlAndGenerateQuestions, generateAgentPersonalities, WizardAnalysisResult, WizardPersonalityOption } from '@/lib/actions/wizard';
import { toast } from 'sonner';

interface StepKnowledgeProps {
    intent: string;
    name: string;
    knowledgeData: any;
    onChange: (data: any) => void;
}

type AnalysisState = 'INPUT' | 'ANALYZING' | 'QUESTIONS' | 'GENERATING_OPTIONS' | 'SELECTION' | 'DONE';

export function StepKnowledge({ intent, name, knowledgeData, onChange }: StepKnowledgeProps) {
    const [sourceType, setSourceType] = useState<'WEB' | 'PDF' | 'TEXT'>('WEB');
    const [inputVal, setInputVal] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // AI Flow State
    const [analysisState, setAnalysisState] = useState<AnalysisState>('INPUT');
    const [analysisResult, setAnalysisResult] = useState<WizardAnalysisResult | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [personalityOptions, setPersonalityOptions] = useState<WizardPersonalityOption[]>([]);

    const handleWebAnalysis = async () => {
        if (!inputVal) return toast.error('Ingresa una URL válida');

        setAnalysisState('ANALYZING');
        try {
            const result = await analyzeUrlAndGenerateQuestions(inputVal, intent);
            setAnalysisResult(result);
            setAnalysisState('QUESTIONS');
        } catch (error) {
            console.error(error);
            toast.error('Error analizando la web. Intenta de nuevo.');
            setAnalysisState('INPUT');
        }
    };

    const handleGeneratePersonalities = async () => {
        if (!analysisResult) return;

        // Check if all questions answered
        const allAnswered = analysisResult.questions.every(q => answers[q.id]?.length > 0);
        if (!allAnswered) return toast.error('Por favor responde todas las preguntas');

        setAnalysisState('GENERATING_OPTIONS');
        try {
            const qaPairs = analysisResult.questions.map(q => ({ question: q.text, answer: answers[q.id] }));
            // Pass agent name
            const options = await generateAgentPersonalities(analysisResult.summary, qaPairs, intent, name);
            setPersonalityOptions(options);
            setAnalysisState('SELECTION');
        } catch (error) {
            console.error(error);
            toast.error('Error generando personalidades.');
            setAnalysisState('QUESTIONS');
        }
    };

    const handleSelectPersonality = (option: WizardPersonalityOption) => {
        // Save everything to parent
        onChange({
            type: 'WEB', // This gets mapped to WEBSITE in createAgentFromWizard but keeping internal state consistent
            source: inputVal,
            personality: option,
            analysisSummary: analysisResult?.summary
        });
        setAnalysisState('DONE');
    };

    const handleSimpleSource = () => {
        // For PDF/Text just save and move on (simplified flow for now)
        if (sourceType === 'TEXT' && !inputVal) return toast.error('Ingresa el texto');
        if (sourceType === 'PDF' && !file) return toast.error('Sube un archivo');

        // Note: Real file upload would need formatted for the backend acton
        // For now lets mock passing the data up
        onChange({
            type: sourceType,
            source: sourceType === 'TEXT' ? inputVal : file, // If file, parent needs to handle upload or base64
            personality: null // Fallback default
        });
        setAnalysisState('DONE');
    };

    // Allow file selection
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                toast.error('Solo archivos PDF');
                return;
            }
            setFile(file);
            // Convert to base64 immediately for simplicity in this wizard prototype
            // In prod, use FormData or separate upload endpoint
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                onChange({
                    type: 'PDF',
                    source: content, // base64
                    fileName: file.name
                });
                setAnalysisState('DONE');
            };
            reader.readAsDataURL(file);
        }
    };


    // -- RENDERERS --

    if (analysisState === 'ANALYZING') {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-8 animate-in fade-in max-w-2xl mx-auto">
                {/* Simulated Web Scanner UI */}
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
                    <div className="h-64 bg-gray-50 relative overflow-hidden flex flex-col items-center justify-center p-8">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#21AC96]/5 to-transparent animate-scan z-10"></div>

                        {/* Content Mockup */}
                        <div className="space-y-4 w-full opacity-30 blur-[1px]">
                            <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto"></div>
                            <div className="h-32 bg-gray-200 rounded w-full"></div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="h-20 bg-gray-200 rounded"></div>
                                <div className="h-20 bg-gray-200 rounded"></div>
                                <div className="h-20 bg-gray-200 rounded"></div>
                            </div>
                        </div>

                        {/* Loader Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] z-20">
                            <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-[#21AC96] border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm font-semibold text-gray-700">Extrayendo información...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900">Analizando el ADN de tu negocio</h3>
                    <p className="text-gray-500 mt-2">Nuestra IA está leyendo tu sitio web para entender <br />cómo hablas con tus clientes.</p>
                </div>
            </div>
        );
    }

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
                            <Textarea
                                placeholder="Escribe tu respuesta aquí..."
                                value={answers[q.id] || ''}
                                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                className="min-h-[80px]"
                            />
                        </div>
                    ))}
                    <Button onClick={handleGeneratePersonalities} className="w-full bg-[#21AC96] hover:bg-[#21AC96]/90 text-white rounded-xl py-6 text-lg">
                        Generar Estrategia
                    </Button>
                </div>
            </div>
        );
    }

    if (analysisState === 'SELECTION') {
        return (
            <div className="space-y-8 animate-in slide-in-from-right">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Elige la personalidad de tu IA 🎭</h2>
                    <p className="text-gray-500">He diseñado estas dos opciones basándome en tus respuestas.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {personalityOptions.map((opt) => (
                        <div key={opt.id} className="border-2 border-gray-100 rounded-3xl p-8 hover:border-[#21AC96] hover:shadow-xl hover:shadow-[#21AC96]/5 transition-all flex flex-col gap-5 bg-white group cursor-pointer" onClick={() => handleSelectPersonality(opt)}>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight group-hover:text-[#21AC96] transition-colors">{opt.name}</h3>
                                    <div className="flex gap-2">
                                        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full uppercase tracking-wide">{opt.communicationStyle}</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-gray-600 text-base leading-relaxed flex-grow">
                                {opt.description}
                            </p>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">Tone of Voice Preview</p>
                                <p className="text-sm text-gray-600 italic leading-relaxed">
                                    "{opt.systemPrompt.slice(0, 180)}..."
                                </p>
                            </div>

                            <Button onClick={(e) => { e.stopPropagation(); handleSelectPersonality(opt); }} className="w-full mt-2 bg-gray-900 text-white group-hover:bg-[#21AC96] transition-colors py-6 text-base rounded-xl">
                                Seleccionar esta opción
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (analysisState === 'DONE') {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in">
                <CheckCircle2 className="w-24 h-24 text-[#21AC96] mb-6" />
                <h2 className="text-3xl font-bold text-gray-900">¡Conocimiento Configurado!</h2>
                <Button variant="ghost" className="mt-4 text-gray-500" onClick={() => setAnalysisState('INPUT')}>
                    Cambiar configuración
                </Button>
            </div>
        )
    }

    // DEFAULT STATE: INPUT
    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Entrena a tu Agente 📚</h2>
                <p className="text-gray-500">¿De dónde debería sacar la información?</p>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-4 mb-8">
                <button onClick={() => setSourceType('WEB')} className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all ${sourceType === 'WEB' ? 'bg-[#21AC96] text-white shadow-lg shadow-[#21AC96]/20' : 'bg-white border hover:bg-gray-50'}`}>
                    <Globe className="w-4 h-4" /> Sitio Web (Recomendado)
                </button>
                <button onClick={() => setSourceType('PDF')} className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all ${sourceType === 'PDF' ? 'bg-[#21AC96] text-white shadow-lg' : 'bg-white border hover:bg-gray-50'}`}>
                    <FileText className="w-4 h-4" /> PDF
                </button>
                <button onClick={() => setSourceType('TEXT')} className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all ${sourceType === 'TEXT' ? 'bg-[#21AC96] text-white shadow-lg' : 'bg-white border hover:bg-gray-50'}`}>
                    <Bot className="w-4 h-4" /> Texto Manual
                </button>
            </div>

            <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                {sourceType === 'WEB' && (
                    <div className="space-y-4">
                        <label className="font-semibold text-gray-700">URL del Sitio Web</label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://miempres.com"
                                value={inputVal}
                                onChange={(e) => setInputVal(e.target.value)}
                                className="flex-1"
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            Analizaremos tu web para extraer información y sugerirte la mejor configuración.
                        </p>
                        <Button onClick={handleWebAnalysis} className="w-full bg-[#21AC96] hover:bg-[#21AC96]/90 text-white mt-4">
                            Analizar Web e IA
                        </Button>
                    </div>
                )}

                {sourceType === 'PDF' && (
                    <div className="space-y-4 text-center border-2 border-dashed border-gray-200 rounded-xl p-8 hover:bg-gray-50 transition-colors cursor-pointer relative">
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="w-10 h-10 text-gray-400 mx-auto" />
                        <div>
                            <p className="font-semibold text-gray-700">Haz clic para subir tu PDF</p>
                            <p className="text-xs text-gray-500 mt-1">Entrenaremos al agente con el contenido.</p>
                        </div>
                    </div>
                )}

                {sourceType === 'TEXT' && (
                    <div className="space-y-4">
                        <label className="font-semibold text-gray-700">Pega el texto de entrenamiento</label>
                        <Textarea
                            placeholder="Información sobre tu empresa, productos, precios..."
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            className="min-h-[200px]"
                        />
                        <Button onClick={handleSimpleSource} className="w-full bg-[#21AC96] hover:bg-[#21AC96]/90 text-white mt-4">
                            Guardar Texto
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
