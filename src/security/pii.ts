const PII_PATTERNS: RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  /\b\d{3}-\d{3}-\d{4}\b/g,
];

export function redactPii(text: string) {
  let redacted = text;
  let detected = false;
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(redacted)) {
      detected = true;
      redacted = redacted.replace(pattern, '[REDACTED]');
    }
  }
  return { redacted, detected };
}
