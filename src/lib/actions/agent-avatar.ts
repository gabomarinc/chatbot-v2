'use server'

import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { uploadFileToR2 } from '@/lib/r2';
import { getUserWorkspace } from './workspace';
import { revalidatePath } from 'next/cache';

// Helper to generate image using Google Imagen 3 (Gemini)
async function generateImageWithGemini(prompt: string, apiKey: string): Promise<string | null> {
    try {
        console.log('[AvatarGen] Attempting generation with Google Imagen 3...');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                instances: [
                    { prompt: prompt + " photorealistic, 8k, highly detailed, sharp focus" }
                ],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: "1:1",
                    personGeneration: "allow_adult" // Required for generating people in some versions, or 'allow_all'
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`[AvatarGen] Google Imagen 3 failed (${response.status}): ${errorText}`);
            return null;
        }

        const data = await response.json();
        const base64Image = data.predictions?.[0]?.bytesBase64Encoded;

        if (!base64Image) {
            console.warn('[AvatarGen] Google Imagen 3 returned no image data');
            return null;
        }

        return base64Image;
    } catch (error) {
        console.warn('[AvatarGen] Error calling Google Imagen 3:', error);
        return null;
    }
}

export async function generateAgentAvatar(agentId: string) {
    try {
        // 1. Auth Check
        const workspace = await getUserWorkspace();
        if (!workspace) throw new Error("Unauthorized");

        const agent = await prisma.agent.findFirst({
            where: { id: agentId, workspaceId: workspace.id }
        });

        if (!agent) throw new Error("Agent not found");

        // 2. Prepare Culturally Appropriate Prompt
        const openaiKey = process.env.OPENAI_API_KEY;
        const googleKey = process.env.GOOGLE_API_KEY;

        // Determine role-specific attributes
        let roleDesc = '';
        let attireDesc = '';
        let expressionDesc = '';

        if (agent.jobType === 'SALES') {
            roleDesc = 'sales professional';
            attireDesc = 'Smart business casual attire: dress shirt, blazer, professional appearance';
            expressionDesc = 'Approachable, confident, warm smile';
        } else if (agent.jobType === 'SUPPORT') {
            roleDesc = 'customer support specialist';
            attireDesc = 'Professional but comfortable clothing: button-down shirt or polo';
            expressionDesc = 'Patient, empathetic, friendly expression';
        } else {
            roleDesc = 'business professional';
            attireDesc = 'Professional business attire';
            expressionDesc = 'Professional, neutral, approachable expression';
        }

        const companyContext = agent.jobCompany ? ` working at ${agent.jobCompany}` : '';

        // CRITICAL: Specify ethnicity and appearance for Latin American/Spanish market
        let prompt = `Professional corporate headshot photograph of a ${roleDesc}${companyContext}. The person is named "${agent.name}", so the gender and appearance should match this name.
        
CRITICAL ETHNICITY & APPEARANCE REQUIREMENTS:
- Latin American, Spanish, or Southern European appearance
- Light to medium skin tone (NOT Middle Eastern, NOT South Asian)
- Western professional styling and grooming
- Clean-shaven or well-groomed facial hair
- Modern Western hairstyle
- NO turbans, NO traditional Middle Eastern clothing
- European or Latin American facial features

SPECIFIC APPEARANCE:
- ${expressionDesc}
- ${attireDesc}
- Age: 28-40 years old
- Modern, professional grooming
- Natural, authentic expression

PHOTOGRAPHY SPECIFICATIONS:
- Shot on Canon EOS R5 with 85mm f/1.4 lens at f/2.0
- Professional corporate headshot photography
- Soft studio lighting with natural window fill light
- Neutral gray or soft bokeh office background
- Sharp focus on eyes, shallow depth of field
- Professional color grading, natural skin tones
- High resolution, RAW photo quality

REALISM REQUIREMENTS:
- Actual photograph, NOT illustration or 3D render
- Real human skin with natural texture and pores
- Authentic eye reflections and catchlights
- Natural facial asymmetry
- Real hair with individual strands visible
- Slight natural imperfections (subtle)

AVOID COMPLETELY:
- Middle Eastern appearance or features
- South Asian appearance
- Traditional ethnic clothing or accessories
- Cartoon, illustration, or digital art style
- Overly airbrushed or perfect skin
- Artificial or CGI appearance

STYLE: Professional LinkedIn headshot, Western corporate photography, business portrait. Think Fortune 500 company employee headshot for Latin American or Spanish market.`;

        console.log(`[AvatarGen] Generating culturally appropriate PHOTOREALISTIC avatar for ${agent.name}`);

        let imageBase64: string | null = null;
        let modelUsed = 'dall-e-3';

        // 3a. Try Google Imagen 3 First (if key exists)
        if (googleKey) {
            imageBase64 = await generateImageWithGemini(prompt, googleKey);
            if (imageBase64) modelUsed = 'imagen-3';
        }

        // 3b. Fallback to OpenAI DALL-E 3
        if (!imageBase64 && openaiKey) {
            console.log('[AvatarGen] Falling back to OpenAI DALL-E 3...');
            const openai = new OpenAI({ apiKey: openaiKey });
            const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                quality: "hd",
                response_format: "b64_json",
            });
            imageBase64 = response.data?.[0]?.b64_json || null;
        }

        if (!imageBase64) throw new Error("No image generated (Both providers failed)");

        // 4. Save to R2
        const buffer = Buffer.from(imageBase64, 'base64');
        const fileName = `avatar-${agent.id}-${Date.now()}.png`; // PNG default
        const avatarUrl = await uploadFileToR2(buffer, fileName, 'image/png');

        // 5. Update Agent
        await prisma.agent.update({
            where: { id: agent.id },
            data: { avatarUrl }
        });

        // 6. Track Usage & Cost
        const COST_IN_CREDITS = 50;

        await prisma.$transaction([
            // Log Usage
            prisma.usageLog.create({
                data: {
                    workspaceId: workspace.id,
                    agentId: agent.id,
                    tokensUsed: 0,
                    creditsUsed: COST_IN_CREDITS,
                    model: modelUsed,
                }
            }),
            // Deduct Credits
            prisma.creditBalance.update({
                where: { workspaceId: workspace.id },
                data: {
                    balance: { decrement: COST_IN_CREDITS },
                    totalUsed: { increment: COST_IN_CREDITS }
                }
            })
        ]);

        revalidatePath(`/agents/${agent.id}`);
        revalidatePath(`/agents/${agent.id}/settings`);
        revalidatePath(`/agents/${agent.id}/profile`);

        return { success: true, url: avatarUrl };

    } catch (error: any) {
        console.error("Avatar generation failed:", error);
        return { success: false, error: error.message };
    }
}

