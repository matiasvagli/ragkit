import { Retriever } from '@rag-preset/core';
import { EvalItem } from './dataset';
import { hitAtK, mrr, recallAtK } from './metrics';
import { EvalReport, EvalFailure, EvalResult } from './report';

export { EvalReport, EvalFailure, EvalResult };

export class EvalRunner {
    constructor(private retriever: Retriever) { }

    async run(dataset: EvalItem[], k: number): Promise<EvalReport> {
        const results: EvalResult[] = [];
        const failures: EvalFailure[] = [];

        for (const item of dataset) {
            const expectedDocIds = item.expected_doc_ids ?? [];
            const retrieved = await this.retriever.retrieve(item.question, k);
            const retrievedDocIds = retrieved.map((r) => r.docId);

            const hit = expectedDocIds.length > 0
                ? hitAtK(retrieved, expectedDocIds, k)
                : true; // sin expected_doc_ids, no se cuenta como failure

            const mrrScore = expectedDocIds.length > 0
                ? mrr(retrieved, expectedDocIds)
                : 0;

            const recall = expectedDocIds.length > 0
                ? recallAtK(retrieved, expectedDocIds, k)
                : 0;

            const result: EvalResult = {
                id: item.id,
                question: item.question,
                hit,
                mrr: mrrScore,
                recall,
                retrievedDocIds,
                expectedDocIds,
            };

            results.push(result);

            if (!hit && expectedDocIds.length > 0) {
                failures.push({
                    id: item.id,
                    question: item.question,
                    expectedDocIds,
                    retrievedDocIds,
                    mrr: mrrScore,
                    hit,
                });
            }
        }

        const itemsWithExpected = results.filter((r) => r.expectedDocIds.length > 0);
        const total = itemsWithExpected.length || results.length;
        const hitRate = itemsWithExpected.length > 0
            ? itemsWithExpected.filter((r) => r.hit).length / itemsWithExpected.length
            : 0;
        const meanMRR = itemsWithExpected.length > 0
            ? itemsWithExpected.reduce((acc, r) => acc + r.mrr, 0) / itemsWithExpected.length
            : 0;
        const meanRecall = itemsWithExpected.length > 0
            ? itemsWithExpected.reduce((acc, r) => acc + r.recall, 0) / itemsWithExpected.length
            : 0;

        return {
            summary: { total, hitRate, meanMRR, meanRecall },
            failures,
            results,
        };
    }
}
