#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { useCommand } from './commands/use.js';
import { ingestCommand } from './commands/ingest.js';
import { statusCommand } from './commands/status.js';
import { traceCommand } from './commands/trace.js';
import { evalCommand } from './commands/eval.js';

const program = new Command();

program
    .name('ragkit')
    .description('CLI to automate RAG pipeline configuration and ingestion')
    .version('0.1.0');

// Register commands
program.addCommand(initCommand);
program.addCommand(useCommand);
program.addCommand(ingestCommand);
program.addCommand(statusCommand);
program.addCommand(traceCommand);
program.addCommand(evalCommand);

program.parse(process.argv);

