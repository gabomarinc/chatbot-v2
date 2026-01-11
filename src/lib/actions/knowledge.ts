'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getUserWorkspace } from './dashboard'
import { revalidatePath } from 'next/cache'
import { load } from 'cheerio'
import { generateEmbedding } from '@/lib/ai'


export async function addKnowledgeSource(agentId: string, data: {
    type: 'TEXT' | 'WEBSITE' | 'VIDEO' | 'DOCUMENT';
    url?: string;
    text?: string;
    fileContent?: string;
    fileName?: string;
    updateInterval?: 'NEVER' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    crawlSubpages?: boolean;
}) {
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
            fileUrl: data.type === 'DOCUMENT' ? data.fileName : undefined, // Store filename as fileUrl for simple reference
            status: 'PROCESSING', // Start as processing
            updateInterval: data.updateInterval || 'NEVER',
            crawlSubpages: data.crawlSubpages || false,
        }
    })

    try {
        // Handle TEXT type
        if (data.type === 'TEXT' && data.text) {
            const embedding = await generateEmbedding(data.text);
            await prisma.documentChunk.create({
                data: {
                    knowledgeSourceId: source.id,
                    content: data.text,
                    embedding: embedding
                }
            })

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

            // STRATEGY 1: Jina Reader (Best for RAG, handles JS/Anti-bot)
            try {
                console.log('[SCRAPING] Strategy 1: Jina Reader');
                const jinaResponse = await fetch(`https://r.jina.ai/${targetUrl}`, {
                    headers: {
                        'User-Agent': 'KonsulBot/1.0',
                        'Accept': 'text/plain'
                    },
                    signal: AbortSignal.timeout(25000) // 25s timeout
                });

                if (jinaResponse.ok) {
                    text = await jinaResponse.text();
                    // Jina usually returns "Title\nURL\n...content...". 
                    // Verify we got actual content
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

                // STRATEGY 2: Direct Fetch + Cheerio (Fallback)
                try {
                    const response = await fetch(targetUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        },
                        signal: AbortSignal.timeout(20000) // 20s
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    const html = await response.text();
                    const $ = load(html);

                    // Cleanup
                    $('script, style, noscript, iframe, nav, footer, header, svg').remove();

                    text = $('body').text().replace(/\s+/g, ' ').trim();
                    if (text.length === 0) throw new Error("Empty body after cleanup");

                    console.log(`[SCRAPING] Direct success! Extracted ${text.length} chars`);
                } catch (cheerioError: any) {
                    console.error('[SCRAPING] All strategies failed for', targetUrl);
                    throw new Error(`Could not scrape website: ${cheerioError.message}`);
                }
            }

            // Common processing for whatever text we got
            if (text.length > 0) {
                // Create chunks
                const chunks = text.match(/.{1,1000}/g) || [text];

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
                const response = await fetch(data.url);
                const html = await response.text();
                const $ = load(html);
                const title = $('title').text() || data.url;

                const content = `Video Title: ${title} (Transcript not yet implemented)`;
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
                await prisma.knowledgeSource.update({
                    where: { id: source.id },
                    data: { status: 'FAILED' }
                });
            }
        }
        // Handle DOCUMENT type
        else if (data.type === 'DOCUMENT' && data.fileContent) {
            let text = '';

            try {
                if (data.fileContent.startsWith('data:application/pdf')) {
                    const base64Data = data.fileContent.split(',')[1];
                    const buffer = Buffer.from(base64Data, 'base64');
                    // Lazy load pdf-parse with robust import logic
                    const pdfImp = await import('pdf-parse');
                    // Handle potential ESM/CJS interop issues where class might be default export or named export
                    const PDFParseClass = (pdfImp as any).PDFParse || ((pdfImp as any).default?.PDFParse) || (pdfImp as any).default;

                    if (typeof PDFParseClass !== 'function') {
                        throw new Error(`PDFParse class not found in exports. Keys: ${Object.keys(pdfImp)}`);
                    }

                    const parser = new PDFParseClass({ data: buffer });
                    const pdfData = await parser.getText();
                    text = pdfData.text;
                    if (parser.destroy) await parser.destroy();
                } else {
                    // Assume text
                    text = data.fileContent; // Might contain data:text/plain;base64, if readAsDataURL was used for txt? 
                    // AddSourceModal used readAsText for others. So it is plain text.
                }

                // Clean and chunk
                text = text.replace(/\s+/g, ' ').trim();

                if (text.length > 0) {
                    const chunks = text.match(/.{1,1000}/g) || [text];

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
                } else {
                    throw new Error("No text content found in document");
                }
            } catch (error) {
                console.error("Document parsing error:", error);
                await prisma.knowledgeSource.update({
                    where: { id: source.id },
                    data: { status: 'FAILED' }
                })
            }
        }

    } catch (e) {
        await prisma.knowledgeSource.update({
            where: { id: source.id },
            data: { status: 'FAILED' }
        })
    }

    revalidatePath(`/agents/${agentId}/training`)
    return source
}

export async function deleteKnowledgeSource(agentId: string, sourceId: string) {
    const workspace = await getUserWorkspace()
    if (!workspace) throw new Error('Unauthorized')

    // Verify agent belongs to workspace
    const agent = await prisma.agent.findFirst({
        where: {
            id: agentId,
            workspaceId: workspace.id
        }
    })

    if (!agent) throw new Error('Agent not found or unauthorized')

    // Delete chunks first (manual cascade)
    await prisma.documentChunk.deleteMany({
        where: { knowledgeSourceId: sourceId }
    })

    // Delete source
    await prisma.knowledgeSource.delete({
        where: { id: sourceId }
    })

    revalidatePath(`/agents/${agentId}/training`)
}
