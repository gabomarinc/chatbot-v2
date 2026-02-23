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

    if (allSources.length > 0) totalPoints += 5; // Has at least 1 source
    if (hasWebsite) totalPoints += 5; // Has website source
    if (hasPDF) totalPoints += 5; // Has PDF source
    if (hasManualFAQ) totalPoints += 5; // Encouraging manual Q&A
    if (allProcessed && !hasErrorSources) totalPoints += 5; // All sources processed successfully

    // Quality Score (15 points max)
    const sourcesWithScore = allSources.filter((s: any) => s.contentScore !== null);
    if (sourcesWithScore.length > 0) {
        const avgContentScore = sourcesWithScore.reduce((acc: number, s: any) => acc + (s.contentScore || 10), 0) / sourcesWithScore.length;
        totalPoints += (avgContentScore * 1.5); // avg 10 * 1.5 = 15 points
    } else if (allSources.length > 0) {
        totalPoints += 10; // Neutral score if no audit yet
    }

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
    const hasTools = agent.transferToHuman || agent.smartRetrieval;
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
    const hasTools = agent.transferToHuman || agent.smartRetrieval;
    const hasCustomFields = agent.customFieldDefinitions.length > 0;

    // Audit findings
    const auditFindings = allSources
        .filter((s: any) => s.contentAudit)
        .flatMap((s: any) => {
            const findings = (s.contentAudit as any[]) || [];
            return findings.map(f => ({ ...f, sourceName: s.displayName }));
        });

    return {
        auditFindings,
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

    // Audit Suggestion (Highest Priority)
    if (breakdown.auditFindings && breakdown.auditFindings.length > 0) {
        // Take top 3 audit findings
        breakdown.auditFindings.slice(0, 3).forEach((finding: any) => {
            suggestions.unshift(`${finding.sourceName}: ${finding.message} (${finding.suggestion})`);
        });
    }

    return suggestions;
}

/**
 * Perform a global strategic audit of the agent's training state
 */
export async function getGlobalAgentAudit(agentId: string) {
    const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
            knowledgeBases: {
                include: {
                    sources: {
                        where: { status: 'READY' }
                    }
                }
            }
        }
    });

    if (!agent) throw new Error('Agent not found');

    const allSources = agent.knowledgeBases.flatMap((kb: any) => kb.sources);
    if (allSources.length === 0) {
        return {
            summary: "Tu agente aún no tiene conocimientos. Comienza subiendo un PDF o vinculando tu sitio web.",
            tips: ["Sube un PDF con tus servicios principales.", "Vincula tu sitio web oficial."]
        };
    }

    // Extract a sample of content from sources for context
    const chunks = await prisma.documentChunk.findMany({
        where: { knowledgeSourceId: { in: allSources.map(s => s.id) } },
        take: 10,
        select: { content: true }
    });

    const contextSample = chunks.map(c => c.content).join('\n\n').substring(0, 5000);

    // Resolve API Keys
    let openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
        const config = await prisma.globalConfig.findFirst({ where: { key: 'OPENAI_API_KEY' } });
        openaiKey = config?.value;
    }

    if (!openaiKey) return { summary: "Audit not available (No API Key)", tips: [] };

    const { OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: openaiKey });

    const systemPrompt = `Eres un estratega experto en IA Conversacional para empresas. 
Tu misión es auditar el estado actual del entrenamiento de un bot y dar recomendaciones estratégicas.

PERFIL DEL AGENTE:
- Nombre: ${agent.name}
- Empresa: ${agent.jobCompany || 'No especificada'}
- Objetivo: ${agent.jobType === 'SALES' ? 'Ventas' : 'Soporte'}
- Qué hace: ${agent.jobDescription}

CONTENIDO ACTUAL (Muestra):
${contextSample}

Responde en formato JSON:
{
  "summary": "Un resumen ejecutivo de 2 líneas sobre qué tan preparado está el bot.",
  "tips": [
    "Tip 1: Que sea directo y accionable (máximo 15 palabras)",
    "Tip 2...",
    "Tip 3..."
  ]
}`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');
        return {
            summary: result.summary || "Análisis completado.",
            tips: result.tips || []
        };
    } catch (e) {
        console.error("Global Audit Error:", e);
        return { summary: "Error al generar auditoría.", tips: [] };
    }
}
