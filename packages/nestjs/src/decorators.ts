import { Inject } from '@nestjs/common';
import { RAG_PIPELINE_TOKEN } from './rag.module';

export function InjectRagPipeline() {
    return Inject(RAG_PIPELINE_TOKEN);
}
