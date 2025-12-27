import { setTimeout as delay } from 'node:timers/promises';

const url = process.env.LOAD_TEST_URL ?? 'http://localhost:3000/api/chat';
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY ?? 5);
const iterations = Number(process.env.LOAD_TEST_ITERATIONS ?? 10);

async function runOnce(id: number) {
  const body = {
    message: `Ping ${id}`,
    context: { userId: 'load-test', role: 'viewer', applicationId: 'nexus' },
    stream: false,
    mode: 'fast',
  };

  const start = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: process.env.LOAD_TEST_TOKEN ? `Bearer ${process.env.LOAD_TEST_TOKEN}` : '',
      'x-dev-user': 'load-test',
      'x-dev-role': 'viewer',
    },
    body: JSON.stringify(body),
  });
  const latencyMs = Date.now() - start;
  return { status: response.status, latencyMs };
}

async function main() {
  const results: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const batch = Array.from({ length: concurrency }, (_, idx) => runOnce(i * concurrency + idx));
    const batchResults = await Promise.all(batch);
    results.push(...batchResults.map((r) => r.latencyMs));
    await delay(50);
  }

  results.sort((a, b) => a - b);
  const p50 = results[Math.floor(results.length * 0.5)] ?? 0;
  const p95 = results[Math.floor(results.length * 0.95)] ?? 0;
  console.log({ count: results.length, p50, p95 });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
