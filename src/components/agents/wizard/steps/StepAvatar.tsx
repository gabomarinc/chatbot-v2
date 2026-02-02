import { useState } from 'react';
import { Bot, Sparkles, Wand2, Upload, Loader2, RefreshCw, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generatePreviewAvatar, uploadPreviewAvatar } from '@/lib/actions/agent-avatar';

interface StepAvatarProps {
    name: string;
    intent: string;
    companyName?: string;
    avatarUrl?: string | null;
    onChange: (url: string | null) => void;
}

export function StepAvatar({ name, intent, companyName, avatarUrl, onChange }: StepAvatarProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl ?? null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            // We can try to extract company name from the previous step context if available, 
            // but for now we pass what we have. 
            // Ideally we'd pass companyName if known.
            const result = await generatePreviewAvatar({ name, intent, companyName });

            if (result.success && result.url) {
                setPreviewUrl(result.url);
                onChange(result.url);
                toast.success('Avatar generado con IA');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error('Generation error:', error);
            toast.error(error.message || 'Error generando avatar');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('El archivo no debe superar los 5MB');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const result = await uploadPreviewAvatar(formData);

            if (result.success && result.url) {
                setPreviewUrl(result.url);
                onChange(result.url);
                toast.success('Imagen subida correctamente');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error('Error subiendo imagen');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = () => {
        setPreviewUrl(null);
        onChange(null);
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-[#21AC96]/10 rounded-2xl flex items-center justify-center text-[#21AC96] mx-auto mb-4">
                    <ImageIcon className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Imagen del Agente</h2>
                <p className="text-gray-500 max-w-md mx-auto">
                    Dale una cara a tu asistente. Puedes generar una única con IA o subir tu propia marca.
                </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-8 py-4">
                {/* Avatar Display */}
                <div className="relative group">
                    <div className={cn(
                        "w-40 h-40 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300",
                        previewUrl ? "bg-white shadow-xl ring-4 ring-[#21AC96]/10" : "bg-gray-100 border-2 border-dashed border-gray-300"
                    )}>
                        {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover animate-in fade-in zoom-in-50" />
                        ) : (
                            <Bot className="w-16 h-16 text-gray-300" />
                        )}
                    </div>

                    {previewUrl && (
                        <button
                            onClick={handleRemove}
                            className="absolute -top-1 -right-1 bg-white rounded-full p-1.5 shadow-md border border-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-4 w-full max-w-md">
                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || isUploading}
                        className="flex-1 py-4 px-6 bg-[#21AC96]/5 hover:bg-[#21AC96]/10 border-2 border-[#21AC96]/10 hover:border-[#21AC96]/30 rounded-2xl flex flex-col items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-6 h-6 text-[#21AC96] animate-spin" />
                        ) : (
                            <Wand2 className="w-6 h-6 text-[#21AC96] group-hover:scale-110 transition-transform" />
                        )}
                        <span className="font-bold text-[#21AC96] text-sm">Generar con IA</span>
                        <span className="textxs text-[#21AC96]/60 font-medium text-[10px] uppercase tracking-wide">50 Créditos</span>
                    </button>

                    {/* Upload Button */}
                    <label className="flex-1 py-4 px-6 bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-2xl flex flex-col items-center gap-2 transition-all cursor-pointer group">
                        {isUploading ? (
                            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                        ) : (
                            <Upload className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        )}
                        <span className="font-bold text-gray-600 text-sm">Subir Imagen</span>
                        <span className="text-xs text-gray-400 font-medium text-[10px] uppercase tracking-wide">Max 5MB</span>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={isGenerating || isUploading}
                        />
                    </label>
                </div>
            </div>
        </div>
    );
}
