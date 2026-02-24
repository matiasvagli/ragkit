import { ChunkerAdapter, EmbedderAdapter, LoaderAdapter, SanitizerAdapter, StoreAdapter } from '../interfaces';

export interface PresetConfig {
    chunkSize: number;
    chunkOverlap: number;
    embeddingModel: string;
    vectorDimensions: number;
}

export interface Preset {
    name: string;
    config: PresetConfig;
    getChunker?: () => ChunkerAdapter;
    getEmbedder?: () => EmbedderAdapter;
    getSanitizer?: () => SanitizerAdapter;
    notes?: string;
}

export class PresetRegistry {
    private presets: Map<string, Preset> = new Map();

    register(preset: Preset): void {
        this.presets.set(preset.name, preset);
    }

    get(name: string): Preset {
        const preset = this.presets.get(name);
        if (!preset) {
            throw new Error(`Preset '${name}' not found.`);
        }
        return preset;
    }
}

export const globalPresetRegistry = new PresetRegistry();
