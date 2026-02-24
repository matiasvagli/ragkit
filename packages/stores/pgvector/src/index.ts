import { Pool } from 'pg';
import { registerType } from 'pgvector/pg';
import { Document, StoreAdapter } from '@rag-preset/core';

export interface PgVectorStoreConfig {
    connectionString: string;
    tableName?: string;
    vectorDimensions: number;
}

export class PgVectorStore implements StoreAdapter {
    private pool: Pool;
    private tableName: string;
    private vectorDimensions: number;
    private initialized: boolean = false;

    constructor(config: PgVectorStoreConfig) {
        this.pool = new Pool({ connectionString: config.connectionString });
        this.tableName = config.tableName || 'documents';
        this.vectorDimensions = config.vectorDimensions;

        // We defer registering pgvector type until the extension is guaranteed to exist
        // This is done in the init() method instead.
    }

    async init(): Promise<void> {
        if (this.initialized) return;

        const client = await this.pool.connect();
        try {
            await client.query('CREATE EXTENSION IF NOT EXISTS vector');
            await registerType(client);

            await client.query(`
                CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                metadata JSONB NOT NULL DEFAULT '{}',
                embedding vector(${this.vectorDimensions})
                )
            `);
            this.initialized = true;
        } finally {
            client.release();
        }
    }

    async store(docs: Document[], embeddings: number[][]): Promise<void> {
        await this.init();

        if (docs.length !== embeddings.length) {
            throw new Error("Mismatch between docs and embeddings count.");
        }

        if (docs.length === 0) return;

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Simple insert implementation. In production, consider batch insert strategies.
            const query = `
                INSERT INTO ${this.tableName} (id, content, metadata, embedding)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE SET
                content = EXCLUDED.content,
                metadata = EXCLUDED.metadata,
                embedding = EXCLUDED.embedding
            `;

            for (let i = 0; i < docs.length; i++) {
                const doc = docs[i];
                const embedding = embeddings[i];

                // Format the mathematical array into a format pgvector expects: '[1,2,3]'
                const embeddingValue = `[${embedding.join(',')}]`;

                await client.query(query, [
                    doc.id,
                    doc.content,
                    JSON.stringify(doc.metadata),
                    embeddingValue,
                ]);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async similaritySearch(queryEmbedding: number[], topK: number): Promise<Document[]> {
        await this.init();

        const client = await this.pool.connect();
        try {
            // Use the `<=>` operator for cosine distance in pgvector
            const queryValue = `[${queryEmbedding.join(',')}]`;

            const result = await client.query(`
                SELECT id, content, metadata
                FROM ${this.tableName}
                ORDER BY embedding <=> $1
                LIMIT $2
            `, [queryValue, topK]);

            return result.rows.map(row => ({
                id: row.id,
                content: row.content,
                metadata: row.metadata,
            }));
        } finally {
            client.release();
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}
