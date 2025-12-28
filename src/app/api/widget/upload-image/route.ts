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
            try {
                // Use require for pdf-parse (commonjs module)
                const pdfParse = require('pdf-parse');
                const pdfData = await pdfParse(buffer);
                if (pdfData && pdfData.text && typeof pdfData.text === 'string') {
                    let text = pdfData.text;
                    // Limit extracted text to reasonable length (e.g., first 50000 chars)
                    if (text.length > 50000) {
                        text = text.substring(0, 50000) + '\n[... contenido truncado ...]';
                    }
                    extractedText = text;
                }
            } catch (error) {
                console.error('Error parsing PDF:', error);
                return NextResponse.json(
                    { error: 'Error al procesar el PDF. Por favor, verifica que el archivo sea válido.' },
                    { status: 400 }
                );
            }
        }

        // Upload to R2
        const fileUrl = await uploadFileToR2(
            buffer,
            `${Date.now()}-${file.name}`,
            file.type
        );

        if (!fileUrl) {
            return NextResponse.json(
                { error: 'Failed to upload file' },
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
