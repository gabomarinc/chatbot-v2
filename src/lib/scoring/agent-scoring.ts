'use server';

import { prisma } from '@/lib/prisma';

/**
 * Calculate the training quality score for an agent (1-10)
 * 
 * Scoring Criteria:
 * - Knowledge Sources (40 points max)
 * - Prompt Quality - Technical aspects only (30 points max)
 * - Configuration (30 points max)
 * 
 * Total: 100 points → Converted to 1-10 scale
 */
export async function calculateAgentScore(agentId: string): Promise<number> {
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
            knowledgeBases: {
                include: {
                    sources: true
                }
            },
            customFieldDefinitions: true,
            integrations: true
        }
    });

    if (!agent) {
        throw new Error('Agent not found');
    }

    let totalPoints = 0;

    // ========================================
    // 1. KNOWLEDGE SOURCES (40 points max)
    // ========================================
    const allSources = agent.knowledgeBases.flatMap((kb: any) => kb.sources);
    const hasWebsite = allSources.some((s: any) => s.type === 'WEBSITE');
    const hasPDF = allSources.some((s: any) => s.type === 'PDF' || s.type === 'DOCUMENT' || s.fileUrl?.endsWith('.pdf'));
    const hasManualFAQ = allSources.some((s: any) => s.displayName.startsWith('FAQ:'));
    const allProcessed = allSources.length > 0 && allSources.every((s: any) => s.status === 'READY' || s.status === 'PROCESSED');
    const hasErrorSources = allSources.some((s: any) => s.status === 'FAILED' || s.status === 'ERROR');

    if (allSources.length > 0) totalPoints += 10; // Has at least 1 source
    if (hasWebsite) totalPoints += 5; // Has website source
    if (hasPDF) totalPoints += 10; // Has PDF source
    if (hasManualFAQ) totalPoints += 10; // Encouraging manual Q&A
    if (allProcessed && !hasErrorSources) totalPoints += 5; // All sources processed successfully

    // ========================================
    // 2. PROMPT QUALITY - Technical Only (30 points max)
    // ========================================
    const promptLength = agent.personalityPrompt?.length || 0;
    const hasJobDescription = !!agent.jobDescription && agent.jobDescription.length > 20;

    if (promptLength > 100) totalPoints += 10; // Basic prompt exists
    if (promptLength > 300) totalPoints += 10; // Detailed prompt
    if (hasJobDescription) totalPoints += 10; // Has job description

    // ========================================
    // 3. CONFIGURATION (30 points max)
    // ========================================
    const isPremiumModel = agent.model.includes('gpt-4') || agent.model.includes('gemini');
    const hasTools = agent.transferToHuman || agent.allowReminders || agent.smartRetrieval;
    const hasCustomFields = agent.customFieldDefinitions.length > 0;

    if (isPremiumModel) totalPoints += 10; // Using premium model
    if (hasTools) totalPoints += 10; // Has at least 1 tool enabled
    if (hasCustomFields) totalPoints += 10; // Has custom fields

    // Convert 100-point scale to 1-10
    const score = Math.max(1, Math.min(10, Math.round(totalPoints / 10)));

    // Update the agent's score in the database
    await prisma.agent.update({
        where: { id: agentId },
        data: {
            trainingScore: score,
            trainingScoreUpdatedAt: new Date()
        }
    });

    return score;
}

/**
 * Get detailed breakdown of an agent's score
 */
