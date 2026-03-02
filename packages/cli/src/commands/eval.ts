import { Command } from 'commander';
import { intro, outro, spinner, note } from '@clack/prompts';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import fs from 'fs';
import pc from 'picocolors';

import { globalPresetRegistry, RagPipeline } from '@rag-preset/core';
import { OpenAIEmbedder } from '@rag-preset/embedder-openai';
import { VoyageEmbedder } from '@rag-preset/embedder-voyage';
import { GeminiEmbedder } from '@rag-preset/embedder-gemini';
import { PgVectorStore } from '@rag-preset/store-pgvector';
import { QdrantStore } from '@rag-preset/store-qdrant';
import { PineconeStore } from '@rag-preset/store-pinecone';
import { PdfLoader } from '@rag-preset/loader-pdf';
import { EvalRunner, loadDataset } from '@rag-preset/eval';

export const evalCommand = new Command('eval')
    .description('Run retrieval evaluation against an evalset (YAML or JSON)')
    .option('-f, --file <path>', 'Path to the evalset file (.yml, .yaml or .json)', 'evalset.yml')
    .option('-k, --topk <number>', 'Number of results to retrieve per query', '5')
    .option('-c, --config <path>', 'Path to custom rag.config.ts')
    .action(async (options: { file: string; topk: string; config?: string }) => {
        dotenvConfig();
        intro(pc.bgBlue(pc.white(` ragkit eval `)));

        const k = parseInt(options.topk, 10);
        const evalsetPath = path.resolve(options.file);

        if (!fs.existsSync(evalsetPath)) {
            console.error(pc.red(`✗ Evalset file not found: ${evalsetPath}`));
            process.exit(1);
        }

        let presetName = process.env.RAG_PROVIDER || 'openai';
        let storeName = process.env.RAG_STORE || 'pgvector';

        const configPath = options.config
            ? path.resolve(options.config)
            : path.join(process.cwd(), 'rag.config.ts');

        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            const ptMatch = content.match(/preset:\s*['"](.+?)['"]/);
            if (ptMatch && !process.env.RAG_PROVIDER) presetName = ptMatch[1];
            const stMatch = content.match(/store:\s*['"](.+?)['"]/);
            if (stMatch && !process.env.RAG_STORE) storeName = stMatch[1];
        }

        const preset = globalPresetRegistry.get(presetName);

        // --- Embedder ---
        let embedder: any;
        if (presetName === 'claude') {
            embedder = new VoyageEmbedder({ model: preset.config.embeddingModel });
        } else if (presetName === 'gemini') {
            embedder = new GeminiEmbedder({ model: preset.config.embeddingModel });
        } else {
            embedder = new OpenAIEmbedder({ model: preset.config.embeddingModel });
        }

        // --- Store ---
        let store: any;
        if (storeName === 'qdrant') {
            store = new QdrantStore({ collectionName: 'documents', dimensions: preset.config.vectorDimensions });
        } else if (storeName === 'pinecone') {
            store = new PineconeStore({ indexName: 'default-index', dimensions: preset.config.vectorDimensions });
        } else {
            store = new PgVectorStore({
                connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rag',
                vectorDimensions: preset.config.vectorDimensions,
            });
        }

        const pipeline = new RagPipeline({
            presetName,
            loader: new PdfLoader({ filePath: '' }),  // loader no se usa en retrieval
            store,
            embedder,
        });

        const s = spinner();
        s.start(`Loading evalset from ${path.basename(evalsetPath)}...`);

        let dataset: ReturnType<typeof loadDataset>;
        try {
            dataset = loadDataset(evalsetPath);
            s.stop(pc.green(`✓ Loaded ${dataset.length} eval items`));
        } catch (err: any) {
            s.stop(pc.red('✗ Failed to load evalset'));
            console.error(pc.red(err.message));
            process.exit(1);
        }

        const s2 = spinner();
        s2.start(`Connecting to ${storeName}...`);

        try {
            if (typeof store.init === 'function') await store.init();
            s2.stop(pc.green(`✓ Connected to ${storeName}`));
        } catch (err: any) {
            s2.stop(pc.red(`✗ Could not connect to ${storeName}`));
            console.error(pc.red(err.message));
            process.exit(1);
        }

        const s3 = spinner();
        s3.start(`Running evaluation (k=${k}) on ${dataset.length} queries...`);

        try {
            const retriever = pipeline.getRetriever();
            const runner = new EvalRunner(retriever);
            const report = await runner.run(dataset, k);
            s3.stop(pc.green(`✓ Evaluation complete`));

            // --- Print summary ---
            const hitPct = (report.summary.hitRate * 100).toFixed(1);
            const mrrVal = report.summary.meanMRR.toFixed(2);
            const recallPct = (report.summary.meanRecall * 100).toFixed(1);

            const summaryText = [
                `${pc.green('✔')} Total queries : ${report.summary.total}`,
                `${pc.green('✔')} Hit@${k}        : ${hitPct}%`,
                `${pc.green('✔')} Mean MRR      : ${mrrVal}`,
                `${pc.green('✔')} Mean Recall@${k}: ${recallPct}%`,
            ].join('\n');

            note(summaryText, 'Retrieval Metrics');

            if (report.failures.length > 0) {
                console.log(pc.yellow(`\nFailures (${report.failures.length}):`));
                for (const f of report.failures) {
                    const expected = f.expectedDocIds.join(', ') || '(none)';
                    const got = f.retrievedDocIds.slice(0, 3).join(', ') || '(none)';
                    console.log(`  ${pc.red('–')} ${pc.bold(f.id)} → no expected doc found in top ${k}`);
                    console.log(`    Expected : ${expected}`);
                    console.log(`    Got top3 : ${got}`);
                }
            } else {
                console.log(pc.green('\n✔ No failures — all queries hit at least one expected document!'));
            }

            outro(pc.green(`✔ Done`));
        } catch (err: any) {
            s3.stop(pc.red('✗ Evaluation failed'));
            console.error(pc.red(`Error: ${err.message || err}`));
        } finally {
            if (typeof store.close === 'function') await store.close();
        }
    });
