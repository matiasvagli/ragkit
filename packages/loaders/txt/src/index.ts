import { readFileSync, existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Document, LoaderAdapter } from '@rag-preset/core';
import * as path from 'path';

export interface TxtLoaderConfig {
    filePath: string;
}

export class TxtLoader implements LoaderAdapter {
    private filePath: string;

    constructor(config: TxtLoaderConfig) {
        this.filePath = config.filePath;
    }

    async load(): Promise<Document[]> {
        if (!existsSync(this.filePath)) {
            throw new Error(`Text file not found: ${this.filePath}`);
        }

        const rawText = readFileSync(this.filePath, 'utf-8');

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
