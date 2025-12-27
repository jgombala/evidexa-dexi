import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import type { SuperTest, Test } from 'supertest';
import { startTestServer, stopTestServer } from './testServer.js';

let server: Server;
let client: SuperTest<Test>;

beforeAll(async () => {
  const started = await startTestServer();
  server = started.server;
  client = started.client;
});

afterAll(async () => {
  await stopTestServer(server);
});

describe('POST /api/tools/:toolId/execute', () => {
  it('returns 400 on invalid payload', async () => {
    process.env.DEXI_DEV_AUTH = '1';
    const res = await client.post('/api/tools/docs-search/execute').send({});
    expect(res.status).toBe(400);
  });
});
