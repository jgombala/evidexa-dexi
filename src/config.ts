import { config as loadEnv } from 'dotenv';

loadEnv();

export const config = {
  http: {
    port: Number(process.env.HTTP_PORT) || 3000,
  },
  grpc: {
    port: Number(process.env.GRPC_PORT) || 50051,
  },
  auth: {
    jwksUri: process.env.AUTH_JWKS_URI,
    audience: process.env.AUTH_AUDIENCE,
    issuer: process.env.AUTH_ISSUER,
    sharedSecret: process.env.AUTH_SHARED_SECRET,
    optional: process.env.AUTH_OPTIONAL === 'true',
  },
  observability: {
    serviceName: process.env.SERVICE_NAME || 'dexi-orchestrator',
  },
};
