import { useState } from 'react';
import { LayoutTemplate, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AGENT_TEMPLATES } from '@/lib/agent-templates';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StepAdditionalSourcesProps {
    additionalSources: {
        templates: string[];
        pdf: File | null;
    };
    onChange: (data: { templates: string[]; pdf: File | null }) => void;
}

export function StepAdditionalSources({ additionalSources, onChange }: StepAdditionalSourcesProps) {
    const [selectedTemplates, setSelectedTemplates] = useState<string[]>(additionalSources.templates || []);
    const [pdfFile, setPdfFile] = useState<File | null>(additionalSources.pdf || null);

    const handleTemplateToggle = (templateId: string) => {
        const newSelection = selectedTemplates.includes(templateId)
            ? selectedTemplates.filter(id => id !== templateId)
            : [...selectedTemplates, templateId];

        setSelectedTemplates(newSelection);
        onChange({ templates: newSelection, pdf: pdfFile });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                toast.error('Solo archivos PDF');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error('El archivo no debe superar 10MB');
                return;
            }
            setPdfFile(file);
            onChange({ templates: selectedTemplates, pdf: file });
            toast.success(`PDF "${file.name}" agregado`);
        }
    };

    const removePdf = () => {
        setPdfFile(null);
        onChange({ templates: selectedTemplates, pdf: null });
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Fuentes Adicionales 📑</h2>
                <p className="text-gray-500">Selecciona al menos una plantilla de entrenamiento y opcionalmente agrega un PDF</p>
            </div>

            {/* Templates Section (REQUIRED) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-[#21AC96]" />
                    <h3 className="text-lg font-bold text-gray-900">Plantillas de Entrenamiento</h3>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">OBLIGATORIO</span>
                </div>
                <p className="text-sm text-gray-500">
                    Selecciona una o más plantillas para complementar el entrenamiento de tu agente
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {AGENT_TEMPLATES.map((template) => {
                        const isSelected = selectedTemplates.includes(template.id);
                        return (
                            <button
                                key={template.id}
                                onClick={() => handleTemplateToggle(template.id)}
                                className={cn(
                                    "p-5 rounded-xl border-2 transition-all text-left relative group",
                                    isSelected
                                        ? "border-[#21AC96] bg-[#21AC96]/5 shadow-md"
                                        : "border-gray-200 bg-white hover:border-[#21AC96]/50 hover:shadow-sm"
                                )}
                            >
                                {isSelected && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-5 h-5 text-[#21AC96]" />
                                    </div>
                                )}
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                        isSelected ? "bg-[#21AC96]" : "bg-gray-100 group-hover:bg-[#21AC96]/10"
                                    )}>
                                        <LayoutTemplate className={cn(
                                            "w-5 h-5",
                                            isSelected ? "text-white" : "text-gray-600 group-hover:text-[#21AC96]"
                                        )} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={cn(
                                            "font-bold text-sm mb-1",
                                            isSelected ? "text-[#21AC96]" : "text-gray-900"
                                        )}>
                                            {template.label}
                                        </h4>
                                        <p className="text-xs text-gray-500 line-clamp-2">
                                            {template.description}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {selectedTemplates.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 flex items-center gap-2">
                        <span>⚠️</span>
                        <span>Debes seleccionar al menos una plantilla para continuar</span>
                    </div>
                )}
            </div>

            {/* PDF Section (OPTIONAL) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-bold text-gray-900">Documento PDF</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">OPCIONAL</span>
                </div>
                <p className="text-sm text-gray-500">
                    Agrega un PDF con información adicional sobre tu negocio (máx. 10MB)
                </p>

                {pdfFile ? (
                    <div className="bg-white border-2 border-[#21AC96] rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#21AC96]/10 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-[#21AC96]" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{pdfFile.name}</p>
                                <p className="text-xs text-gray-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={removePdf}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            Eliminar
                        </Button>
                    </div>
                ) : (
                    <label className="block">
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#21AC96] hover:bg-[#21AC96]/5 transition-all cursor-pointer group">
                            <Upload className="w-8 h-8 text-gray-400 group-hover:text-[#21AC96] mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-700 group-hover:text-[#21AC96]">
                                Haz clic para subir un PDF
                            </p>
                            <p className="text-xs text-gray-500 mt-1">O arrastra y suelta aquí</p>
                        </div>
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>
                )}
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h4 className="font-bold text-sm text-gray-900 mb-3">Resumen de fuentes:</h4>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#21AC96]" />
                        <span className="text-gray-700">
                            <strong>{selectedTemplates.length}</strong> plantilla{selectedTemplates.length !== 1 ? 's' : ''} seleccionada{selectedTemplates.length !== 1 ? 's' : ''}
                        </span>
                    </li>
                    {pdfFile && (
                        <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#21AC96]" />
                            <span className="text-gray-700">1 documento PDF agregado</span>
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}
