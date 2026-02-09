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
                    { prompt: prompt + " natural lighting, authentic look, smartphone photography style" }
                ],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: "1:1",
                    personGeneration: "allow_adult"
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
        // EXTREME REALISM: Focus on "average person", "imperfect", "non-model"
        let prompt = `Amateur photo / Selfie of a normal everyday person (${roleDesc})${companyContext}. The person is named "${agent.name}", so the gender and appearance should match this name.

CRITICAL:
- This must look like a REAL PERSON, not a model.
- Average attractiveness, natural imperfections, slight asymmetry.
- NOT a professional headshot.
- NOT studio lighting.
- NO makeup or very natural makeup.

APPEARANCE:
- ${expressionDesc}
- ${attireDesc}
- Age: 25-50 years old
- Messy hair or natural style (not perfect salon hair)
- Skin texture: Pores, blemishes, wrinkles, natural oils (CRITICAL)

STYLE:
- Smartphone camera quality (iPhone/Pixel)
- Bad/Natural lighting (fluorescent office light or window)
- Slight blur or noise
- Candid angle, maybe looking slightly away or smiling naturally
- Background: Busy office, authentic workplace, not a blurred grey studio background

AVOID:
- "Perfect" beauty
- Professional lighting
- Bokeh that looks fake
- Airbrushed skin
- 3D render style
- Illustration`;

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

        return { success: true, url: avatarUrl };
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

        let prompt = `Amateur photo / Selfie of a normal everyday person (${jobType === 'SALES' ? 'sales professional' : jobType === 'SUPPORT' ? 'customer support specialist' : 'business professional'}). The person is named "${data.name}", so the gender and appearance should match this name. `;

        if (data.companyName) {
            prompt += `Working at ${data.companyName}. `;
        }

        // Add role-specific context
        if (jobType === 'SALES') {
            prompt += `Approachable, confident. Smart business casual. `;
        } else if (jobType === 'SUPPORT') {
            prompt += `Patient, friendly. T-shirt or polo. `;
        } else {
            prompt += `Professional but casual. `;
        }

        prompt += `
CRITICAL:
- REAL PERSON look, NOT a model.
- Average attractiveness, natural imperfections.
- Messy hair, pores, natural skin oils.
- Smartphone camera quality (iPhone/Pixel).
- Bad/Natural lighting (fluorescent office light or window).
- Background: Busy office, authentic workplace.
- NO professional lighting, NO airbrushing.`;

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
