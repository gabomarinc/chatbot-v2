import { useState, useRef } from 'react';
import { Globe, Loader2, Upload, FileText, X, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { analyzeUrlAndGenerateQuestions, analyzeDescriptionAndGenerateQuestions, generateAgentPersonalities, WizardAnalysisResult, WizardPersonalityOption } from '@/lib/actions/wizard';
import { getDocsUploadUrl } from '@/lib/actions/upload';
import { toast } from 'sonner';

interface StepPrimarySourceProps {
    intent: string;
    name: string;
    primarySource: any;
    onChange: (data: any) => void;
}

type AnalysisState = 'INPUT' | 'ANALYZING' | 'QUESTIONS' | 'GENERATING_OPTIONS' | 'SELECTION' | 'DONE';

export function StepPrimarySource({ intent, name, primarySource, onChange }: StepPrimarySourceProps) {
    const [analysisState, setAnalysisState] = useState<AnalysisState>('INPUT');
    const [analysisResult, setAnalysisResult] = useState<WizardAnalysisResult | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [personalityOptions, setPersonalityOptions] = useState<WizardPersonalityOption[]>([]);
    const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
    const [webError, setWebError] = useState<string | null>(null);

    // State for Input Type
    const [inputType, setInputType] = useState<'WEB' | 'MANUAL'>('WEB');
    const [inputVal, setInputVal] = useState(''); // Web URL
    const [manualCompany, setManualCompany] = useState('');
    const [manualDescription, setManualDescription] = useState('');
    const [manualPdfUrl, setManualPdfUrl] = useState<string | null>(null);
    const [manualPdfName, setManualPdfName] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast.error('Solo se permiten archivos PDF');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit (R2 can handle it, client upload)
            toast.error('El archivo no debe superar los 10MB');
            return;
        }

        setIsUploading(true);
        try {
            // 1. Get Presigned URL
            const presigned = await getDocsUploadUrl(file.name, file.type);
            if (!presigned.success) {
                throw new Error(presigned.error || 'Failed to get upload URL');
            }

            const { signedUrl, publicUrl } = presigned as { signedUrl: string, publicUrl: string };

            // 2. Upload to R2 directly
            const uploadRes = await fetch(signedUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type
                }
            });

            if (!uploadRes.ok) {
                throw new Error('Upload failed');
            }

            // 3. Save Public URL
            setManualPdfUrl(publicUrl || null);
            setManualPdfName(file.name);
            toast.success('PDF subido correctamente');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Error al subir el PDF');
        } finally {
            setIsUploading(false);
        }
    };

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

    const handleManualAnalysis = async () => {
        if (!manualCompany || !manualDescription) return toast.error('Completa los campos obligatorios');

        setAnalysisState('ANALYZING');
        try {
            const result = await analyzeDescriptionAndGenerateQuestions(manualDescription, intent, manualCompany);
            setAnalysisResult(result);
            setAnalysisState('QUESTIONS');
        } catch (error) {
            console.error(error);
            toast.error('Error analizando la descripción');
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
        if (inputType === 'WEB') {
            onChange({
                type: 'WEB',
                source: inputVal,
                personality: option,
                analysisSummary: analysisResult?.summary
            });
        } else {
            onChange({
                type: 'MANUAL',
                companyName: manualCompany,
                description: manualDescription,
                pdfUrl: manualPdfUrl,
                pdfName: manualPdfName,
                personality: option,
                analysisSummary: analysisResult?.summary
            });
        }
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
                            <span className="text-[10px] text-gray-400 font-mono truncate">
                                {inputType === 'WEB' ? inputVal : 'Análisis Manual...'}
                            </span>
                        </div>
                    </div>
                    <div className="h-64 bg-gray-50 relative overflow-hidden flex flex-col items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#21AC96]/10 to-transparent animate-scan z-20 pointer-events-none"></div>

                        {inputType === 'WEB' && screenshotUrl ? (
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
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Analizando información...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900">Analizando el ADN de tu negocio</h3>
                    <p className="text-gray-500 mt-2">Estamos procesando tu información para capturar tu esencia.</p>
                </div>
            </div>
        );
    }

    // GENERATING OPTIONS STATE (Same as before)
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

    // QUESTIONS STATE (Same as before)
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

    // SELECTION STATE (Same as before)
    if (analysisState === 'SELECTION') {
        return (
            <div className="space-y-6 animate-in slide-in-from-right">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Elige la personalidad perfecta 🎯</h2>
                    <p className="text-gray-500">Selecciona el estilo que mejor represente a tu agente</p>
                </div>

                <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
                    {personalityOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => handleSelectPersonality(option)}
                            className="flex-1 min-w-[280px] max-w-[360px] p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-[#21AC96] hover:shadow-lg transition-all text-left group"
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

    // DONE STATE (Same as before)
    if (analysisState === 'DONE') {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="relative">
                    <div className="absolute inset-0 bg-[#21AC96]/20 rounded-full blur-2xl animate-pulse"></div>
                    <div className="relative w-24 h-24 bg-gradient-to-br from-[#21AC96] to-[#1a8c78] rounded-full flex items-center justify-center shadow-2xl animate-in zoom-in duration-700">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>

                <div className="text-center space-y-3 max-w-md">
                    <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                        🎉 Fuente de Entrenamiento Principal Configurada
                    </h3>
                    <p className="text-gray-600 text-lg">
                        Tu agente ya conoce tu negocio. Ahora agreguemos plantillas para perfeccionar su comportamiento.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-[#21AC96]/10 px-6 py-3 rounded-full">
                    <div className="w-2 h-2 bg-[#21AC96] rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-[#21AC96]">Paso 1 de 2 completado</span>
                </div>
            </div>
        );
    }

    // INPUT STATE (Default)
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Entrena a tu Agente 📚</h2>
                <p className="text-gray-500">
                    {inputType === 'WEB'
                        ? 'Ingresa el sitio web de tu negocio para que el agente aprenda sobre ti.'
                        : 'Cuéntanos sobre tu negocio para entrenar al agente.'}
                </p>
            </div>

            <div className="flex justify-center mb-6">
                <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                    <button
                        onClick={() => setInputType('WEB')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${inputType === 'WEB' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Tengo Sitio Web
                    </button>
                    <button
                        onClick={() => setInputType('MANUAL')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${inputType === 'MANUAL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        No tengo Sitio Web
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2">
                {inputType === 'WEB' ? (
                    <div className="space-y-4">
                        {webError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                                ⚠️ Error analizando la web. Verifica la URL e intenta de nuevo.
                            </div>
                        )}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Input
                                    placeholder="https://tuempresa.com"
                                    value={inputVal}
                                    onChange={(e) => setInputVal(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleWebAnalysis()}
                                    className="h-12"
                                    autoFocus
                                />
                            </div>
                            <Button
                                onClick={handleWebAnalysis}
                                disabled={!inputVal}
                                className="bg-[#21AC96] hover:bg-[#21AC96]/90 h-12 px-8"
                            >
                                <Globe className="w-4 h-4 mr-2" />
                                Analizar Web
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Nombre de la Empresa</label>
                                <Input
                                    placeholder="Ej. Mi Tienda Online"
                                    value={manualCompany}
                                    onChange={(e) => setManualCompany(e.target.value)}
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Descripción del Negocio</label>
                                <Textarea
                                    placeholder="Describe qué vendes, quiénes son tus clientes, y qué objetivos tienes..."
                                    value={manualDescription}
                                    onChange={(e) => setManualDescription(e.target.value)}
                                    className="min-h-[120px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Material Adicional (PDF, Opcional)</label>
                                <div
                                    className={`border-2 border-dashed rounded-xl p-4 transition-colors ${manualPdfUrl ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-[#21AC96]/50'
                                        }`}
                                >
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handlePdfUpload}
                                        className="hidden"
                                        ref={fileInputRef}
                                    />

                                    {!manualPdfUrl ? (
                                        <div
                                            onClick={() => !isUploading && fileInputRef.current?.click()}
                                            className="flex flex-col items-center justify-center cursor-pointer py-4"
                                        >
                                            {isUploading ? (
                                                <Loader2 className="w-8 h-8 text-[#21AC96] animate-spin mb-2" />
                                            ) : (
                                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                            )}
                                            <p className="text-sm font-medium text-gray-600">
                                                {isUploading ? 'Subiendo...' : 'Sube un PDF con información'}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">Máx 10MB</p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                                        {manualPdfName}
                                                    </p>
                                                    <p className="text-xs text-green-600">Listo para procesar</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setManualPdfUrl(null);
                                                    setManualPdfName(null);
                                                }}
                                                className="text-gray-400 hover:text-red-500"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full bg-[#21AC96] hover:bg-[#21AC96]/90 h-12"
                            disabled={!manualCompany || !manualDescription || isUploading}
                            onClick={handleManualAnalysis}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Subiendo archivo...
                                </>
                            ) : (
                                <>
                                    <Building2 className="w-4 h-4 mr-2" />
                                    Analizar Negocio
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
