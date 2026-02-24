export interface RagkitConfig {
    preset: 'openai' | 'claude' | 'gemini';
    store: 'pgvector' | 'qdrant' | 'pinecone';
    source: 'pdf' | 'docx' | 'txt' | 'url';
}

export function defineConfig(config: RagkitConfig): RagkitConfig {
    return config;
}
