import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import Handlebars from 'handlebars';
import chokidar from 'chokidar';
import Ajv from 'ajv/dist/ajv.js';
import type { PromptTemplate } from './promptTypes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PromptManager {
  private prompts = new Map<string, PromptTemplate>();
  private compiled = new Map<string, HandlebarsTemplateDelegate>();
  private validator = new (Ajv as unknown as new (...args: any[]) => any)();
  private watcher?: chokidar.FSWatcher;

  constructor(private configPath: string, hotReload = false) {
    this.registerHelpers();
    this.loadAll();

    if (hotReload && process.env.NODE_ENV === 'development') {
      this.enableHotReload();
    }
  }

  private registerHelpers() {
    Handlebars.registerHelper('join', (array: any[], separator: string) => array.join(separator));
  }

  private schema() {
    return {
      type: 'object',
      required: ['version', 'description', 'model', 'domain', 'instructions', 'input', 'variables'],
      properties: {
        version: { type: 'string', pattern: '^\\d+\\.\\d+$' },
        description: { type: 'string', minLength: 5 },
        model: { type: 'string' },
        domain: { type: 'string' },
        instructions: { type: 'string', minLength: 20 },
        input: { type: 'string', minLength: 1 },
        variables: { type: 'array' },
        model_settings: {
          type: 'object',
          properties: {
            reasoning: {
              type: 'object',
              properties: {
                effort: { type: ['string', 'null'] },
                summary: { type: ['string', 'null'] },
              },
              additionalProperties: true,
            },
            text: {
              type: 'object',
              properties: {
                verbosity: { type: ['string', 'null'] },
              },
              additionalProperties: true,
            },
            provider_data: {
              type: 'object',
              properties: {
                prompt_cache_key: { type: 'string' },
                prompt_cache_retention: { type: 'string' },
              },
              additionalProperties: true,
            },
          },
          additionalProperties: true,
        },
      },
    };
  }

  private loadAll() {
    if (!fs.existsSync(this.configPath)) {
      return;
    }
    const files = fs.readdirSync(this.configPath).filter((f) => f.endsWith('.yaml'));
    for (const file of files) {
      this.loadPrompt(path.basename(file, '.yaml'), path.join(this.configPath, file));
    }
  }

  private loadPrompt(name: string, filePath: string) {
    const content = fs.readFileSync(filePath, 'utf8');
    const prompt = yaml.load(content) as PromptTemplate;
    const validate = this.validator.compile(this.schema());
    if (!validate(prompt)) {
      throw new Error(`Invalid prompt schema for ${name}: ${JSON.stringify(validate.errors)}`);
    }
    this.prompts.set(name, prompt);
    this.compiled.set(name, Handlebars.compile(prompt.input));
  }

  private enableHotReload() {
    this.watcher = chokidar.watch(this.configPath, { persistent: true });
    this.watcher.on('change', (filePath) => {
      try {
        const name = path.basename(filePath, '.yaml');
        this.loadPrompt(name, filePath);
      } catch (error) {
        console.error(`Failed to reload prompt: ${error}`);
      }
    });
  }

  getPrompt(name: string) {
    return this.prompts.get(name);
  }

  listPromptNames() {
    return Array.from(this.prompts.keys());
  }

  renderInput(name: string, variables: Record<string, unknown>) {
    const template = this.compiled.get(name);
    if (!template) {
      throw new Error(`Prompt not found: ${name}`);
    }
    return template(variables);
  }

  close() {
    this.watcher?.close();
  }
}

export const promptManager = new PromptManager(
  process.env.PROMPT_CONFIG_PATH || path.join(__dirname, '../../config/prompts'),
  process.env.PROMPT_HOT_RELOAD === '1'
);