export async function getScoreBreakdown(agentId: string) {
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
            knowledgeBases: {
                include: {
                    sources: true
                }
            },
            customFieldDefinitions: true
        }
    });

    if (!agent) {
        throw new Error('Agent not found');
    }

    const allSources = agent.knowledgeBases.flatMap((kb: any) => kb.sources);
    const hasWebsite = allSources.some((s: any) => s.type === 'WEBSITE');
    const hasPDF = allSources.some((s: any) => s.type === 'PDF' || s.fileUrl?.endsWith('.pdf'));
    const allProcessed = allSources.length > 0 && allSources.every((s: any) => s.status === 'READY' || s.status === 'PROCESSED');
    const failedSources = allSources.filter((s: any) => s.status === 'FAILED' || s.status === 'ERROR');
    const promptLength = agent.personalityPrompt?.length || 0;
    const hasJobDescription = !!agent.jobDescription && agent.jobDescription.length > 20;
    const isPremiumModel = agent.model.includes('gpt-4') || agent.model.includes('gemini');
    const hasTools = agent.transferToHuman || agent.allowReminders || agent.smartRetrieval;
    const hasCustomFields = agent.customFieldDefinitions.length > 0;

    return {
        knowledge: {
            points: (allSources.length > 0 ? 10 : 0) + (hasWebsite ? 10 : 0) + (hasPDF ? 10 : 0) + (allProcessed ? 10 : 0),
            maxPoints: 40,
            details: {
                hasSources: allSources.length > 0,
                hasWebsite,
                hasPDF,
                allProcessed,
                failedSources: failedSources.map((s: any) => s.displayName || s.url || s.fileUrl || 'Documento sin nombre'),
                totalSources: allSources.length
            }
        },
        prompt: {
            points: (promptLength > 100 ? 10 : 0) + (promptLength > 300 ? 10 : 0) + (hasJobDescription ? 10 : 0),
            maxPoints: 30,
            details: {
                promptLength,
                hasBasicPrompt: promptLength > 100,
                hasDetailedPrompt: promptLength > 300,
                hasJobDescription
            }
        },
        configuration: {
            points: (isPremiumModel ? 10 : 0) + (hasTools ? 10 : 0) + (hasCustomFields ? 10 : 0),
            maxPoints: 30,
            details: {
                isPremiumModel,
                hasTools,
                hasCustomFields,
                model: agent.model
            }
        }
    };
}

/**
 * Get suggestions to improve an agent's score
 */
export async function getScoreImprovements(agentId: string) {
    const breakdown = await getScoreBreakdown(agentId);
    const suggestions: string[] = [];

    // Knowledge suggestions
    if (!breakdown.knowledge.details.hasSources) {
        suggestions.push('Agrega al menos una fuente de conocimiento (PDF o sitio web) para mejorar +1 punto');
    }
    if (!breakdown.knowledge.details.hasWebsite) {
        suggestions.push('Agrega un sitio web como fuente para mejorar +1 punto');
    }
    if (!breakdown.knowledge.details.hasPDF) {
        suggestions.push('Sube un PDF con información relevante para mejorar +1 punto');
    }
    if (!breakdown.knowledge.details.allProcessed && breakdown.knowledge.details.failedSources.length > 0) {
        breakdown.knowledge.details.failedSources.forEach((sourceName: string) => {
            suggestions.push(`Revisa y corrige el error en la fuente: ${sourceName}`);
        });
    }

    // Prompt suggestions
    if (!breakdown.prompt.details.hasBasicPrompt) {
        suggestions.push('Escribe instrucciones de comportamiento más detalladas (mínimo 100 caracteres) para mejorar +1 punto');
    }
    if (!breakdown.prompt.details.hasDetailedPrompt) {
        suggestions.push('Expande las instrucciones de comportamiento (mínimo 300 caracteres) para mejorar +1 punto');
    }
    if (!breakdown.prompt.details.hasJobDescription) {
        suggestions.push('Agrega una descripción del trabajo del agente para mejorar +1 punto');
    }

    // Configuration suggestions
    if (!breakdown.configuration.details.isPremiumModel) {
        suggestions.push('Usa un modelo premium (GPT-4o o Gemini) para mejorar +1 punto');
    }
    if (!breakdown.configuration.details.hasTools) {
        suggestions.push('Habilita al menos una herramienta (Transferir a humano, Recordatorios, etc.) para mejorar +1 punto');
    }
    if (!breakdown.configuration.details.hasCustomFields) {
        suggestions.push('Define campos personalizados para capturar información específica para mejorar +1 punto');
    }

    return suggestions;
}
