
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function main() {
    console.log("--- Testing pdf-parse v2 ---");

    // Minimal PDF buffer
    const dummyBuffer = Buffer.from('JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXwKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCj4+CiAgL0NvbnRlbnRzIDUgMCBSCj4+CmVuZG9iagoKNCAwIG9iago8PAogIC9UeXBlIC9Gb250CiAgL1N1YnR5cGUgL1R5cGUxCiAgL0Jhc2VGb250IC9UaW1lcy1Sb21hbgpQPj4KZW5kb2JqCgo1IDAgb2JqCiAgPDwgL0xlbmd0aCA0NCA+PgpzdHJlYW0KQlQKLzcxIDEyIFRmCjcwIDUwIFRkCihIZWxsbywgbW9kZWwhKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCgp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA2MCAwMDAwMCBuIAowMDAwMDAwMTU3IDAwMDAwIG4gCjAwMDAwMDAyNTUgMDAwMDAgbiAKMDAwMDAwMDMzOCAwMDAwMCBuIAp0cmFpbGVyCjw8CiAgL1NpemUgNgogIC9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgozODQKJSVFT0YK', 'base64');

    try {
        console.log("Method: dynamic import");
        const pdfImp = await import('pdf-parse');

        // Handle weird export structure if necessary
        const pdfAny = pdfImp as any;
        let PDFParseLike = pdfAny.PDFParse || (pdfAny.default && pdfAny.default.PDFParse) || pdfAny.default;

        console.log("Found class/function:", PDFParseLike);

        if (typeof PDFParseLike === 'function') {
            // It's a class or function
            // Try Class usage first (v2)
            try {
                const parser = new PDFParseLike({ data: dummyBuffer });
                const res = await parser.getText();
                console.log("Success with Class! Text:", res.text);
                if (parser.destroy) await parser.destroy();
            } catch (err: any) {
                console.log("Class usage failed:", err.message);
                // Fallback to function usage (v1)
                try {
                    const res = await PDFParseLike(dummyBuffer);
                    console.log("Success with Function! Text:", res.text);
                } catch (err2: any) {
                    console.log("Function usage failed:", err2.message);
                }
            }
        } else {
            console.error("Could not find a valid PDFParse export.");
        }

    } catch (e) {
        console.error("Test failed:", e);
    }
}

main();
