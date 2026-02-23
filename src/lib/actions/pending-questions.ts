'use server'

import { prisma } from '@/lib/prisma'
import { getUserWorkspace } from './workspace'
import { revalidatePath } from 'next/cache'

export async function getPendingQuestions(agentId: string) {
    const workspace = await getUserWorkspace()
    if (!workspace) throw new Error('Unauthorized')

    // Verify agent belongs to workspace
    const agent = await prisma.agent.findFirst({
        where: { id: agentId, workspaceId: workspace.id }
    })

    if (!agent) throw new Error('Agent not found')

    const questions = await (prisma as any).pendingQuestion.findMany({
        where: { agentId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: {
            // Include conversation details to show context if needed
        }
    })

    return questions;
}

export async function answerPendingQuestion(questionId: string, answer: string) {
    const workspace = await getUserWorkspace()
    if (!workspace) throw new Error('Unauthorized')

    const question = await (prisma as any).pendingQuestion.findUnique({
        where: { id: questionId },
        include: { agent: true }
    })

    if (!question || question.agent.workspaceId !== workspace.id) {
        throw new Error('Not found or unauthorized')
    }

    try {
        // Save the answer as a manual training Q&A pair context in knowledge base
        const { addKnowledgeSource } = await import('@/lib/actions/knowledge');

        await addKnowledgeSource(question.agentId, {
            type: 'TEXT',
            text: `Pregunta: ${question.question}\nRespuesta: ${answer}`
        });

        // Update the question status
        await (prisma as any).pendingQuestion.update({
            where: { id: questionId },
            data: {
                status: 'ANSWERED',
                answer: answer
            }
        });

        revalidatePath(`/agents/${question.agentId}/pending-questions`)
        return { success: true }
    } catch (e) {
        console.error('Error answering question:', e)
        throw new Error('Failed to answer question')
    }
}

export async function ignorePendingQuestion(questionId: string) {
    const workspace = await getUserWorkspace()
    if (!workspace) throw new Error('Unauthorized')

    const question = await (prisma as any).pendingQuestion.findUnique({
        where: { id: questionId },
        include: { agent: true }
    })

    if (!question || question.agent.workspaceId !== workspace.id) {
        throw new Error('Not found or unauthorized')
    }

    await (prisma as any).pendingQuestion.update({
        where: { id: questionId },
        data: { status: 'IGNORED' }
    });

    revalidatePath(`/agents/${question.agentId}/pending-questions`)
    return { success: true }
}
