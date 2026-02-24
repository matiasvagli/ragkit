import { Preset } from './registry';

export const geminiPreset: Preset = {
    name: 'gemini',
    config: {
        chunkSize: 800,
        chunkOverlap: 80,
        embeddingModel: 'gemini-embedding-001',
        vectorDimensions: 768,
    },
    notes: 'Great for multilingual content. Uses Google AI Studio API.'
};
