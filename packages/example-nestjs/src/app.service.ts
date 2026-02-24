import { Injectable } from '@nestjs/common';
import { InjectRagPipeline, RagPipeline } from '@rag-preset/nestjs';
import { PdfLoader } from '@rag-preset/loader-pdf';

@Injectable()
export class AppService {
    constructor(
        @InjectRagPipeline() private readonly pipeline: RagPipeline
    ) { }

    async ingestFile(filePath: string) {
        // Override the loader dynamically if needed, 
        // but the RagPipeline from the module injection contains preset config.
        this.pipeline.getConfig().loader = new PdfLoader({ filePath });
        await this.pipeline.run(); // Single async call
    }

    getStatus() {
        const config = this.pipeline.getConfig();
        return {
            preset: config.presetName,
            embedder: config.embedder.constructor.name,
            dims: (config.store as any).dimensions || 768, // fallback illustrative 
            chunker: config.chunker?.constructor.name || 'none',
            store: config.store.constructor.name
        };
    }

    switchPreset(preset: string) {
        // Simulating runtime override
        // Note: the correct way is overriding config or re-instantiating the pipeline dynamically in larger apps.
        // For MVP, we'll reload it in a mock way or assume env controls the boot.
        return { status: 'Restart server changing RAG_PROVIDER to see effect', target: preset };
    }
}
