# ragkit

> Pipeline de ingesta RAG autoconfigurable para NestJS/Node.js.

Elegís un preset, el pipeline se configura solo. Cambiar de proveedor de IA es cambiar una variable de entorno — sin tocar código.

---

## ¿Qué problema resuelve?

Cada modelo de IA tiene parámetros óptimos distintos para RAG: chunk size, overlap, modelo de embeddings, dimensiones del vector. Hoy los developers los configuran a mano cada vez, sin saber si están usando valores correctos.

**ragkit** resuelve esto: declarás el proveedor y el pipeline se autoconfigura.

```
RAG_PROVIDER=openai  →  chunk 1000, text-embedding-3-small, 1536 dims
RAG_PROVIDER=claude  →  chunk 800,  voyage-3,               1024 dims
RAG_PROVIDER=gemini  →  chunk 800,  gemini-embedding-001,   768 dims
```

---

## Pipeline

```
Documento → Loader → Chunker → Embedder → VectorStore
```

Cada paso es un adapter intercambiable. El preset define los parámetros óptimos de forma automática.

---

## Proveedores de Embedding

| Preset   | Embedder               | Chunk | Overlap | Dims | API Key           |
|----------|------------------------|-------|---------|------|-------------------|
| `openai` | text-embedding-3-small | 1000  | 200     | 1536 | `OPENAI_API_KEY`  |
| `claude` | voyage-3               | 800   | 100     | 1024 | `VOYAGE_API_KEY`  |
| `gemini` | gemini-embedding-001   | 800   | 80      | 768  | `GEMINI_API_KEY`  |

