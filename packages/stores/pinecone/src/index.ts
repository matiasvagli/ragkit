import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import { Document, StoreAdapter } from '@rag-preset/core';

export interface PineconeStoreConfig {
    apiKey?: string;
    indexName: string;
    namespace?: string;
    dimensions: number;
}

export class PineconeStore implements StoreAdapter {
    private client: Pinecone;
    private indexName: string;
    private namespace: string;
    private dimensions: number;

    constructor(config: PineconeStoreConfig) {
        this.client = new Pinecone({
            apiKey: config.apiKey || process.env.PINECONE_API_KEY || '',
        });
        this.indexName = config.indexName;
        this.namespace = config.namespace || 'default';
        this.dimensions = config.dimensions;
    }

    async ensureIndex(): Promise<void> {
        const { indexes } = await this.client.listIndexes();
        const exists = indexes?.some(idx => idx.name === this.indexName);

        if (!exists) {
            throw new Error(`Pinecone index '${this.indexName}' not found. Create it at app.pinecone.io with dimensions: ${this.dimensions}`);
        }
    }

    async store(docs: Document[], embeddings: number[][]): Promise<void> {
        await this.ensureIndex();

        if (docs.length !== embeddings.length) {
            throw new Error("Mismatch between docs and embeddings count.");
        }
        if (docs.length === 0) return;

        const index = this.client.index(this.indexName).namespace(this.namespace);

        const records = docs.map((doc, i) => {
            const pointId = uuidv4();
            return {
                id: pointId,
                values: embeddings[i],
                metadata: {
                    content: doc.content,
                    ...doc.metadata,
                    _originalId: doc.id
                },
            };
        });

        // Pinecone typically processes uploads in batches over HTTP. 
        // Their sdk supports direct array upserts.
        await index.upsert(records);
    }

    async similaritySearch(queryEmbedding: number[], topK: number): Promise<Document[]> {
        await this.ensureIndex();

        const index = this.client.index(this.indexName).namespace(this.namespace);

        const searchResult = await index.query({
            vector: queryEmbedding,
            topK: topK,
            includeMetadata: true,
        });

        return searchResult.matches.map(match => {
            const meta = match.metadata || {};
            return {
                id: (meta._originalId as string) || match.id,
                content: (meta.content as string) || '',
                metadata: meta,
            };
        });
    }
}
