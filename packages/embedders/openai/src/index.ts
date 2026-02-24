import OpenAI from 'openai';
import { EmbedderAdapter } from '@rag-preset/core';

export interface OpenAIEmbedderConfig {
    apiKey?: string;
    model?: string;
}

export class OpenAIEmbedder implements EmbedderAdapter {
    private client: OpenAI;
    private model: string;

    constructor(config?: OpenAIEmbedderConfig) {
        this.client = new OpenAI({
            apiKey: config?.apiKey || process.env.OPENAI_API_KEY,
        });
        // Default model if not overridden by the preset or user
        this.model = config?.model || 'text-embedding-3-small';
    }

    async embed(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) return [];

        const response = await this.client.embeddings.create({
            model: this.model,
            input: texts,
            encoding_format: 'float',
        });

        // Ensure the results map back in the correct order
        const sortedEmbeddings = response.data
            .sort((a, b) => a.index - b.index)
            .map(item => item.embedding);

        return sortedEmbeddings;
    }
}