> ⚠️ Claude no tiene embeddings propios — el preset `claude` usa **Voyage AI** por recomendación de Anthropic. Free tier en [voyageai.com](https://voyageai.com).

## Stores soportados

| Store      | Tipo            | Variable de entorno | Ideal para                         |
|------------|-----------------|---------------------|------------------------------------|
| `pgvector` | Extensión de PG | `DATABASE_URL`      | Ya tenés Postgres, proyectos simples |
| `qdrant`   | Vector DB       | `QDRANT_URL`        | Performance, self-hosted con Docker |
| `pinecone` | Cloud managed   | `PINECONE_API_KEY`  | Producción sin infraestructura      |

---

## CLI: ragkit

El CLI interactivo para inicializar y gestionar pipelines RAG desde la terminal.

### Instalación

```bash
# En el monorepo (dev)
cd packages/cli && npm run build
node dist/cli.js <command>

# O globalmente (cuando se publique a npm)
npm install -g ragkit
```

### Comandos

#### `ragkit init`

Wizard interactivo que genera `rag.config.ts` en el proyecto.

```
$ ragkit init

┌  ragkit init
│
◆  Which preset?
│  ○ openai (text-embedding-3-small, 1536 dims)
│  ● claude (voyage-3, 1024 dims)
│  ○ gemini (gemini-embedding-001, 768 dims)
│
◆  Which store?
│  ● pgvector (PostgreSQL extension)
│  ○ qdrant (Dedicated Vector DB)
│  ○ pinecone (Managed Cloud DB)
│
◇  Pipeline summary: ─────────────────────────────────╮
│                                                     │
│  ├ Preset:   claude (voyage-3, 1024 dims)           │
│  ├ Embedder: voyage-3                               │
│  └ Store:    pgvector                               │
│                                                     │
└  ✓ Config generated: rag.config.ts
```

Genera el archivo:

```typescript
// rag.config.ts
import { defineConfig } from 'ragkit';

export default defineConfig({
  preset: 'claude',
  store: 'pgvector',
  source: 'pdf',
});
```

---

#### `ragkit use <preset>`

Cambia el preset en `rag.config.ts`. Si las dimensiones cambian, muestra una advertencia:

```
$ ragkit use openai

◇  ⚠ Switching from claude (1024 dims) to openai (1536 dims) ──╮
│                                                               │
│  Existing embeddings in your store are incompatible.         │
│  You will need to re-ingest your documents.                  │
│                                                              │
◆  Do you want to proceed?
│  ● Yes / ○ No

└  ✓ Updated rag.config.ts successfully
```

---

#### `ragkit ingest <filepath>`

Corre el pipeline completo con spinners en tiempo real:

```
$ ragkit ingest ./informe.pdf

┌  ragkit ingest
│
◇  ✓ Loaded document (24,012 chars)
◇  ✓ Chunked → 31 chunks (size: 800, overlap: 80)
◇  ✓ Embedded → 31/31 chunks (gemini-embedding-001)
◇  ✓ Stored successfully in pgvector
│
└  🚀 Ingestion complete!
```

Soporta auto-detección de formato:

```bash
ragkit ingest ./doc.pdf         # → PdfLoader
ragkit ingest ./doc.docx        # → DocxLoader
ragkit ingest ./notas.txt       # → TxtLoader
ragkit ingest https://...       # → UrlLoader
```

Mensajes de error amigables:

```
✗ VOYAGE_API_KEY is not set. Get yours at voyageai.com
✗ Could not connect to pgvector. Is PostgreSQL running?
✗ File not found: ./doc.pdf
```

---

#### `ragkit status`

Muestra configuración activa y verifica conectividad:

```
$ ragkit status

◇  Configuration: ─────────────────────────────────╮
│                                                  │
│  Preset:   gemini                                │
│  Embedder: gemini-embedding-001 (768 dims)       │
│  Chunker:  recursive (size: 800 / overlap: 80)   │
│  Store:    pgvector                              │
│                                                  │
◇  Infrastructure Health: ──────────────────────────╮
│                                                  │
│  API Key:  ✓ GEMINI_API_KEY is set               │
│  Store:    ✓ pgvector reachable                  │
│                                                  │
└  Done.
```

---

## Variables de entorno

```env
# Preset y store
RAG_PROVIDER=gemini          # openai | claude | gemini
RAG_STORE=pgvector           # pgvector | qdrant | pinecone

# API Keys (solo la del proveedor que uses)
OPENAI_API_KEY=sk-...
VOYAGE_API_KEY=pa-...
GEMINI_API_KEY=AIza...

# Bases de datos
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rag
QDRANT_URL=http://localhost:6333
PINECONE_API_KEY=...
```

Las variables de entorno **siempre sobreescriben** el archivo `rag.config.ts`. Esto permite un mismo codebase con distintos proveedores por entorno (dev, staging, prod).

---

## Integración con NestJS

```typescript
// app.module.ts
import { RagModule } from '@rag-preset/nestjs';

@Module({
  imports: [
    RagModule.forRoot({
      preset: 'claude',   // sobreescrito por RAG_PROVIDER si está definido
      store: 'pgvector',  // sobreescrito por RAG_STORE si está definido
    })
  ]
})
export class AppModule {}
```

```typescript
// app.service.ts
import { InjectRagPipeline, RagPipeline } from '@rag-preset/nestjs';

@Injectable()
export class AppService {
  constructor(@InjectRagPipeline() private pipeline: RagPipeline) {}

  async ingestFile(filePath: string) {
    this.pipeline.getConfig().loader = new PdfLoader({ filePath });
    await this.pipeline.run();
  }
}
```

Ver el ejemplo completo en [`packages/example-nestjs`](./packages/example-nestjs/README.md).

---

## ⚠️ Modelos disponibles por región / API Key

Los modelos de embedding varían según tu cuenta y región. Si el modelo configurado en el preset no está disponible en tu key, verás un error `404 Not Found`.

Para listar los modelos disponibles en tu cuenta de **Gemini**:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=TU_KEY" \
  | jq '.models[] | select(.supportedGenerationMethods | contains(["embedContent"])) | .name'
```

Para cambiar el modelo, editá el preset en `packages/core/src/presets/gemini.ts`.

---

## Arquitectura del monorepo

```
packages/
  core/               ← pipeline engine, interfaces, presets, batching
  embedders/
    openai/           ← @rag-preset/embedder-openai
    voyage/           ← @rag-preset/embedder-voyage (para claude)
    gemini/           ← @rag-preset/embedder-gemini
  loaders/
    pdf/              ← @rag-preset/loader-pdf
    docx/             ← @rag-preset/loader-docx
    txt/              ← @rag-preset/loader-txt
    url/              ← @rag-preset/loader-url
  stores/
    pgvector/         ← @rag-preset/store-pgvector
    qdrant/           ← @rag-preset/store-qdrant
    pinecone/         ← @rag-preset/store-pinecone
  nestjs/             ← RagModule.forRoot() + @InjectRagPipeline
  cli/                ← ragkit CLI (init, use, ingest, status)
  example-nestjs/     ← app de ejemplo con endpoints REST
```
