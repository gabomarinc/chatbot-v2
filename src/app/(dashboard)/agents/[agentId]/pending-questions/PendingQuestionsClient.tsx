'use client'

import { useState } from 'react'
import { Check, X, MessageSquare, Send } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type PendingQuestion = {
    id: string;
    question: string;
    createdAt: Date;
    conversationId?: string | null;
}

export default function PendingQuestionsClient({
    agentId,
    initialQuestions
}: {
    agentId: string,
    initialQuestions: any[]
}) {
    const [questions, setQuestions] = useState<PendingQuestion[]>(initialQuestions)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null)

    const handleAnswerChange = (id: string, value: string) => {
        setAnswers(prev => ({ ...prev, [id]: value }))
    }

    const handleSubmitAnswer = async (id: string) => {
        const answer = answers[id]
        if (!answer || answer.trim() === '') {
            toast.error('Por favor escribe una respuesta')
            return
        }

        setIsSubmitting(id)
        try {
            const { answerPendingQuestion } = await import('@/lib/actions/pending-questions')
            await answerPendingQuestion(id, answer)

            toast.success('Respuesta guardada y bot entrenado')

            // Remove from list
            setQuestions(prev => prev.filter(q => q.id !== id))
            const newAnswers = { ...answers }
            delete newAnswers[id]
            setAnswers(newAnswers)

        } catch (error) {
            console.error(error)
            toast.error('Error al guardar la respuesta')
        } finally {
            setIsSubmitting(null)
        }
    }

    const handleIgnore = async (id: string) => {
        setIsSubmitting(id)
        try {
            const { ignorePendingQuestion } = await import('@/lib/actions/pending-questions')
            await ignorePendingQuestion(id)

            toast.success('Pregunta ignorada')
            setQuestions(prev => prev.filter(q => q.id !== id))
        } catch (error) {
            console.error(error)
            toast.error('Error al ignorar la pregunta')
        } finally {
            setIsSubmitting(null)
        }
    }

    if (questions.length === 0) {
        return (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-[#21AC96]/10 rounded-full flex items-center justify-center mb-6">
                    <Check className="w-10 h-10 text-[#21AC96]" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">¡Todo al día!</h3>
                <p className="text-gray-500 font-medium max-w-md mx-auto">
                    El bot no tiene preguntas pendientes por responder. Cuando un usuario haga una pregunta que el bot no sepa, aparecerá aquí.
                </p>
            </div>
        )
    }

    return (
        <div className="grid gap-6">
            {questions.map((question) => (
                <div key={question.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
                    {/* Pregunta */}
                    <div className="p-8 md:w-1/3 bg-gray-50 border-r border-gray-100 flex flex-col">
                        <div className="flex items-center gap-3 text-[#21AC96] font-black uppercase tracking-widest text-xs mb-4">
                            <MessageSquare className="w-4 h-4" />
                            Pregunta del Usuario
                        </div>
                        <p className="text-gray-900 font-bold text-lg mb-4 flex-1">
                            "{question.question}"
                        </p>
                        <div className="text-sm text-gray-400 font-medium">
                            {format(new Date(question.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                        </div>
                    </div>

                    {/* Respuesta */}
                    <div className="p-8 md:w-2/3 flex flex-col">
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Tu Respuesta Oficial</h4>
                        <textarea
                            value={answers[question.id] || ''}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            placeholder="Escribe la respuesta oficial. Esto entrenará al bot para futuras interacciones..."
                            className="w-full flex-1 min-h-[120px] p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-[#21AC96]/20 text-gray-700 font-medium resize-none mb-6"
                            disabled={isSubmitting === question.id}
                        />

                        <div className="flex items-center justify-between mt-auto">
                            <button
                                onClick={() => handleIgnore(question.id)}
                                disabled={isSubmitting === question.id}
                                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl font-bold transition-all"
                            >
                                <X className="w-4 h-4" />
                                Ignorar
                            </button>

                            <button
                                onClick={() => handleSubmitAnswer(question.id)}
                                disabled={isSubmitting === question.id || !answers[question.id]?.trim()}
                                className="flex items-center gap-2 px-6 py-3 bg-[#21AC96] text-white rounded-xl font-black shadow-lg shadow-[#21AC96]/20 hover:bg-[#1a8a78] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting === question.id ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                Entrenar Bot
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
