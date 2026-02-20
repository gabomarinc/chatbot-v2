'use server'

import { prisma } from '@/lib/prisma'
import { getUserWorkspace } from './workspace'
import { revalidatePath } from 'next/cache'
import { load } from 'cheerio'
import { generateEmbedding } from '@/lib/ai'
import * as XLSX from 'xlsx'
import TurndownService from 'turndown'
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm'

const turndownService = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '_',
    strongDelimiter: '**'
})
turndownService.use(gfm)

/**
 * BRUTAL SCRAPER: Level 1 - Semantic Markdown Conversion
 */
function convertToMarkdown(html: string): string {
    const $ = load(html);

    // Remove noise: scripts, styles, navs, footers, sidebars, ads
    $('script, style, noscript, iframe, nav, footer, header, svg, aside, .ads, .sidebar, #footer, #header').remove();

    // Extract main content if possible (heuristic)
    const mainContent = $('main, article, #content, .content, .main').first();
    const htmlToConvert = mainContent.length > 0 ? mainContent.html() : $('body').html();

    return turndownService.turndown(htmlToConvert || '');
}

/**
 * BRUTAL SCRAPER: Level 1 - Sitemap Discovery
 */
async function discoverSitemapUrls(sitemapUrl: string): Promise<string[]> {
    try {
        const response = await fetch(sitemapUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KonsulBot/1.0; +https://konsul.ai)' }
        });
        const xml = await response.text();
        const $ = load(xml, { xmlMode: true });
        const urls: string[] = [];

        $('loc').each((_, el) => {
            const url = $(el).text().trim();
            if (url && url.startsWith('http')) urls.push(url);
        });

        return Array.from(new Set(urls));
    } catch (e) {
        console.error("[SITEMAP] Error discovering URLs:", e);
        return [];
    }
}

/**
 * BRUTAL SCRAPER: Level 1 - Internal Link Discovery (Subpages)
 */
async function discoverSubpages(baseUrl: string): Promise<string[]> {
    try {
        console.log(`[CRAWLER] Discovering subpages for: ${baseUrl}`);
        const response = await fetch(baseUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) return [baseUrl];

        const html = await response.text();
        const $ = load(html);
        const urls = new Set<string>();
        urls.add(baseUrl);

        const domain = new URL(baseUrl).hostname;

        $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            if (!href) return;

            try {
                const fullUrl = new URL(href, baseUrl).toString().split('#')[0].replace(/\/$/, "");
                const urlObj = new URL(fullUrl);

                // Solo mismo dominio, http/https, y evitar archivos no deseados
                if (urlObj.hostname === domain &&
                    urlObj.protocol.startsWith('http') &&
                    !/\.(jpg|jpeg|png|gif|pdf|zip|docx|xlsx|css|js)$/i.test(urlObj.pathname)) {
                    urls.add(fullUrl);
                }
            } catch (e) { }
        });

        console.log(`[CRAWLER] Found ${urls.size} internal candidates.`);
        return Array.from(urls);
    } catch (e) {
        console.error("[CRAWLER] Error discovering subpages:", e);
        return [baseUrl];
    }
}

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
            // Handle WEBSITE type (Robust Scraping Level 1)
            else if (data.type === 'WEBSITE' && data.url) {
                let markdownContent = '';
                const targetUrl = data.url.startsWith('http') ? data.url : `https://${data.url}`;
                const isSitemap = targetUrl.endsWith('.xml') || targetUrl.includes('sitemap');

                console.log(`[SCRAPING] Starting Level 1 Scrape: ${targetUrl} (Sitemap: ${isSitemap})`);

                const urlsToProcess = isSitemap
                    ? await discoverSitemapUrls(targetUrl)
                    : (data.crawlSubpages ? await discoverSubpages(targetUrl) : [targetUrl]);

                // Process up to 15 pages for Level 1 (Motor Maestro)
                const limitedUrls = urlsToProcess.slice(0, 15);

                for (const url of limitedUrls) {
                    try {
                        console.log(`[SCRAPING] Processing: ${url}`);
                        let pageText = '';

                        // Strategy 1: Jina Reader (Best for LLMs)
                        try {
                            const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
                                headers: { 'User-Agent': 'KonsulBot/1.0', 'Accept': 'text/plain' },
                                signal: AbortSignal.timeout(15000)
                            });
                            if (jinaResponse.ok) {
                                pageText = await jinaResponse.text();
                            }
                        } catch (e) { console.warn(`Jina failed for ${url}, trying direct...`); }

                        // Strategy 2: Direct Fetch + Markdown Conversion
                        if (!pageText || pageText.length < 200) {
                            const response = await fetch(url, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                                    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                                },
                                signal: AbortSignal.timeout(15000)
                            });
                            if (response.ok) {
                                const html = await response.text();
                                pageText = convertToMarkdown(html);
                            }
                        }

                        if (pageText) {
                            markdownContent += `\n\n--- FUENTE: ${url} ---\n\n${pageText}`;
                        }
                    } catch (err) {
                        console.error(`Failed to scrape ${url}:`, err);
                    }
                }

                if (markdownContent.length > 0) {
                    const chunks = chunkText(markdownContent);
                    console.log(`[SCRAPING] Created ${chunks.length} semantic markdown chunks.`);

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

/**
 * Advanced: Test how the agent retrieves information (Sandbox)
 */
export async function testRetrieval(agentId: string, query: string) {
    const { retrieveRelevantChunks } = await import('@/lib/retrieval');
    const chunks = await retrieveRelevantChunks(agentId, query, 5);

    return chunks.map(c => ({
        id: c.id,
        content: c.content,
        // Calculate a simple score for the UI if possible, or just return content
    }));
}

/**
 * Advanced: Get all chunks for a specific source (Scraping Filter)
 */
export async function getSourceChunks(sourceId: string) {
    const workspace = await getUserWorkspace();
    if (!workspace) throw new Error('Unauthorized');

    return await prisma.documentChunk.findMany({
        where: {
            knowledgeSourceId: sourceId
        },
        orderBy: {
            createdAt: 'asc'
        }
    });
}

/**
 * Advanced: Delete a specific chunk of knowledge
 */
export async function deleteKnowledgeChunk(chunkId: string) {
    const workspace = await getUserWorkspace();
    if (!workspace) throw new Error('Unauthorized');

    return await prisma.documentChunk.delete({
        where: { id: chunkId }
    });
}
