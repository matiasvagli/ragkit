import { Preset } from './registry';

// Note: the user must provide the embedder adapter (or the core could dynamically require it later, but interfaces are cleaner)
export const openAiPreset: Preset = {
    name: 'openai',
    config: {
        chunkSize: 1000,
        chunkOverlap: 200,
        embeddingModel: 'text-embedding-3-small',
        vectorDimensions: 1536,
    }
};
