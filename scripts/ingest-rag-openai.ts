import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import yaml from 'js-yaml';
import { config } from '../src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

function stripFrontMatter(content: string) {
  if (!content.startsWith('---')) return { meta: {}, body: content };
  const end = content.indexOf('---', 3);
  if (end === -1) return { meta: {}, body: content };
  const raw = content.slice(3, end).trim();
  const meta = (yaml.load(raw) as Record<string, unknown>) ?? {};
  const body = content.slice(end + 3).trim();
  return { meta, body };
}

async function listMarkdownFiles(root: string) {
  const entries = await fs.promises.readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function getAppStoreId(app: string) {
  const map: Record<string, string> = {
    common: config.openaiVectorStoreIdCommon,
    nexus: config.openaiVectorStoreIdNexus,
    clarity: config.openaiVectorStoreIdClarity,
    mosaic: config.openaiVectorStoreIdMosaic,
  };
  return map[app] || config.openaiVectorStoreId;
}

async function ingest() {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  const openai = new OpenAI({ apiKey: config.openaiApiKey });
  const env = process.env.NODE_ENV ?? 'development';
  const app = process.env.DEXI_APP_ID ?? 'nexus';
  const useCommon = process.env.DEXI_RAG_COMMON === '1';
  const resetStore = process.env.DEXI_RAG_RESET === '1';

  let vectorStoreId = getAppStoreId(useCommon ? 'common' : app);

  if (vectorStoreId) {
    console.log(`Using vector store: ${vectorStoreId}`);
  }

  if (vectorStoreId && resetStore) {
    console.log(`Reset enabled. Deleting vector store: ${vectorStoreId}`);
    await openai.vectorStores.delete(vectorStoreId);
    vectorStoreId = '';
  }

  if (!vectorStoreId) {
    const vectorStore = await openai.vectorStores.create({
      name: `${config.openaiVectorStoreName}-${useCommon ? 'common' : app}-${env}`,
    });
    vectorStoreId = vectorStore.id;
    console.log(`Created vector store: ${vectorStoreId}`);
    console.log('Set OPENAI_VECTOR_STORE_ID_* to reuse this store in future runs.');
  }

  const ragRoot = path.resolve(__dirname, '..', 'docs', 'rag');
  const files = await listMarkdownFiles(ragRoot);

  for (const filePath of files) {
    if (filePath.endsWith(path.join('docs', 'rag', 'README.md'))) {
      continue;
    }
    const content = await fs.promises.readFile(filePath, 'utf8');
    const { meta, body } = stripFrontMatter(content);
    const docApp = (meta.app as string | undefined)?.toLowerCase() ?? 'common';

    if (useCommon && docApp !== 'common') {
      continue;
    }

    if (!useCommon && docApp !== app) {
      continue;
    }
    const fileName = path.basename(filePath);

    const tempPath = path.join(process.cwd(), '.tmp-rag-upload.md');
    const header = `---\n${yaml.dump(meta)}---\n`;
    await fs.promises.writeFile(tempPath, `${header}\n${body}`);

    const uploaded = await openai.files.create({
      file: fs.createReadStream(tempPath),
      purpose: 'assistants',
    });

    await openai.vectorStores.fileBatches.create(vectorStoreId, {
      file_ids: [uploaded.id],
    });

    console.log(`Uploaded ${fileName} to vector store ${vectorStoreId}`);
    await fs.promises.unlink(tempPath);
  }
}

ingest().catch((error) => {
  console.error(error);
  process.exit(1);
});
