'use server'

import { prisma } from '@/lib/prisma'
import { getUserWorkspace } from './workspace'
import { revalidatePath } from 'next/cache'
import { load } from 'cheerio'
import { generateEmbedding } from '@/lib/ai'
import * as XLSX from 'xlsx'

/**
 * Advanced Semantic Chunking with Overlap
 * Splits text by respecting boundaries (periods, newlines) and maintaining context.
 */
function chunkText(text: string, size: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let start = 0;

    // Normalize whitespace
    const cleanText = text.replace(/\s+/g, ' ').trim();

    if (cleanText.length <= size) return [cleanText];

    while (start < cleanText.length) {
        let end = start + size;

        // Try to find a good breaking point in the "lookback" range (last 15% of chunk)
        if (end < cleanText.length) {
            const lookbackSize = 150;
            const lookbackRange = cleanText.slice(Math.max(0, end - lookbackSize), end + 50);

            // Prefer periods, then newlines, then spaces
            const lastPeriod = lookbackRange.lastIndexOf('.');
            const lastNewline = lookbackRange.lastIndexOf('\n');
            const lastSpace = lookbackRange.lastIndexOf(' ');

            let bestBreak = lastPeriod !== -1 ? lastPeriod : (lastNewline !== -1 ? lastNewline : lastSpace);

            if (bestBreak !== -1) {
                end = Math.max(0, end - lookbackSize) + bestBreak + 1;
            }
        }

        const chunk = cleanText.slice(start, end).trim();
        if (chunk.length > 5) {
            chunks.push(chunk);
        }

        start = end - overlap;

        // Safety checks
        if (start < 0) start = 0;
        if (end >= cleanText.length) break;
        if (start >= cleanText.length - overlap) break;
    }

    return chunks.length > 0 ? chunks : [cleanText];
}

