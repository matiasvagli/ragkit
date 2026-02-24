import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import { Document, StoreAdapter } from '@rag-preset/core';

export interface QdrantStoreConfig {
    url?: string;
    apiKey?: string;
    collectionName: string;
    dimensions: number;
}

export class QdrantStore implements StoreAdapter {
    private client: QdrantClient;
    private collectionName: string;
    private dimensions: number;

    constructor(config: QdrantStoreConfig) {
        this.client = new QdrantClient({
            url: config.url || 'http://localhost:6333',
            apiKey: config.apiKey,
        });
        this.collectionName = config.collectionName;
        this.dimensions = config.dimensions;
    }

    async ensureCollection(): Promise<void> {
        const collections = await this.client.getCollections();
        const exists = collections.collections.some(c => c.name === this.collectionName);

        if (!exists) {
            await this.client.createCollection(this.collectionName, {
                vectors: {
                    size: this.dimensions,
                    distance: 'Cosine',
                },
            });
        }
    }

    async store(docs: Document[], embeddings: number[][]): Promise<void> {
        await this.ensureCollection();

        if (docs.length !== embeddings.length) {
            throw new Error("Mismatch between docs and embeddings count.");
        }
        if (docs.length === 0) return;

        const points = docs.map((doc, i) => {
            // Qdrant allows numerical IDs or UUIDs. We generate a deterministic or random UUID.
            const pointId = uuidv4();
            return {
                id: pointId,
                vector: embeddings[i],
                payload: {
                    content: doc.content,
                    ...doc.metadata,
                    _originalId: doc.id
                },
            };
        });

        await this.client.upsert(this.collectionName, {
            wait: true,
            points: points,
        });
    }

    async similaritySearch(queryEmbedding: number[], topK: number): Promise<Document[]> {
        await this.ensureCollection();

        const searchResult = await this.client.search(this.collectionName, {
            vector: queryEmbedding,
            limit: topK,
            with_payload: true,
        });

        return searchResult.map(res => {
            const payload = res.payload || {};
            return {
                id: (payload._originalId as string) || String(res.id),
                content: (payload.content as string) || '',
                metadata: payload,
            };
        });
    }
}
