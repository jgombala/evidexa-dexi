import fs from 'node:fs';
import yaml from 'js-yaml';

const filePath = process.argv[2] ?? 'config/prompts/guide.yaml';
const content = fs.readFileSync(filePath, 'utf8');
const parsed = yaml.load(content) as { instructions?: string };

if (!parsed?.instructions) {
  console.error(`No instructions found in ${filePath}`);
  process.exit(1);
}

process.stdout.write(parsed.instructions);
