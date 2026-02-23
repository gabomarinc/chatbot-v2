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

export async function auditKnowledgeContent(text: string): Promise<AuditResult> {
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

        const systemPrompt = `Eres un auditor experto en calidad de datos para Chatbots de IA (RAG). 
Tu misión es analizar el texto proporcionado y encontrar fallas que podrían causar que una IA alucine o dé información incorrecta.

Analiza específicamente:
1. PRECIOS AMBIGUOS: Si salen montos ($) pero no dice si es mensual, anual, precio total, mantenimiento, etc.
2. CATEGORÍAS VAGAS: Si habla de "unidades" o "propiedades" pero no distingue claramente entre Casa, Apartamento, Terreno, etc.
3. DATOS FALTANTES: Información clave que falta (ej: no hay teléfonos de contacto, no hay fechas de entrega).
4. CONTRADICCIONES: Datos que chocan entre sí.

FORMATO DE RESPUESTA (JSON estricto):
{
  "score": número del 1 al 10 (10 es perfecto, 1 es basura),
  "findings": [
    {
      "type": "AMBIGUITY" | "MISSING_DATA" | "FORMATTING" | "CONTRADICTION",
      "message": "Descripción corta del problema",
      "suggestion": "Cómo el usuario puede arreglar su documento para que sea perfecto"
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
