import { RetrievedChunk } from '@rag-preset/core';

/**
 * Hit@K: verifica si al menos uno de los expected_doc_ids aparece en los primeros K resultados.
 */
export function hitAtK(results: RetrievedChunk[], expectedDocIds: string[], k: number): boolean {
    const topK = results.slice(0, k);
    return topK.some((r) => expectedDocIds.includes(r.docId));
}

/**
 * MRR (Mean Reciprocal Rank): retorna el recíproco del rank del primer hit.
 * Retorna 0 si no hay ningún hit.
 */
export function mrr(results: RetrievedChunk[], expectedDocIds: string[]): number {
    for (let i = 0; i < results.length; i++) {
        if (expectedDocIds.includes(results[i].docId)) {
            return 1 / (i + 1);
        }
    }
    return 0;
}

/**
 * Recall@K: proporción de expected_doc_ids encontrados en los primeros K resultados.
 * Retorna 0 si expectedDocIds está vacío.
 */
export function recallAtK(results: RetrievedChunk[], expectedDocIds: string[], k: number): number {
    if (expectedDocIds.length === 0) return 0;
    const topK = results.slice(0, k);
    const topKDocIds = new Set(topK.map((r) => r.docId));
    const found = expectedDocIds.filter((id) => topKDocIds.has(id)).length;
    return found / expectedDocIds.length;
}
