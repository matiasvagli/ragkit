import { defineConfig } from 'ragkit';

export default defineConfig({
  preset: 'claude',
  store: 'pgvector',
  source: 'pdf',
});
