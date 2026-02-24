import { DynamicModule, Module, Provider, Global } from '@nestjs/common';
import { RagPipeline, globalPresetRegistry } from '@rag-preset/core';
import { OpenAIEmbedder } from '@rag-preset/embedder-openai';
import { VoyageEmbedder } from '@rag-preset/embedder-voyage';
import { GeminiEmbedder } from '@rag-preset/embedder-gemini';
import { PgVectorStore } from '@rag-preset/store-pgvector';
import { QdrantStore } from '@rag-preset/store-qdrant';
import { PineconeStore } from '@rag-preset/store-pinecone';
import { PdfLoader } from '@rag-preset/loader-pdf';

export interface RagModuleOptions {
    preset?: string;
    store?: string;
}

export const RAG_PIPELINE_TOKEN = 'RAG_PIPELINE_TOKEN';

@Global()
@Module({})
export class RagModule {
    static forRoot(options: RagModuleOptions): DynamicModule {
        const presetName = process.env.RAG_PROVIDER || options.preset || 'openai';
        const storeName = process.env.RAG_STORE || options.store || 'pgvector';

        const pipelineProvider: Provider = {
            provide: RAG_PIPELINE_TOKEN,
            useFactory: () => {
                const preset = globalPresetRegistry.get(presetName);

                let embedder;
                if (presetName === 'claude') {
                    embedder = new VoyageEmbedder({ model: preset.config.embeddingModel });
                } else if (presetName === 'gemini') {
                    embedder = new GeminiEmbedder({ model: preset.config.embeddingModel });
                } else {
                    embedder = new OpenAIEmbedder({ model: preset.config.embeddingModel });
                }

                let store;
                if (storeName === 'qdrant') {
                    store = new QdrantStore({ collectionName: 'documents', dimensions: preset.config.vectorDimensions });
                } else if (storeName === 'pinecone') {
                    store = new PineconeStore({ indexName: 'default', dimensions: preset.config.vectorDimensions });
                } else {
                    store = new PgVectorStore({
                        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/rag',
                        vectorDimensions: preset.config.vectorDimensions
                    });
                }

                const finalOptions = {
                    presetName,
                    embedder,
                    store,
                    loader: new PdfLoader({ filePath: '' }) // dummy default, to be overridden
                };

                return new RagPipeline(finalOptions, globalPresetRegistry);
            },
        };

        return {
            module: RagModule,
            providers: [pipelineProvider],
            exports: [pipelineProvider],
        };
    }
}
