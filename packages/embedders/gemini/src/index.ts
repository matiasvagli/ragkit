import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import { EmbedderAdapter } from '@rag-preset/core';

export interface GeminiEmbedderConfig {
    apiKey?: string;
    model?: string;
    requestDelay?: number;
    dimensions?: number; // Inferred from preset, currently just informational on the class if needed
}

export class GeminiEmbedder implements EmbedderAdapter {
    private client: GoogleGenerativeAI;
    private modelName: string;
    private requestDelay: number;

    constructor(config?: GeminiEmbedderConfig) {
        const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Gemini API key not found. Set GEMINI_API_KEY environment variable.\nGet yours at: aistudio.google.com');
        }

        this.client = new GoogleGenerativeAI(apiKey);
        this.modelName = config?.model || 'gemini-embedding-001';
        // Remove 'models/' prefix if accidentally passed, the SDK often adds it internally
        if (this.modelName.startsWith('models/')) {
            this.modelName = this.modelName.replace('models/', '');
        }
        this.requestDelay = config?.requestDelay !== undefined ? config.requestDelay : 100;
    }

    private async sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async embed(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) return [];

        const embeddings: number[][] = [];
        const apiKey = this.client.apiKey;

        // Remove `models/` prefix for the URL builder to avoid errors
        let targetModel = this.modelName;
        if (targetModel.startsWith('models/')) {
            targetModel = targetModel.replace('models/', '');
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:embedContent?key=${apiKey}`;

        for (let i = 0; i < texts.length; i++) {
            const chunk = texts[i];

            try {
                // GenerativeModel allows direct embedContent but SDK is failing on 404
                // We fallback to manual REST call to bypass sdk bug with this specific model alias
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: `models/${targetModel}`,
                        content: { parts: [{ text: chunk }] }
                    })
                });

                if (!res.ok) {
                    const errPayload = await res.json().catch(() => ({}));
                    throw new Error(`GoogleGenerativeAIFetchError: REST Failed with ${res.status} ${res.statusText} ${JSON.stringify(errPayload)}`);
                }

                const result = await res.json();

                if (result.embedding && result.embedding.values) {
                    embeddings.push(result.embedding.values);
                } else {
                    throw new Error(`Invalid response format from Gemini: ${JSON.stringify(result)}`);
                }
            } catch (error: any) {
                throw error;
            }

            // Add delay between requests to avoid rate limits, except after the last item
            if (i < texts.length - 1 && this.requestDelay > 0) {
                await this.sleep(this.requestDelay);
            }
        }

        return embeddings;
    }
}
