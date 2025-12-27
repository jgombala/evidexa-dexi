import { describe, it, expect } from 'vitest';
import { createToolRegistry } from '../src/tools/index.js';

type JsonSchema = Record<string, unknown>;

function isObjectSchema(schema: JsonSchema) {
  return schema.type === 'object' || typeof schema.properties === 'object';
}

function getObjectSchemas(schema: JsonSchema, path: string, issues: string[]) {
  if (!schema || typeof schema !== 'object') return;

  if (isObjectSchema(schema)) {
    const properties = (schema.properties ?? {}) as Record<string, unknown>;
    const required = schema.required as string[] | undefined;
    const additional = schema.additionalProperties;

    const keys = Object.keys(properties);
    if (keys.length > 0) {
      if (!Array.isArray(required)) {
        issues.push(`${path}.required must be an array including all properties`);
      } else {
        const missing = keys.filter((key) => !required.includes(key));
        if (missing.length) {
          issues.push(`${path}.required missing: ${missing.join(', ')}`);
        }
      }

      if (additional !== false) {
        issues.push(`${path}.additionalProperties must be false`);
      }
    }

    for (const [key, value] of Object.entries(properties)) {
      getObjectSchemas(value as JsonSchema, `${path}.properties.${key}`, issues);
    }
  }

  if (schema.items) {
    getObjectSchemas(schema.items as JsonSchema, `${path}.items`, issues);
  }
}

function validateStrictStructuredOutputs(schema: JsonSchema) {
  const issues: string[] = [];
  getObjectSchemas(schema, 'schema', issues);
  return issues;
}

describe('Tool schema strictness', () => {
  it('enforces strict structured output rules on tool input schemas', () => {
    const registry = createToolRegistry();
    const tools = registry.list();
    const failures: string[] = [];

    for (const tool of tools) {
      const issues = validateStrictStructuredOutputs(tool.inputSchema as JsonSchema);
      if (issues.length) {
        failures.push(`${tool.id}: ${issues.join(' | ')}`);
      }
    }

    expect(failures).toEqual([]);
  });
});
