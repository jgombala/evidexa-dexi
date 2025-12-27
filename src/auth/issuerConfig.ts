import fs from 'node:fs';
import { config } from '../config.js';

export interface IssuerConfig {
  issuer: string;
  jwksUri: string;
  audience: string;
  tenantId?: string;
  allowedAzp?: string[];
  appId?: string;
}

export function loadIssuerConfigs(): IssuerConfig[] {
  if (config.issuerConfigJson) {
    return JSON.parse(config.issuerConfigJson) as IssuerConfig[];
  }

  if (config.issuerConfigPath && fs.existsSync(config.issuerConfigPath)) {
    const content = fs.readFileSync(config.issuerConfigPath, 'utf8');
    return JSON.parse(content) as IssuerConfig[];
  }

  return [];
}
