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

        let prompt = `A professional, high-quality, realistic profile picture of a ${agent.jobType === 'SALES' ? 'friendly sales representative' : agent.jobType === 'SUPPORT' ? 'helpful support specialist' : 'professional assistant'}. `;

        if (agent.jobCompany) {
            prompt += `Named "${agent.name}", working for "${agent.jobCompany}". `;
        } else {
            prompt += `Named "${agent.name}". `;
        }

        // Add visual style details based on role
        if (agent.jobType === 'SALES') {
            prompt += `The person should look approachable, confident, wearing smart detailed business attire. Soft office lighting, blurred office background. `;
        } else if (agent.jobType === 'SUPPORT') {
            prompt += `The person should look emphatic, patient, wearing professional but comfortable clothes. Clean, bright, modern workspace background. `;
        } else {
            prompt += `Professional headshot, clear face, neutral background. `;
        }

        prompt += `Shot on Canon EOS 5D Mark IV, 85mm f/1.2 lens. Extremely detailed skin texture, pores, vellus hair. Natural lighting, slight imperfections, authentic look. Candid photography style, NOT AI generated look, NOT 3d render, NOT plastic skin. Raw photo.`;

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
        revalidatePath(`/agents/${agent.id}/profile`);

        return { success: true, url: avatarUrl };
    } catch (error: any) {
        console.error("Manual avatar upload failed:", error);
        return { success: false, error: error.message };
    }
}
