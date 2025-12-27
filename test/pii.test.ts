import { describe, it, expect } from 'vitest';
import { redactPii } from '../src/security/pii.js';

describe('redactPii', () => {
  it('redacts emails and phone numbers', () => {
    const input = 'Contact me at test@example.com or 555-555-1212';
    const result = redactPii(input);
    expect(result.detected).toBe(true);
    expect(result.redacted).toContain('[REDACTED]');
  });
});
