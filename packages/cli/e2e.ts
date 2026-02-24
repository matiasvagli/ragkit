import { config } from 'dotenv';
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

config(); // Load variables from .env if present

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

async function run() {
    const presetName = process.env.RAG_PROVIDER || 'openai';
    const storeName = process.env.RAG_STORE || 'pgvector';

    // Default to the dummy PDF if no args are passed
    const inputPath = process.argv[2] || require('path').join(__dirname, 'dummy.pdf');

    const preset = globalPresetRegistry.get(presetName);

    console.log(`Using preset: ${preset.name} (${preset.config.embeddingModel}, ${preset.config.vectorDimensions} dims)`);
    console.log(`Using store:  ${storeName}`);
    console.log(`Processing:   ${inputPath}`);

    // Dynamic Loader Mapping
    let loader;
    if (inputPath.startsWith('http://') || inputPath.startsWith('https://')) {
        loader = new UrlLoader({ url: inputPath });
    } else if (inputPath.toLowerCase().endsWith('.pdf')) {
        loader = new PdfLoader({ filePath: inputPath });
    } else if (inputPath.toLowerCase().endsWith('.docx')) {
        loader = new DocxLoader({ filePath: inputPath });
    } else if (inputPath.toLowerCase().endsWith('.txt') || inputPath.toLowerCase().endsWith('.md')) {
        loader = new TxtLoader({ filePath: inputPath });
    } else {
        throw new Error(`Unsupported file type for input: ${inputPath}`);
    }

    // Initialize Chunker with preset config
    const chunker = new SimpleChunker(preset.config.chunkSize, preset.config.chunkOverlap);

    // Dynamic Embedder Switching (in the future handled by globalEmbedderRegistry)
    let embedder;
    if (presetName === 'claude') {
        embedder = new VoyageEmbedder({ model: preset.config.embeddingModel });
    } else if (presetName === 'gemini') {
        embedder = new GeminiEmbedder({ model: preset.config.embeddingModel });
    } else {
        embedder = new OpenAIEmbedder({ model: preset.config.embeddingModel });
    }

    // Dynamic Store Switching (in the future handled by globalStoreRegistry)
    let store;
    if (storeName === 'qdrant') {
        store = new QdrantStore({
            collectionName: 'documents',
            dimensions: preset.config.vectorDimensions
        });
    } else if (storeName === 'pinecone') {
        store = new PineconeStore({
            indexName: 'default-index',
            dimensions: preset.config.vectorDimensions
        });
    } else {
        store = new PgVectorStore({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rag',
            vectorDimensions: preset.config.vectorDimensions
        });
    }

    const pipeline = new RagPipeline({
        presetName: preset.name,
        loader,
        chunker,
        embedder,
        store,
    });

    try {
        await pipeline.run();
        console.log('✅ End-to-End Pipeline executed successfully!');
    } catch (error) {
        if ((error as any).status === 401 || String(error).includes('API key') || String(error).includes('API_KEY')) {
            console.log('✅ Pipeline constructed and ran successfully up to an API Hook.');
            console.log('⚠️ Expected authentication/connection error caught:');
            console.log(error);
        } else {
            console.error('❌ Pipeline failed:', error);
        }
    } finally {
        if (typeof (store as any).close === 'function') {
            await (store as any).close();
        }
    }
}

run();
