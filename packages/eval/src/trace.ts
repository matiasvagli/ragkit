import { Retriever } from '@rag-preset/core';

/**
 * Trace mode: imprime los top-K resultados de un retriever para una query dada.
 * Útil para inspección manual de la calidad del retrieval.
 */
export async function trace(query: string, retriever: Retriever, k: number): Promise<void> {
    console.log(`\n🔍 Query: "${query}"`);
    console.log(`   Top ${k} results:\n`);

    const results = await retriever.retrieve(query, k);

    if (results.length === 0) {
        console.log('   (No results returned)');
        return;
    }

    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const preview = r.text.slice(0, 200).replace(/\n/g, ' ');
        const previewStr = r.text.length > 200 ? `${preview}...` : preview;

        console.log(`   ─── Rank ${i + 1} ─────────────────────────────────`);
        console.log(`   Score   : ${r.score.toFixed(4)}`);
        console.log(`   DocId   : ${r.docId}`);
        console.log(`   ChunkId : ${r.chunkId}`);
        console.log(`   Preview : ${previewStr}`);
        console.log('');
    }
}
