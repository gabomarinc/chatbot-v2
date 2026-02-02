'use server'

import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { uploadFileToR2 } from '@/lib/r2';
import { getUserWorkspace } from './dashboard';
import { revalidatePath } from 'next/cache';

export async function generateAgentAvatar(agentId: string) {
    try {
        // 1. Auth Check
        const workspace = await getUserWorkspace();
        if (!workspace) throw new Error("Unauthorized");

        const agent = await prisma.agent.findFirst({
            where: { id: agentId, workspaceId: workspace.id }
        });

        if (!agent) throw new Error("Agent not found");

        // 2. Prepare Prompt
        // Use OpenAI directly for DALL-E 3 (Gemini image gen supported? Let's stick to DALL-E 3 as requested)
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("OpenAI API Key not configured");

        const openai = new OpenAI({ apiKey });

        let prompt = `Candid portrait photograph of a real ${agent.jobType === 'SALES' ? 'sales professional' : agent.jobType === 'SUPPORT' ? 'customer support specialist' : 'business professional'}. `;

        if (agent.jobCompany) {
            prompt += `Working at ${agent.jobCompany}. `;
        }

        // Add role-specific context
        if (agent.jobType === 'SALES') {
            prompt += `Approachable, confident demeanor. Smart business casual attire. `;
        } else if (agent.jobType === 'SUPPORT') {
            prompt += `Patient, empathetic expression. Professional but comfortable clothing. `;
        } else {
            prompt += `Professional appearance, neutral expression. `;
        }

        prompt += `Taken with iPhone 15 Pro in Portrait Mode. Natural office lighting from window. Unposed, authentic moment captured during workday. Shallow depth of field (f/1.8), soft bokeh background. Visible skin texture, natural imperfections, real human features. Slight asymmetry in face. NOT a professional headshot, NOT studio lighting, NOT AI generated, NOT 3D render, NOT perfect skin. Documentary photography style, photojournalism aesthetic, candid street photography look.`;

        console.log(`[AvatarGen] Generating with prompt: ${prompt}`);

        // 3. Call DALL-E 3
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json", // We get base64 directly to avoid strict URL download issues if any, but URL is also fine.
            // DALL-E 3 standard quality
        });

        const imageBase64 = response.data?.[0]?.b64_json;
        if (!imageBase64) throw new Error("No image generated");

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
        const COST_IN_CREDITS = 50; // Approx $0.04-0.05 value based on token/credit ratio (10cr ~ $0.01)

        await prisma.$transaction([
            // Log Usage
            prisma.usageLog.create({
                data: {
                    workspaceId: workspace.id,
                    agentId: agent.id,
                    tokensUsed: 0, // No tokens for image
                    creditsUsed: COST_IN_CREDITS,
                    model: 'dall-e-3',
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
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("OpenAI API Key not configured");
        const openai = new OpenAI({ apiKey });

        let prompt = `Candid portrait photograph of a real ${jobType === 'SALES' ? 'sales professional' : jobType === 'SUPPORT' ? 'customer support specialist' : 'business professional'}. `;

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

        // 4. Call DALL-E 3
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
        });

        const imageBase64 = response.data?.[0]?.b64_json;
        if (!imageBase64) throw new Error("No image generated");

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
                    model: 'dall-e-3',
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
