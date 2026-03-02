export interface EvalSummary {
    total: number;
    hitRate: number;
    meanMRR: number;
    meanRecall: number;
}

export interface EvalFailure {
    id: string;
    question: string;
    expectedDocIds: string[];
    retrievedDocIds: string[];
    mrr: number;
    hit: boolean;
}

export interface EvalReport {
    summary: EvalSummary;
    failures: EvalFailure[];
    results: EvalResult[];
}

export interface EvalResult {
    id: string;
    question: string;
    hit: boolean;
    mrr: number;
    recall: number;
    retrievedDocIds: string[];
    expectedDocIds: string[];
}