export async function addKnowledgeSource(agentId: string, data: {
    type: 'TEXT' | 'WEBSITE' | 'VIDEO' | 'DOCUMENT';
    url?: string;
    text?: string;
    fileContent?: string;
    fileName?: string;
    updateInterval?: 'NEVER' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    crawlSubpages?: boolean;
}) {
    try {
        const workspace = await getUserWorkspace()
        if (!workspace) throw new Error('Unauthorized')

        // Verify agent belongs to workspace
        const agent = await prisma.agent.findFirst({
            where: {
                id: agentId,
                workspaceId: workspace.id
            },
            include: {
                knowledgeBases: true
            }
        })

        if (!agent) throw new Error('Agent not found or unauthorized')

        // Get or create knowledge base
        let knowledgeBaseId = agent.knowledgeBases[0]?.id

        if (!knowledgeBaseId) {
            const kb = await prisma.knowledgeBase.create({
                data: {
                    agentId: agent.id,
                    name: `${agent.name} Knowledge Base`
                }
            })
            knowledgeBaseId = kb.id
        }

        // Create knowledge source
        const source = await prisma.knowledgeSource.create({
            data: {
                knowledgeBaseId,
                type: data.type,
                url: data.type === 'WEBSITE' || data.type === 'VIDEO' ? data.url : undefined,
                fileUrl: data.type === 'DOCUMENT' ? data.fileName : undefined,
                status: 'PROCESSING',
                updateInterval: data.updateInterval || 'NEVER',
                crawlSubpages: data.crawlSubpages || false,
            }
        })

        try {
            // Handle TEXT type
            if (data.type === 'TEXT' && data.text) {
                const chunks = chunkText(data.text);
                console.log(`[KNOWLEDGE] Processing TEXT. Created ${chunks.length} chunks.`);

                for (const chunk of chunks) {
                    const embedding = await generateEmbedding(chunk);
                    await prisma.documentChunk.create({
                        data: {
                            knowledgeSourceId: source.id,
                            content: chunk,
                            embedding: embedding
                        }
                    })
                }

                await prisma.knowledgeSource.update({
                    where: { id: source.id },
                    data: { status: 'READY' }
                })
            }
            // Handle WEBSITE type (Robust Scraping)
            else if (data.type === 'WEBSITE' && data.url) {
                let text = '';
                const targetUrl = data.url.startsWith('http') ? data.url : `https://${data.url}`;

                console.log(`[SCRAPING] Starting robust scrape for: ${targetUrl}`);

                try {
                    console.log('[SCRAPING] Strategy 1: Jina Reader');
                    const jinaResponse = await fetch(`https://r.jina.ai/${targetUrl}`, {
                        headers: {
                            'User-Agent': 'KonsulBot/1.0',
                            'Accept': 'text/plain'
                        },
                        signal: AbortSignal.timeout(25000)
                    });

                    if (jinaResponse.ok) {
                        text = await jinaResponse.text();
                        if (text.length > 200 && !text.includes("Access Denied")) {
                            console.log(`[SCRAPING] Jina success! Extracted ${text.length} chars`);
                        } else {
                            throw new Error("Jina returned empty or blocked content");
                        }
                    } else {
                        throw new Error(`Jina failed with ${jinaResponse.status}`);
                    }
                } catch (jinaError) {
                    console.warn('[SCRAPING] Strategy 1 failed, trying Strategy 2 (Direct Fetch):', jinaError);
                    try {
                        const response = await fetch(targetUrl, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            },
                            signal: AbortSignal.timeout(20000)
                        });

                        if (!response.ok) throw new Error(`HTTP ${response.status}`);

                        const html = await response.text();
                        const $ = load(html);
                        $('script, style, noscript, iframe, nav, footer, header, svg').remove();
                        text = $('body').text().replace(/\s+/g, ' ').trim();
                        if (text.length === 0) throw new Error("Empty body after cleanup");

                        console.log(`[SCRAPING] Direct success! Extracted ${text.length} chars`);
                    } catch (cheerioError: any) {
                        console.error('[SCRAPING] All strategies failed for', targetUrl);
                        throw new Error(`Could not scrape website: ${cheerioError.message}`);
                    }
                }

                if (text.length > 0) {
                    const chunks = chunkText(text);
                    console.log(`[SCRAPING] Creating ${chunks.length} chunks for website.`);

                    for (const chunk of chunks) {
                        const embedding = await generateEmbedding(chunk);
                        await prisma.documentChunk.create({
                            data: {
                                knowledgeSourceId: source.id,
                                content: chunk,
                                embedding: embedding
                            }
                        })
                    }

                    await prisma.knowledgeSource.update({
                        where: { id: source.id },
                        data: { status: 'READY' }
                    })
                }
            }
            // Handle VIDEO type (Stub)
            else if (data.type === 'VIDEO' && data.url) {
                try {
                    const content = `Video Source: ${data.url} (Transcript not yet implemented)`;
                    const embedding = await generateEmbedding(content);

                    await prisma.documentChunk.create({
                        data: {
                            knowledgeSourceId: source.id,
                            content: content,
                            embedding: embedding
                        }
                    });

                    await prisma.knowledgeSource.update({
                        where: { id: source.id },
                        data: { status: 'READY' }
                    });
                } catch (e) {
                    throw e;
                }
            }
            // Handle DOCUMENT type
            else if (data.type === 'DOCUMENT' && (data.fileContent || data.url)) {
                let text = '';
                let buffer: Buffer | null = null;

                if (data.fileContent && data.fileContent.includes('base64')) {
                    const base64Data = data.fileContent.split(',')[1];
                    buffer = Buffer.from(base64Data, 'base64');
                } else if (data.url) {
                    const response = await fetch(data.url);
                    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
                    const arrayBuffer = await response.arrayBuffer();
                    buffer = Buffer.from(arrayBuffer);
                } else if (data.fileContent) {
                    text = data.fileContent;
                }

                if (buffer) {
                    const fileName = (data.fileName || data.url || '').toLowerCase();
                    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv');
                    const isPdf = fileName.endsWith('.pdf') || (data.fileContent && data.fileContent.startsWith('data:application/pdf'));

                    if (isExcel) {
                        const workbook = XLSX.read(buffer, { type: 'buffer' });
                        let excelText = '';
                        workbook.SheetNames.forEach(sheetName => {
                            const worksheet = workbook.Sheets[sheetName];
                            const sheetData = XLSX.utils.sheet_to_txt(worksheet);
                            if (sheetData.trim()) excelText += `### Hoja: ${sheetName}\n${sheetData}\n\n`;
                        });
                        text = excelText;
                    } else if (isPdf) {
                        const PDFParser = (await import('pdf2json')).default;
                        const pdfParser = new PDFParser(null, true);
                        text = await new Promise((resolve, reject) => {
                            pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
                            pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
                            pdfParser.parseBuffer(buffer!);
                        });
                    } else {
                        text = buffer.toString('utf-8');
                    }
                }

                if (text.length > 0) {
                    const chunks = chunkText(text);
                    console.log(`[KNOWLEDGE] Created ${chunks.length} semantic chunks.`);

                    for (const chunk of chunks) {
                        const embedding = await generateEmbedding(chunk);
                        await prisma.documentChunk.create({
                            data: {
                                knowledgeSourceId: source.id,
                                content: chunk,
                                embedding: embedding
                            }
                        })
                    }

                    await prisma.knowledgeSource.update({
                        where: { id: source.id },
                        data: { status: 'READY' }
                    })
                }
            }

        } catch (e) {
            console.error("[KNOWLEDGE] Inner logic error:", e);
            const errorMessage = (e instanceof Error && e.message) ? e.message : String(e) || 'Unknown knowledge source error';
            await prisma.knowledgeSource.update({
                where: { id: source.id },
                data: { status: 'FAILED', errorMessage: errorMessage }
            })
        }

        // Recalculate training score
        try {
            const { calculateAgentScore } = await import('@/lib/scoring/agent-scoring')
            await calculateAgentScore(agentId)
        } catch (error) {
            console.error('Failed to recalculate agent score:', error)
        }

        revalidatePath(`/agents/${agentId}/training`)
        return source

    } catch (criticalError) {
        console.error("[KNOWLEDGE] CRITICAL FAULT:", criticalError);
        throw criticalError;
    }
}

export async function deleteKnowledgeSource(agentId: string, sourceId: string) {
    const workspace = await getUserWorkspace()
    if (!workspace) throw new Error('Unauthorized')

    const agent = await prisma.agent.findFirst({
        where: { id: agentId, workspaceId: workspace.id }
    })

    if (!agent) throw new Error('Agent not found or unauthorized')

    await prisma.documentChunk.deleteMany({
        where: { knowledgeSourceId: sourceId }
    })

    await prisma.knowledgeSource.delete({
        where: { id: sourceId }
    })

    try {
        const { calculateAgentScore } = await import('@/lib/scoring/agent-scoring')
        await calculateAgentScore(agentId)
    } catch (error) {
        console.error('Failed to recalculate agent score:', error)
    }

    revalidatePath(`/agents/${agentId}/training`)
}