export async function uploadAgentAvatar(agentId: string, formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) throw new Error("No file provided");

        // 1. Auth Check
        const workspace = await getUserWorkspace();
        if (!workspace) throw new Error("Unauthorized");

        const agent = await prisma.agent.findFirst({
            where: { id: agentId, workspaceId: workspace.id }
        });

        if (!agent) throw new Error("Agent not found");

        // 2. Upload to R2
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `avatar-manual-${agent.id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
        const avatarUrl = await uploadFileToR2(buffer, fileName, file.type);

        // 3. Update Agent
        await prisma.agent.update({
            where: { id: agent.id },
            data: { avatarUrl }
        });

        revalidatePath(`/agents/${agent.id}`);
        revalidatePath(`/agents/${agent.id}/settings`);
    } catch (error: any) {
        console.error("Manual avatar upload failed:", error);
        return { success: false, error: error.message };
    }
}

export async function generatePreviewAvatar(data: { name: string, intent: string, companyName?: string }) {
    try {
        // 1. Auth Check
        const workspace = await getUserWorkspace();
        if (!workspace) throw new Error("Unauthorized");

        // 2. Derive Job Type from Intent
        const normalizedIntent = data.intent.toUpperCase();
        let jobType = 'PERSONAL';
        if (normalizedIntent.includes('VENTA') || normalizedIntent.includes('COMERCIAL') || normalizedIntent.includes('SALES')) jobType = 'SALES';
        else if (normalizedIntent.includes('SOPORTE') || normalizedIntent.includes('ATENCIÓN') || normalizedIntent.includes('SUPPORT') || normalizedIntent.includes('SERVICE')) jobType = 'SUPPORT';

        // 3. Prepare Prompt
        const openaiKey = process.env.OPENAI_API_KEY;
        const googleKey = process.env.GOOGLE_API_KEY;

        let prompt = `Candid portrait photograph of a real ${jobType === 'SALES' ? 'sales professional' : jobType === 'SUPPORT' ? 'customer support specialist' : 'business professional'}. The person is named "${data.name}", so the gender and appearance should match this name. `;

        if (data.companyName) {
            prompt += `Working at ${data.companyName}. `;
        }

        // Add role-specific context
        if (jobType === 'SALES') {
            prompt += `Approachable, confident demeanor. Smart business casual attire. `;
        } else if (jobType === 'SUPPORT') {
            prompt += `Patient, empathetic expression. Professional but comfortable clothing. `;
        } else {
            prompt += `Professional appearance, neutral expression. `;
        }

        prompt += `Taken with iPhone 15 Pro in Portrait Mode. Natural office lighting from window. Unposed, authentic moment captured during workday. Shallow depth of field (f/1.8), soft bokeh background. Visible skin texture, natural imperfections, real human features. Slight asymmetry in face. NOT a professional headshot, NOT studio lighting, NOT AI generated, NOT 3D render, NOT perfect skin. Documentary photography style, photojournalism aesthetic, candid street photography look.`;

        console.log(`[AvatarPreview] Generating with prompt: ${prompt}`);

        let imageBase64: string | null = null;
        let modelUsed = 'dall-e-3';

        // 3a. Try Google Imagen 3 First
        if (googleKey) {
            imageBase64 = await generateImageWithGemini(prompt, googleKey);
            if (imageBase64) modelUsed = 'imagen-3';
        }

        // 3b. Fallback to OpenAI DALL-E 3
        if (!imageBase64 && openaiKey) {
            console.log('[AvatarPreview] Falling back to OpenAI DALL-E 3...');
            const openai = new OpenAI({ apiKey: openaiKey });
            const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json",
            });
            imageBase64 = response.data?.[0]?.b64_json || null;
        }

        if (!imageBase64) throw new Error("No image generated (Both providers failed)");

        // 5. Save to R2
        const buffer = Buffer.from(imageBase64, 'base64');
        const fileName = `avatar-preview-${workspace.id}-${Date.now()}.png`;
        const avatarUrl = await uploadFileToR2(buffer, fileName, 'image/png');

        // 6. Track Usage & Cost
        const COST_IN_CREDITS = 50;

        await prisma.$transaction([
            // Log Usage - Using workspaceId only since agent doesn't exist yet
            prisma.usageLog.create({
                data: {
                    workspaceId: workspace.id,
                    agentId: null,
                    tokensUsed: 0,
                    creditsUsed: COST_IN_CREDITS,
                    model: modelUsed,
                }
            }),
            // Deduct Credits
            prisma.creditBalance.update({
                where: { workspaceId: workspace.id },
                data: {
                    balance: { decrement: COST_IN_CREDITS },
                    totalUsed: { increment: COST_IN_CREDITS }
                }
            })
        ]);

        return { success: true, url: avatarUrl };

    } catch (error: any) {
        console.error("Avatar preview generation failed:", error);
        return { success: false, error: error.message };
    }
}

export async function uploadPreviewAvatar(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) throw new Error("No file provided");

        // 1. Auth Check
        const workspace = await getUserWorkspace();
        if (!workspace) throw new Error("Unauthorized");

        // 2. Upload to R2
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `avatar-manual-preview-${workspace.id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
        const avatarUrl = await uploadFileToR2(buffer, fileName, file.type);

        return { success: true, url: avatarUrl };
    } catch (error: any) {
        console.error("Manual avatar preview upload failed:", error);
        return { success: false, error: error.message };
    }
}
