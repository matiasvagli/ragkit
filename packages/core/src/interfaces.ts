export interface Document {
    id: string;
    content: string;
    metadata: Record<string, any>;
}

export interface LoaderAdapter {
    load(): Promise<Document[]>;
}

export interface SanitizerAdapter {
    sanitize(docs: Document[]): Promise<Document[]>;
}

export interface ChunkerAdapter {
    chunk(docs: Document[]): Promise<Document[]>;
}

export interface EmbedderAdapter {
    embed(texts: string[]): Promise<number[][]>;
}

export interface StoreAdapter {
    store(docs: Document[], embeddings: number[][]): Promise<void>;
    similaritySearch(queryEmbedding: number[], topK: number): Promise<Document[]>;
}

export type RetrievedChunk = {
    chunkId: string;
    docId: string;
    score: number;
    text: string;
    metadata?: Record<string, any>;
};

export interface Retriever {
    retrieve(query: string, k: number): Promise<RetrievedChunk[]>;
}
