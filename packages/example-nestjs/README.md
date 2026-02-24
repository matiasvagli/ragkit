# ragkit — Ejemplo NestJS

Aplicación mínima de NestJS que muestra cómo integrar `ragkit` en un proyecto real.
El objetivo es demostrar que cambiar de proveedor de AI no requiere modificar ninguna línea de código — solo la variable de entorno.

---

## Setup

**1. Configurar variables de entorno**

```bash
cp .env.example .env
# Editá .env con tus API keys y la conexión a la base de datos
```

**2. Instalar dependencias**

```bash
npm install
```

**3. Levantar el servidor**

```bash
npm run start:dev
# Servidor corriendo en http://localhost:3000
```

---

## Endpoints

### `GET /status`

Devuelve la configuración activa del pipeline.

```bash
curl http://localhost:3000/status
```

```json
{
  "preset": "claude",
  "embedder": "VoyageEmbedder",
  "dims": 1024,
  "chunker": "none",
  "store": "PgVectorStore"
}
```

### `POST /ingest`

Corre el pipeline completo sobre un archivo o URL.

```bash
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d '{"filePath": "../cli/dummy.pdf"}'
```

```json
{ "success": true, "message": "Pipeline ran successfully on ../cli/dummy.pdf" }
```

### `POST /switch/:preset`

Placeholder para demostrar el cambio de preset en runtime (MVP).
Para cambiar de proveedor de forma real, cambiá `RAG_PROVIDER` en `.env` y reiniciá el servidor.

```bash
curl -X POST http://localhost:3000/switch/openai
```

---

## Cómo validar el cambio de proveedor

Este es el objetivo central de ragkit: **cambiar de proveedor sin modificar código**.

**Con Claude:**
```env
RAG_PROVIDER=claude
VOYAGE_API_KEY=tu-key
```
```bash
npm run start:dev
curl http://localhost:3000/status
# → "preset": "claude", "embedder": "VoyageEmbedder", "dims": 1024
```

**Con OpenAI:**
```env
RAG_PROVIDER=openai
OPENAI_API_KEY=tu-key
```
```bash
npm run start:dev
curl http://localhost:3000/status
# → "preset": "openai", "embedder": "OpenAIEmbedder", "dims": 1536
```

**Con Gemini:**
```env
RAG_PROVIDER=gemini
GEMINI_API_KEY=tu-key
```
```bash
npm run start:dev
curl http://localhost:3000/status
# → "preset": "gemini", "embedder": "GeminiEmbedder", "dims": 768
```

Sin cambiar una sola línea de código TypeScript. Solo el `.env`.

---

## Variables de entorno disponibles

```env
RAG_PROVIDER=claude          # openai | claude | gemini
RAG_STORE=pgvector           # pgvector | qdrant | pinecone

OPENAI_API_KEY=sk-...
VOYAGE_API_KEY=pa-...
GEMINI_API_KEY=AIza...

DATABASE_URL=postgresql://localhost:5432/ragkit
QDRANT_URL=http://localhost:6333
PINECONE_API_KEY=...
```
