import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { prisma } from '@/lib/prisma';

export interface AuditFinding {
    type: 'AMBIGUITY' | 'MISSING_DATA' | 'FORMATTING' | 'CONTRADICTION';
    message: string;
    suggestion: string;
}

export interface AuditResult {
    score: number;
    findings: AuditFinding[];
}

export async function auditKnowledgeContent(text: string, agent: any): Promise<AuditResult> {
    try {
        // Limit text size for audit to avoid token limits
        const auditText = text.substring(0, 10000);

        // 0. Resolve API Keys
        let openaiKey = process.env.OPENAI_API_KEY;
        let googleKey = process.env.GOOGLE_API_KEY;

        if (!openaiKey || !googleKey) {
            const configs = await prisma.globalConfig.findMany({
                where: {
                    key: { in: ['OPENAI_API_KEY', 'GOOGLE_API_KEY'] }
                }
            });
            if (!openaiKey) openaiKey = configs.find((c: any) => c.key === 'OPENAI_API_KEY')?.value;
            if (!googleKey) googleKey = configs.find((c: any) => c.key === 'GOOGLE_API_KEY')?.value;
        }

        const systemPrompt = `Eres un estratega experto en entrenamiento de IA. Tu misión es analizar la información cargada por el usuario y compararla con el perfil del Agente para dar recomendaciones de mejora (Tips de Entrenamiento).

PERFIL DEL AGENTE:
- Nombre: ${agent.name}
- Empresa: ${agent.jobCompany || 'No especificada'}
- Objetivo: ${agent.jobType === 'SALES' ? 'Vender y convertir' : 'Soporte y ayuda'}
- Descripción Negocio: ${agent.jobDescription || 'No especificada'}

Tu tarea es dar recomendaciones ACTIONABLES y PROFESIONALES. No seas genérico.
Ejemplo: Si el bot es de Bienes Raíces y el PDF solo tiene precios, recomienda subir un PDF con amenidades y fotos de las zonas.

FORMATO DE RESPUESTA (JSON estricto):
{
  "score": número del 1 al 10 (10 es perfecto),
  "findings": [
    {
      "type": "AMBIGUITY" | "MISSING_DATA" | "STRATEGIC_TIP",
      "message": "Título corto de la recomendación",
      "suggestion": "Instrucción clara al usuario de qué subir o qué ajustar"
    }
  ]
}`;

        let resultText = '';

        if (googleKey) {
            const genAI = new GoogleGenerativeAI(googleKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent([systemPrompt, `TEXTO A AUDITAR:\n${auditText}`]);
            resultText = result.response.text();
        } else if (openaiKey) {
            const openai = new OpenAI({ apiKey: openaiKey });
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: auditText }
                ],
                response_format: { type: "json_object" }
            });
            resultText = response.choices[0].message.content || '{}';
        } else {
            return { score: 10, findings: [] }; // Fallback if no AI
        }

        const parsed = JSON.parse(resultText);
        return {
            score: parsed.score || 10,
            findings: parsed.findings || []
        };

    } catch (error) {
        console.error("[CONTENT_AUDIT] Error auditing content:", error);
        return { score: 10, findings: [] };
    }
}
