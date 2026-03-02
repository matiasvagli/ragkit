import fs from 'fs';
import yaml from 'js-yaml';

export interface EvalItem {
    id: string;
    question: string;
    expected_doc_ids?: string[];
    expected_chunk_ids?: string[];
    must_include?: string[];
    tags?: string[];
}

/**
 * Carga un evalset desde un archivo YAML o JSON.
 * Soporta la estructura definida en EvalItem.
 */
export function loadDataset(filePath: string): EvalItem[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = filePath.toLowerCase();

    let raw: unknown;
    if (ext.endsWith('.yaml') || ext.endsWith('.yml')) {
        raw = yaml.load(content);
    } else if (ext.endsWith('.json')) {
        raw = JSON.parse(content);
    } else {
        throw new Error(`Unsupported dataset format. Use .yaml, .yml or .json`);
    }

    if (!Array.isArray(raw)) {
        throw new Error(`Dataset must be an array of EvalItem objects`);
    }

    return raw as EvalItem[];
}
