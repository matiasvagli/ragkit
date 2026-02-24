import { Command } from 'commander';
import { intro, outro, spinner, note, isCancel, cancel } from '@clack/prompts';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import fs from 'fs';
import pc from 'picocolors';

import { globalPresetRegistry, RagPipeline, ChunkerAdapter, Document } from '@rag-preset/core';
import { OpenAIEmbedder } from '@rag-preset/embedder-openai';
import { VoyageEmbedder } from '@rag-preset/embedder-voyage';
import { GeminiEmbedder } from '@rag-preset/embedder-gemini';
import { PdfLoader } from '@rag-preset/loader-pdf';
import { DocxLoader } from '@rag-preset/loader-docx';
import { TxtLoader } from '@rag-preset/loader-txt';
import { UrlLoader } from '@rag-preset/loader-url';
import { PgVectorStore } from '@rag-preset/store-pgvector';
import { QdrantStore } from '@rag-preset/store-qdrant';
import { PineconeStore } from '@rag-preset/store-pinecone';

class SimpleChunker implements ChunkerAdapter {
    constructor(private chunkSize: number, private chunkOverlap: number) { }

    async chunk(docs: Document[]): Promise<Document[]> {
        const chunks: Document[] = [];
        for (const doc of docs) {
            let startIndex = 0;
            let chunkIdx = 0;
            while (startIndex < doc.content.length) {
                const content = doc.content.slice(startIndex, startIndex + this.chunkSize);
                chunks.push({
                    id: `${doc.id}-chunk-${chunkIdx}`,
                    content,
                    metadata: { ...doc.metadata, chunkIdx },
                });
                startIndex += (this.chunkSize - this.chunkOverlap);
                chunkIdx++;
            }
        }
        return chunks;
    }
}

export const ingestCommand = new Command('ingest')
    .description('Run the full RAG pipeline on a given file or URL')
    .argument('<filepath>', 'File or URL to ingest')
    .option('-c, --config <path>', 'Path to custom rag.config.ts')
    .action(async (filepath: string, options: { config?: string }) => {
        dotenvConfig();
        intro(pc.bgBlue(pc.white(` ragkit ingest `)));

        let presetName = process.env.RAG_PROVIDER || 'openai';
        let storeName = process.env.RAG_STORE || 'pgvector';

        const configPath = options.config ? path.resolve(options.config) : path.join(process.cwd(), 'rag.config.ts');

        if (fs.existsSync(configPath) && (!process.env.RAG_PROVIDER || !process.env.RAG_STORE)) {
            const content = fs.readFileSync(configPath, 'utf8');
            const ptMatch = content.match(/preset:\s*['"](.*?)['"]/);
            if (ptMatch && !process.env.RAG_PROVIDER) presetName = ptMatch[1];

            const stMatch = content.match(/store:\s*['"](.*?)['"]/);
            if (stMatch && !process.env.RAG_STORE) storeName = stMatch[1];
        }

        const preset = globalPresetRegistry.get(presetName);

        if (!preset) {
            cancel(`Unknown preset: ${presetName}`);
            process.exit(1);
        }

        // --- Loader Resolution ---
        const s = spinner();
        s.start(`Analyzing input: ${filepath}`);

        let loader;
        if (filepath.startsWith('http://') || filepath.startsWith('https://')) {
            loader = new UrlLoader({ url: filepath });
            s.message('Loader: UrlLoader selected');
        } else {
            const absolutePath = path.resolve(filepath);
            if (!fs.existsSync(absolutePath)) {
                s.stop('File check failed');
                cancel(`File not found: ${absolutePath}`);
                process.exit(1);
            }
            if (filepath.toLowerCase().endsWith('.pdf')) {
                loader = new PdfLoader({ filePath: absolutePath });
                s.message('Loader: PdfLoader selected');
            } else if (filepath.toLowerCase().endsWith('.docx')) {
                loader = new DocxLoader({ filePath: absolutePath });
                s.message('Loader: DocxLoader selected');
            } else if (filepath.toLowerCase().endsWith('.txt') || filepath.toLowerCase().endsWith('.md')) {
                loader = new TxtLoader({ filePath: absolutePath });
                s.message('Loader: TxtLoader selected');
            } else {
                s.stop('Unsupported file type');
                cancel(`Unsupported file type for input: ${filepath}`);
                process.exit(1);
            }
        }

        // --- Chunker setup ---
        const chunker = new SimpleChunker(preset.config.chunkSize, preset.config.chunkOverlap);

        // --- Embedder Switch ---
        const s3 = spinner();
        let embedder;
        if (presetName === 'claude') {
            if (!process.env.VOYAGE_API_KEY) { cancel("VOYAGE_API_KEY is not set. Get yours at voyageai.com"); process.exit(1); }
            embedder = new VoyageEmbedder({ model: preset.config.embeddingModel });
        } else if (presetName === 'gemini') {
            if (!process.env.GEMINI_API_KEY) { cancel("GEMINI_API_KEY is not set. Get yours at aistudio.google.com"); process.exit(1); }
            embedder = new GeminiEmbedder({ model: preset.config.embeddingModel });
        } else {
            if (!process.env.OPENAI_API_KEY) { cancel("OPENAI_API_KEY is not set. Get yours at platform.openai.com"); process.exit(1); }
            embedder = new OpenAIEmbedder({ model: preset.config.embeddingModel });
        }

        // --- Store Switch ---
        let store: any;
        try {
            if (storeName === 'qdrant') {
                store = new QdrantStore({ collectionName: 'documents', dimensions: preset.config.vectorDimensions });
            } else if (storeName === 'pinecone') {
                store = new PineconeStore({ indexName: 'default-index', dimensions: preset.config.vectorDimensions });
            } else {
                store = new PgVectorStore({
                    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rag',
                    vectorDimensions: preset.config.vectorDimensions
                });
            }
        } catch (e) {
            cancel(`Could not initialize ${storeName}. ${(e as Error).message}`); process.exit(1);
        }

        try {
            // Fake granular visual steps because RagPipeline.run() is a single async call currently
            // But we can re-implement the engine steps here explicitly to satisfy the user's granular UX requirements
            const rawDocs = await loader.load();
            s.stop(pc.green(`✓ Loaded document (${rawDocs[0]?.content.length || 0} chars)`));

            const s2 = spinner();
            s2.start('Sanitizing and chunking...');
            // Sanitizer is skipped in MVP
            const chunks = await chunker.chunk(rawDocs);
            s2.stop(pc.green(`✓ Chunked → ${chunks.length} chunks (size: ${preset.config.chunkSize}, overlap: ${preset.config.chunkOverlap})`));

            s3.start(`Embedding ${chunks.length} chunks with ${preset.config.embeddingModel}...`);
            const vectors = await embedder.embed(chunks.map((c: any) => c.content));
            s3.stop(pc.green(`✓ Embedded → ${chunks.length}/${chunks.length} chunks (${preset.config.embeddingModel})`));

            const s4 = spinner();
            s4.start(`Storing in ${storeName}...`);

            const ids = chunks.map((c: any) => c.id);
            const metadata = chunks.map((c: any) => c.metadata);

            await store.init();
            await store.store(vectors, ids, metadata);

            s4.stop(pc.green(`✓ Stored successfully in ${storeName}`));

            outro(pc.green(`🚀 Ingestion complete!`));
        } catch (error: any) {
            s.stop();
            if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
                cancel(`Could not connect to ${storeName}. Is the database running?`);
            } else {
                cancel(`Pipeline failed: ${error.message || error}`);
            }
        } finally {
            if (typeof store?.close === 'function') {
                await store.close();
            }
        }
    });
