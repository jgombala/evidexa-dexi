import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import type { SuperTest, Test } from 'supertest';

describe('Performance targets', () => {
  let server: Server;
  let client: SuperTest<Test>;
  let stopServer: (server: Server) => Promise<void>;
  const originalEnv = {
    DEXI_DEV_AUTH: process.env.DEXI_DEV_AUTH,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  beforeAll(async () => {
    process.env.DEXI_DEV_AUTH = '1';
    process.env.OPENAI_API_KEY = '';
    const { startTestServer, stopTestServer } = await import('./testServer.js');
    stopServer = stopTestServer;
    const started = await startTestServer();
    server = started.server;
    client = started.client;
  });

  afterAll(async () => {
    await stopServer(server);
    process.env.DEXI_DEV_AUTH = originalEnv.DEXI_DEV_AUTH;
    process.env.OPENAI_API_KEY = originalEnv.OPENAI_API_KEY;
  });

  it('responds within fast target for stubbed calls', async () => {
    const start = Date.now();
    const res = await client.post('/api/chat').send({
      message: 'Ping',
      context: { userId: 'u1', role: 'viewer', applicationId: 'nexus' },
      mode: 'fast',
    });
    // Verify body first so we see the error if it fails
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    const latency = Date.now() - start;
    expect(res.status).toBe(200);
    expect(latency).toBeLessThan(5000); // Allow time for real network call
  });
});
