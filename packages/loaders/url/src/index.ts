import { v4 as uuidv4 } from 'uuid';
import { Document, LoaderAdapter } from '@rag-preset/core';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface UrlLoaderConfig {
    url: string;
}

export class UrlLoader implements LoaderAdapter {
    private url: string;

    constructor(config: UrlLoaderConfig) {
        this.url = config.url;
    }

    async load(): Promise<Document[]> {
        const response = await fetch(this.url);
        if (!response.ok) {
            throw new Error(`Failed to fetch URL ${this.url}: ${response.statusText}`);
        }

        const html = await response.text();
        const dom = new JSDOM(html, { url: this.url });

        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        const doc: Document = {
            id: uuidv4(),
            content: article?.textContent || html,
            metadata: {
                source: this.url,
                title: article?.title,
                byline: article?.byline,
            },
        };

        return [doc];
    }
}
