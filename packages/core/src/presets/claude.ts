import { Preset } from './registry';

export const claudePreset: Preset = {
    name: 'claude',
    config: {
        chunkSize: 800,
        chunkOverlap: 100,
        embeddingModel: 'voyage-3',
        vectorDimensions: 1024,
    }
};
