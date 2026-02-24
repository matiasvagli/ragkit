import { Document, LoaderAdapter } from '@rag-preset/core';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';

export interface PdfLoaderConfig {
    filePath: string;
}

export class PdfLoader implements LoaderAdapter {
    private config: PdfLoaderConfig;

    constructor(config: PdfLoaderConfig) {
        this.config = config;
    }

    async load(): Promise<Document[]> {
        const dataBuffer = fs.readFileSync(this.config.filePath);

        // Parse the PDF
        const data = await pdfParse(dataBuffer);

        // Return as a single document for now.
        // In a real-world scenario, we might want to split pages here, 
        // or rely on the ChunkerAdapter downstream.
        return [
            {
                id: path.basename(this.config.filePath),
                content: data.text,
                metadata: {
                    source: this.config.filePath,
                    numpages: data.numpages,
                    info: data.info,
                }
            }
        ];
    }
}
