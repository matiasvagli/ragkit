import { VoyageAIClient } from 'voyageai';
import { EmbedderAdapter } from '@rag-preset/core';

export interface VoyageEmbedderConfig {
    apiKey?: string;
    model?: string;
}

export class VoyageEmbedder implements EmbedderAdapter {
    private client: VoyageAIClient;
    private model: string;

    constructor(config?: VoyageEmbedderConfig) {
        this.client = new VoyageAIClient({
            apiKey: config?.apiKey || process.env.VOYAGE_API_KEY,
        });
        // Default model for Voyage if not overridden by the preset or user
        this.model = config?.model || 'voyage-3';
    }

    async embed(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) return [];

        const response = await this.client.embed({
            model: this.model,
            input: texts,
        });

        // Ensure the results map back in the correct order
        if (!response.data) {
            return [];
        }

        const sortedEmbeddings = response.data
            .sort((a, b) => (a.index || 0) - (b.index || 0))
            .map(item => item.embedding);

        // Filter out undefined if any somehow slipped through
        return sortedEmbeddings.filter((arr): arr is number[] => arr !== undefined);
    }
}
