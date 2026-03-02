import { Command } from 'commander';
import { intro, outro, spinner } from '@clack/prompts';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import fs from 'fs';
import pc from 'picocolors';

import { globalPresetRegistry, RagPipeline } from '@rag-preset/core';
import { OpenAIEmbedder } from '@rag-preset/embedder-openai';
import { VoyageEmbedder } from '@rag-preset/embedder-voyage';
import { GeminiEmbedder } from '@rag-preset/embedder-gemini';
import { PgVectorStore } from '@rag-preset/store-pgvector';
import { QdrantStore } from '@rag-preset/store-qdrant';
import { PineconeStore } from '@rag-preset/store-pinecone';
import { PdfLoader } from '@rag-preset/loader-pdf';
import { trace } from '@rag-preset/eval';

export const traceCommand = new Command('trace')
    .description('Trace top-K retrieval results for a given query')
    .argument('<query>', 'The query to run against the retriever')
    .option('-k, --topk <number>', 'Number of results to retrieve', '5')
    .option('-c, --config <path>', 'Path to custom rag.config.ts')
    .action(async (query: string, options: { topk: string; config?: string }) => {
        dotenvConfig();
        intro(pc.bgBlue(pc.white(` ragkit trace `)));

        const k = parseInt(options.topk, 10);
        let presetName = process.env.RAG_PROVIDER || 'openai';
        let storeName = process.env.RAG_STORE || 'pgvector';

        const configPath = options.config
            ? path.resolve(options.config)
            : path.join(process.cwd(), 'rag.config.ts');

        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            const ptMatch = content.match(/preset:\s*['"](.+?)['"]/);
            if (ptMatch && !process.env.RAG_PROVIDER) presetName = ptMatch[1];
            const stMatch = content.match(/store:\s*['"](.+?)['"]/);
            if (stMatch && !process.env.RAG_STORE) storeName = stMatch[1];
        }

        const preset = globalPresetRegistry.get(presetName);

        // --- Embedder ---
        let embedder: any;
        if (presetName === 'claude') {
            embedder = new VoyageEmbedder({ model: preset.config.embeddingModel });
        } else if (presetName === 'gemini') {
            embedder = new GeminiEmbedder({ model: preset.config.embeddingModel });
        } else {
            embedder = new OpenAIEmbedder({ model: preset.config.embeddingModel });
        }

        // --- Store ---
        let store: any;
        if (storeName === 'qdrant') {
            store = new QdrantStore({ collectionName: 'documents', dimensions: preset.config.vectorDimensions });
        } else if (storeName === 'pinecone') {
            store = new PineconeStore({ indexName: 'default-index', dimensions: preset.config.vectorDimensions });
        } else {
            store = new PgVectorStore({
                connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rag',
                vectorDimensions: preset.config.vectorDimensions,
            });
        }

        const pipeline = new RagPipeline({
            presetName,
            loader: new PdfLoader({ filePath: '' }),  // loader no se usa en retrieval
            store,
            embedder,
        });

        const s = spinner();
        s.start(`Querying "${query}" (top ${k})...`);

        try {
            if (typeof store.init === 'function') await store.init();
            const retriever = pipeline.getRetriever();
            s.stop(pc.green(`✓ Connected to ${storeName}`));

            await trace(query, retriever, k);

            outro(pc.green(`✔ Trace complete`));
        } catch (err: any) {
            s.stop(pc.red('✗ Error'));
            console.error(pc.red(`Error: ${err.message || err}`));
            process.exit(1);
        } finally {
            if (typeof store.close === 'function') await store.close();
        }
    });
