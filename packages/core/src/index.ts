export * from './interfaces';
export * from './presets/registry';
export * from './presets/openai';
export * from './presets/claude';
export * from './presets/gemini';
export * from './pipeline/engine';
export * from './stores/registry';

import { globalPresetRegistry } from './presets/registry';
import { openAiPreset } from './presets/openai';
import { claudePreset } from './presets/claude';
import { geminiPreset } from './presets/gemini';

globalPresetRegistry.register(openAiPreset);
globalPresetRegistry.register(claudePreset);
globalPresetRegistry.register(geminiPreset);
