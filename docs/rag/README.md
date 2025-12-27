# Dexi RAG Docs (Source of Truth)

This folder is the MVP source of truth for Dexi documentation ingestion. All documents here are versioned with the codebase and are the first datasets indexed by the RAG pipeline.

## Structure
- `docs/rag/guides/`: how-to workflows (Nexus Console first)
- `docs/rag/reference/`: APIs, tool behavior, and glossary
- `docs/rag/policies/`: RBAC, compliance, and data handling
- `docs/rag/ux/`: UI navigation and step-by-step flows

## Ingestion Sketch (MVP)
1. Collect markdown files under `docs/rag/**`.
2. Normalize content (strip front-matter, remove nav, keep headings).
3. Chunk by heading with overlap (e.g., 800-1200 tokens, 10-15% overlap).
4. Upload docs to OpenAI Vector Stores with metadata where available.
5. Retrieval uses the OpenAI Vector Stores search endpoint with filters (e.g., `app=nexus`).
7. Return top-k chunks with citations (file path + section anchor).

## MVP Scripts
- `npm run ingest:rag` uploads `docs/rag/` content to OpenAI Vector Stores.

## Configuration
- Set `OPENAI_VECTOR_STORE_ID` in `.env` to the target vector store.
- If unset, the ingestion script will create a new vector store and print the ID.
- Store naming defaults to `{OPENAI_VECTOR_STORE_NAME}-{DEXI_APP_ID}-{NODE_ENV}`.
- Use `OPENAI_VECTOR_STORE_ID_COMMON` plus per-app IDs for common + app-scoped retrieval.
- Set `DEXI_RAG_COMMON=1` to ingest docs into the common store.
- Set `DEXI_RAG_RESET=1` to delete and recreate the target store before ingestion.

## Authoring Guidance
- Keep headings meaningful; they become chunk boundaries.
- Use short paragraphs and lists for retrieval quality.
- Include explicit steps (1/2/3) in workflows.

## Front Matter (Optional)
You can add YAML front matter to set `title` and `app`:
```yaml
---
title: "Create Campaign"
app: "nexus"
---
```

## Placeholder Files
Add initial markdown files under the folders above as content emerges.
