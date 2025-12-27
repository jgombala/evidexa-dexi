import { redactPii } from '../security/pii.js';
import { logger } from './logger.js';

interface AuditEntry {
  userId: string;
  agentId: string;
  requestMessage: string;
  responseMessage: string;
  toolsUsed?: unknown;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry) {
  const request = redactPii(entry.requestMessage);
  const response = redactPii(entry.responseMessage);
  const piiRedacted = request.detected || response.detected;

  logger.info(
    {
      userId: entry.userId,
      agentId: entry.agentId,
      requestMessage: request.redacted,
      responseMessage: response.redacted,
      toolsUsed: entry.toolsUsed,
      piiRedacted,
      metadata: entry.metadata,
    },
    'audit_log'
  );
}
