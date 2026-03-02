import { ChunkerAdapter, Document, EmbedderAdapter, LoaderAdapter, Retriever, RetrievedChunk, SanitizerAdapter, StoreAdapter } from '../interfaces';
import { PresetRegistry, globalPresetRegistry } from '../presets/registry';

export interface PipelineConfig {
    presetName: string;
    loader: LoaderAdapter;
    store: StoreAdapter;
    chunker?: ChunkerAdapter;
    sanitizer?: SanitizerAdapter;
    embedder: EmbedderAdapter;
}

export class RagPipeline {
    private config: PipelineConfig;
    private registry: PresetRegistry;

    constructor(config: PipelineConfig, registry: PresetRegistry = globalPresetRegistry) {
        this.config = config;
        this.registry = registry;
    }

    getConfig(): PipelineConfig {
        return this.config;
    }

    getRetriever(): Retriever {
        const embedder = this.config.embedder;
        const store = this.config.store;
        return {
            retrieve: async (query: string, k: number): Promise<RetrievedChunk[]> => {
                const [queryEmbedding] = await embedder.embed([query]);
                const docs = await store.similaritySearch(queryEmbedding, k);
                return docs.map((doc: Document, index: number) => ({
                    chunkId: doc.id,
                    docId: (doc.metadata?.docId as string) ?? doc.id.split('-chunk-')[0] ?? doc.id,
                    score: (doc.metadata?.score as number) ?? (1 - index * 0.05),
                    text: doc.content,
                    metadata: doc.metadata,
                }));
            },
        };
    }

    async run(): Promise<void> {
        const preset = this.registry.get(this.config.presetName);
        console.log(`[RAG Pipeline] Starting ingestion with preset: ${preset.name}`);

        // 1. Load
        console.log(`[RAG Pipeline] Loading documents...`);
        let docs = await this.config.loader.load();
        console.log(`[RAG Pipeline] Loaded ${docs.length} documents.`);

        // 2. Sanitize
        if (this.config.sanitizer) {
            console.log(`[RAG Pipeline] Sanitizing documents...`);
            docs = await this.config.sanitizer.sanitize(docs);
        }

        // 3. Chunk
        let chunkedDocs = docs;
        if (this.config.chunker) {
            console.log(`[RAG Pipeline] Chunking documents (size: ${preset.config.chunkSize}, overlap: ${preset.config.chunkOverlap})...`);
            chunkedDocs = await this.config.chunker.chunk(docs);
        }
        console.log(`[RAG Pipeline] Processed into ${chunkedDocs.length} chunks.`);

        // 4. Encode & Batch Strategy
        console.log(`[RAG Pipeline] Embedding chunks...`);
        const embeddings = await this.batchEmbed(chunkedDocs);

        if (embeddings.length !== chunkedDocs.length) {
            throw new Error("Mismatch between chunks count and embeddings count returned by the provider.");
        }

        // 5. Store
        console.log(`[RAG Pipeline] Storing vectors...`);
        await this.config.store.store(chunkedDocs, embeddings);
        console.log(`[RAG Pipeline] Ingestion complete.`);
    }

    private async batchEmbed(docs: Document[]): Promise<number[][]> {
        // Simple batching logic. In a real-world scenario, you might want to batch based on token counts or a specified batch size.
        // Assuming the embedder adapter handles its own pagination/rate-limiting based on the array sent, or we enforce a static size here.
        const BATCH_SIZE = 100;
        const allEmbeddings: number[][] = [];

        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const batch = docs.slice(i, i + BATCH_SIZE);
            const texts = batch.map(d => d.content);
            const batchEmbeddings = await this.config.embedder.embed(texts);
            allEmbeddings.push(...batchEmbeddings);
        }

        return allEmbeddings;
    }
}
