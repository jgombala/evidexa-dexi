import type { Server } from 'http';
import request from 'supertest';
import { createServer } from '../../src/serverFactory.js';

export async function startTestServer() {
  const app = createServer();
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  return {
    server,
    client: request(server),
  };
}

export function stopTestServer(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
