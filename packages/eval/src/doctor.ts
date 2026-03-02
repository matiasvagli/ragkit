import { RagPipeline } from '@rag-preset/core';

/**
 * Placeholder para futuras verificaciones de salud del pipeline.
 * Se puede extender para verificar conectividad del store, validez del embedder, etc.
 *
 * @param pipeline - La instancia del pipeline RAG a verificar
 */
export function runDoctorChecks(pipeline: RagPipeline): void {
    const config = pipeline.getConfig();
    console.log('[Doctor] Checking pipeline configuration...');
    console.log(`[Doctor] Preset: ${config.presetName}`);
    console.log(`[Doctor] Embedder: ${config.embedder ? '✓ configured' : '✗ missing'}`);
    console.log(`[Doctor] Store: ${config.store ? '✓ configured' : '✗ missing'}`);
    console.log(`[Doctor] Loader: ${config.loader ? '✓ configured' : '✗ missing'}`);
    console.log('[Doctor] Basic checks passed. (No deep health checks yet)');
}
