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

describe('Auth enforcement', () => {
  it('rejects missing auth when dev auth disabled', async () => {
    process.env.DEXI_DEV_AUTH = '0';
    const res = await client.post('/api/chat').send({
      message: 'hi',
      context: { userId: 'u1', role: 'viewer', applicationId: 'nexus' },
    });
    expect(res.status).toBe(401);
  });
});
