import { Command } from 'commander';
import { intro, outro, note, isCancel, cancel, confirm } from '@clack/prompts';
import fs from 'fs';
import path from 'path';
import pc from 'picocolors';

export const useCommand = new Command('use')
    .description('Change the current preset in rag.config.ts')
    .argument('<preset>', 'Preset to use (openai | claude | gemini)')
    .action(async (newPreset: string) => {
        intro(pc.bgBlue(pc.white(` ragkit use ${newPreset} `)));

        const configPath = path.join(process.cwd(), 'rag.config.ts');

        if (!fs.existsSync(configPath)) {
            cancel(`rag.config.ts not found. Run 'npx ragkit init' first.`);
            process.exit(1);
        }

        const validPresets = ['openai', 'claude', 'gemini'];
        if (!validPresets.includes(newPreset)) {
            cancel(`Invalid preset. Choose one of: ${validPresets.join(', ')}`);
            process.exit(1);
        }

        let content = fs.readFileSync(configPath, 'utf8');

        // Extract current preset (simple regex for MVP)
        const currentPresetMatch = content.match(/preset:\s*['"](.*?)['"]/);
        const currentPreset = currentPresetMatch ? currentPresetMatch[1] : 'unknown';

        if (currentPreset === newPreset) {
            outro(pc.green(`✓ Preset is already set to ${newPreset}.`));
            return;
        }

        const getDims = (p: string) => {
            if (p === 'openai') return 1536;
            if (p === 'claude') return 1024;
            if (p === 'gemini') return 768;
            return 0;
        };

        const currentDims = getDims(currentPreset);
        const newDims = getDims(newPreset);

        if (currentDims !== newDims) {
            note(
                pc.yellow(`Existing embeddings in your store are incompatible.\nYou will need to re-ingest your documents.`),
                pc.yellow(`⚠ Switching from ${currentPreset} (${currentDims} dims) to ${newPreset} (${newDims} dims)`)
            );

            const proceed = await confirm({
                message: 'Do you want to proceed?',
                initialValue: true
            });

            if (isCancel(proceed) || !proceed) {
                cancel('Operation cancelled.');
                process.exit(0);
            }
        }

        // Replace preset in file
        content = content.replace(/preset:\s*['"].*?['"]/, `preset: '${newPreset}'`);
        fs.writeFileSync(configPath, content, 'utf8');

        // Summarize
        let embedderStr = 'text-embedding-3-small';
        if (newPreset === 'claude') embedderStr = 'voyage-3';
        if (newPreset === 'gemini') embedderStr = 'gemini-embedding-001';

        const storeMatch = content.match(/store:\s*['"](.*?)['"]/);
        const storeStr = storeMatch ? storeMatch[1] : 'unknown';

        const summaryStr = `├ Preset:   ${newPreset} (${embedderStr}, ${newDims} dims)
├ Embedder: ${embedderStr}
└ Store:    ${storeStr}`;

        note(summaryStr, 'New pipeline summary:');
        outro(pc.green(`✓ Updated rag.config.ts successfully`));
    });
