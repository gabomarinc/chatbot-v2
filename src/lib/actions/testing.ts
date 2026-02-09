'use server'

import { prisma } from '@/lib/prisma'
import { generateEmbedding, cosineSimilarity } from '@/lib/ai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { Message } from '@prisma/client'
import { listAvailableSlots, createCalendarEvent } from '@/lib/google'

export async function testAgent(
    agentId: string,
    content: string,
    visitorId: string,
    history: { role: 'USER' | 'AGENT', content: string }[] = []
) {
    console.log(`[testAgent] SHORT CIRCUIT TEST for agentId: ${agentId}`);

    // TEMPORARY DEBUG: Return immediate success to verify server action plumbing
    return {
        agentMsg: { content: "Hola, soy el agente en modo prueba. Si ves esto, la conexión básica funciona, pero la lógica de IA está desactivada temporalmente para aislar el error." }
    }

    /* 
    // ORIGINAL LOGIC COMMENTED OUT FOR DEBUGGING
    try {
        // ... (rest of the logic)
    } catch (e) { ... }
    */

}
