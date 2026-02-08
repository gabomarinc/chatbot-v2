import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToR2 } from '@/lib/r2';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File || formData.get('image') as File; // Support both names for backward compatibility

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type (images or PDFs)
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';

        if (!isImage && !isPDF) {
            return NextResponse.json(
                { error: 'File must be an image or PDF' },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'File size must be less than 10MB' },
                { status: 400 }
            );
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract text from PDF if applicable
        let extractedText: string | undefined = undefined;
        if (isPDF) {
            // try {
            //     const PDFParser = (await import('pdf2json')).default;
            //     const pdfParser = new PDFParser(null, true);
            //
            //     extractedText = await new Promise((resolve, reject) => {
            //         pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
            //         pdfParser.on("pdfParser_dataReady", () => {
            //             const rawText = pdfParser.getRawTextContent();
            //             resolve(rawText);
            //         });
            //         pdfParser.parseBuffer(buffer);
            //     });
            //
            //     if (extractedText && extractedText.length > 50000) {
            //         extractedText = extractedText.substring(0, 50000) + '\n[... contenido truncado ...]';
            //     }
            // } catch (error) {
            //     console.error('Error parsing PDF:', error);
            //     // Non-fatal error for upload route, but good to log
            // }
            console.log("PDF Parsing disabled for debugging.");
            extractedText = "PDF Content (Extraction Disabled)";
        }

        // Upload to R2
        // Note: uploadFileToR2 already adds a timestamp prefix, so we just pass the original filename
        let fileUrl: string;
        try {
            fileUrl = await uploadFileToR2(
                buffer,
                file.name, // uploadFileToR2 will add timestamp prefix
                file.type
            );

            console.log('[UPLOAD] File uploaded successfully, URL:', fileUrl);

            if (!fileUrl || fileUrl === '') {
                console.error('R2 upload returned empty URL');
                return NextResponse.json(
                    { error: 'Error al subir el archivo. Por favor, verifica la configuración del almacenamiento.' },
                    { status: 500 }
                );
            }
        } catch (error) {
            console.error('Error uploading to R2:', error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : 'Error al subir el archivo' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            url: fileUrl,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            type: isPDF ? 'pdf' : 'image',
            extractedText: extractedText // Include extracted text for PDFs
        });

    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
