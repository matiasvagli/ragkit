import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Document, LoaderAdapter } from '@rag-preset/core';
import * as path from 'path';
import * as mammoth from 'mammoth';

export interface DocxLoaderConfig {
    filePath: string;
}

export class DocxLoader implements LoaderAdapter {
    private filePath: string;

    constructor(config: DocxLoaderConfig) {
        this.filePath = config.filePath;
    }

    async load(): Promise<Document[]> {
        if (!existsSync(this.filePath)) {
            throw new Error(`DOCX file not found: ${this.filePath}`);
        }

        const { value: rawText } = await mammoth.extractRawText({ path: this.filePath });

        const doc: Document = {
            id: uuidv4(),
            content: rawText,
            metadata: {
                source: this.filePath,
                filename: path.basename(this.filePath),
            },
        };

        return [doc];
    }
}
