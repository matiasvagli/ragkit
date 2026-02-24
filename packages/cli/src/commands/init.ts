import { Command } from 'commander';
import { intro, outro, select, confirm, text, isCancel, cancel, note } from '@clack/prompts';
import fs from 'fs';
import path from 'path';
import pc from 'picocolors';

export const initCommand = new Command('init')
    .description('Initialize rag.config.ts interactively')
    .action(async () => {
        intro(pc.bgBlue(pc.white(' ragkit init ')));

        const configPath = path.join(process.cwd(), 'rag.config.ts');

        if (fs.existsSync(configPath)) {
            const overwrite = await confirm({
                message: 'rag.config.ts already exists. Overwrite?',
                initialValue: false
            });
            if (isCancel(overwrite) || !overwrite) {
                cancel('Operation cancelled.');
                process.exit(0);
            }
        }

        const preset = await select({
            message: 'Which preset?',
            options: [
                { value: 'openai', label: 'openai (text-embedding-3-small, 1536 dims)' },
                { value: 'claude', label: 'claude (voyage-3, 1024 dims)' },
                { value: 'gemini', label: 'gemini (gemini-embedding-001, 768 dims)' }
            ]
        });

        if (isCancel(preset)) {
            cancel('Operation cancelled.');
            process.exit(0);
        }

        const store = await select({
            message: 'Which store?',
            options: [
                { value: 'pgvector', label: 'pgvector (PostgreSQL extension)' },
                { value: 'qdrant', label: 'qdrant (Dedicated Vector DB)' },
                { value: 'pinecone', label: 'pinecone (Managed Cloud DB)' }
            ]
        });

        if (isCancel(store)) {
            cancel('Operation cancelled.');
            process.exit(0);
        }

        const source = await select({
            message: 'Default source type?',
            options: [
                { value: 'pdf', label: 'pdf' },
                { value: 'docx', label: 'docx' },
                { value: 'txt', label: 'txt' },
                { value: 'url', label: 'url' }
            ]
        });

        if (isCancel(source)) {
            cancel('Operation cancelled.');
            process.exit(0);
        }

        const configContent = `import { defineConfig } from 'ragkit';

export default defineConfig({
  preset: '${preset}',
  store: '${store}',
  source: '${source}',
});
`;

        fs.writeFileSync(configPath, configContent, 'utf-8');

        // Summarize
        let presetDims = '1536 dims';
        let embedderStr = 'text-embedding-3-small';
        if (preset === 'claude') { presetDims = '1024 dims'; embedderStr = 'voyage-3'; }
        if (preset === 'gemini') { presetDims = '768 dims'; embedderStr = 'gemini-embedding-001'; }

        const summaryStr = `├ Preset:   ${preset} (${embedderStr}, ${presetDims})
├ Chunker:  recursive (size: 800-1000, overlap: 50-100)
├ Embedder: ${embedderStr}
└ Store:    ${store}`;

        note(summaryStr, 'Pipeline summary:');

        outro(pc.green('✓ Config generated: rag.config.ts'));
    });
