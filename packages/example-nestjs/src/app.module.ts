import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RagModule } from '@rag-preset/nestjs';

@Module({
    imports: [
        RagModule.forRoot({
            preset: process.env.RAG_PROVIDER as any || 'claude',
            store: process.env.RAG_STORE as any || 'pgvector',
        })
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
