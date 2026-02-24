import { StoreAdapter } from '../interfaces';
import { Preset } from '../presets/registry';

// A factory function that initializes a StoreAdapter.
// In practice, this takes a Preset so the store can extract dimensions 
// and dynamic configuration if needed.
export type StoreFactory = (preset: Preset) => StoreAdapter;

export class StoreRegistry {
    private factories: Map<string, StoreFactory> = new Map();

    register(name: string, factory: StoreFactory): void {
        this.factories.set(name, factory);
    }

    get(name: string, preset: Preset): StoreAdapter {
        const factory = this.factories.get(name);
        if (!factory) {
            throw new Error(`Store adapter '${name}' not found.`);
        }
        return factory(preset);
    }
}

export const globalStoreRegistry = new StoreRegistry();
