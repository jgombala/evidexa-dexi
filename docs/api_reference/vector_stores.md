# Responses + Vector Stores (Dexi Reference)

Dexi uses the Responses API and Vector Stores. Assistants API is deprecated and not used.

## Naming strategy
Use one vector store per app + environment:
- `dexi-{app}-{env}` (e.g., `dexi-nexus-dev`, `dexi-clarity-prod`)
- Also maintain a common store: `dexi-common-{env}`

## Create a vector store
```ts
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const vectorStore = await openai.vectorStores.create({ name: 'dexi-nexus-dev' });
console.log(vectorStore.id);
```

## Ingest docs
```ts
const file = await openai.files.create({
  file: fs.createReadStream('docs/rag/guides/nexus-campaigns.md'),
  purpose: 'assistants',
});

await openai.vectorStores.fileBatches.create(vectorStore.id, {
  file_ids: [file.id],
});
```

## Search
```ts
const results = await openai.vectorStores.search(vectorStore.id, {
  query: 'How do I create a campaign?',
  max_results: 5,
  filter: { app: 'nexus' },
});
```

## Notes
- Use metadata filters (`app`, `domain`, `doc_type`) to scope results.
- Keep docs versioned in `docs/rag/` and re-run ingestion on change.
