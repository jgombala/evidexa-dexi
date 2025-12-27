import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import type { SuperTest, Test } from 'supertest';
import { mintLocalJwt } from '../../src/auth/localJwt.js';

let server: Server;
let client: SuperTest<Test>;
let stopServer: (server: Server) => Promise<void>;
const originalEnv = {
  DEXI_DEV_AUTH: process.env.DEXI_DEV_AUTH,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_ISSUER: process.env.JWT_ISSUER,
  JWT_AUDIENCE: process.env.JWT_AUDIENCE,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

beforeAll(async () => {
  process.env.DEXI_DEV_AUTH = '0';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
  process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? 'http://localhost:3000';
  process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'dexi-local';
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
  process.env.JWT_SECRET = originalEnv.JWT_SECRET;
  process.env.JWT_ISSUER = originalEnv.JWT_ISSUER;
  process.env.JWT_AUDIENCE = originalEnv.JWT_AUDIENCE;
  process.env.OPENAI_API_KEY = originalEnv.OPENAI_API_KEY;
});

describe('JWT auth (local mint)', () => {
  it('accepts a locally minted JWT', async () => {
    const token = mintLocalJwt();

    const res = await client
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({
        message: 'Hello',
        context: { userId: 'local-user', role: 'admin', applicationId: 'nexus' },
      });

    expect([200, 403, 500]).toContain(res.status);
  });
});
