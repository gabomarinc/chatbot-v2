import { Suspense } from 'react';
import { getAgent } from '@/lib/actions/dashboard';
import { getPendingQuestions } from '@/lib/actions/pending-questions';
import { redirect } from 'next/navigation';
import PendingQuestionsClient from './PendingQuestionsClient';

export default async function PendingQuestionsPage({
    params
}: {
    params: Promise<{ agentId: string }>
}) {
    const { agentId } = await params;
    const agent = await getAgent(agentId);

    if (!agent) {
        redirect('/agents');
    }

    const initialQuestions = await getPendingQuestions(agentId);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div>
                <h1 className="text-gray-900 text-3xl font-black tracking-tight">Preguntas Pendientes</h1>
                <p className="text-gray-500 font-bold mt-2 text-lg">
                    Preguntas que el bot no supo responder y que han sido mandadas a la lista de espera por el comando `log_pending_question`.
                </p>
            </div>

            <Suspense fallback={
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-[#21AC96]/20 border-t-[#21AC96] rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-500 font-bold animate-pulse">Cargando preguntas pendientes...</p>
                </div>
            }>
                <PendingQuestionsClient
                    agentId={agentId}
                    initialQuestions={initialQuestions}
                />
            </Suspense>
        </div>
    );
}
