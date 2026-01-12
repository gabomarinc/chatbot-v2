import { BadgeCheck, Sparkles, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

interface StepSuccessProps {
    onClose: () => void;
    agentId?: string | null;
    isWebEnabled?: boolean;
}

export function StepSuccess({ onClose, agentId, isWebEnabled }: StepSuccessProps) {
    const [copied, setCopied] = useState(false);

    const snippet = `<script>
  window.chatConfig = {
    agentId: "${agentId || 'AGENT_ID'}"
  };
</script>
<script 
  src="${typeof window !== 'undefined' ? window.location.origin : 'https://app.tudominio.com'}/widget.js" 
  async
></script>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(snippet);
        setCopied(true);
        toast.success('¡Código copiado!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-8 animate-in zoom-in-50 duration-700 py-6 flex flex-col items-center justify-center relative h-full">
            {/* Background decoration - reduced opacity */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-teal-100/30 to-lime-100/30 rounded-full blur-3xl -z-10 animate-pulse" />

            <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-[#21AC96] to-[#4ADE80] rounded-3xl rotate-3 flex items-center justify-center shadow-2xl shadow-[#21AC96]/40 animate-bounce">
                    <BadgeCheck className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-spin-slow">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
            </div>

            <div className="space-y-4 text-center max-w-lg">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                    ¡Tu Agente está vivo! 🚀
                </h2>
                <p className="text-gray-500 leading-relaxed">
                    Hemos configurado todo con éxito. Tu asistente virtual está listo para aprender y ayudar.
                </p>
            </div>

            {isWebEnabled && agentId && (
                <div className="w-full max-w-2xl bg-gray-900 rounded-2xl p-6 shadow-2xl overflow-hidden relative group text-left">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">
                            Instalación Web (Script)
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCopy}
                            className="bg-white/10 hover:bg-white/20 text-white hover:text-white"
                        >
                            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                            {copied ? 'Copiado' : 'Copiar'}
                        </Button>
                    </div>
                    <pre className="font-mono text-xs text-green-300 bg-black/50 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                        {snippet}
                    </pre>
                    <p className="text-gray-500 text-xs mt-3 text-center">
                        Pega este código en el <code className="text-gray-400 bg-gray-800 px-1 py-0.5 rounded">&lt;head&gt;</code> de tu sitio web para activar el widget.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
                <Button
                    onClick={onClose}
                    size="lg"
                    className="w-full bg-[#21AC96] hover:bg-[#21AC96]/90 text-white rounded-2xl h-12 text-base font-bold shadow-xl shadow-[#21AC96]/20 hover:shadow-2xl hover:scale-[1.02] transition-all"
                >
                    Ir al Panel de Control
                </Button>
            </div>
        </div>
    );
}
