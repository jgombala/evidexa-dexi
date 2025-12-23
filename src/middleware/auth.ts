import { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, JWTVerifyResult } from 'jose';
import { prisma } from '../db/client.js';
import { config } from '../config.js';

export interface AuthContext {
  userId: string;
  email?: string;
  roles: string[];
  token: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

async function verifyToken(token: string): Promise<JWTVerifyResult> {
  const audience = config.auth.audience;
  const issuer = config.auth.issuer;

  if (config.auth.jwksUri) {
    const jwks = createRemoteJWKSet(new URL(config.auth.jwksUri));
    return jwtVerify(token, jwks, { audience, issuer });
  }

  if (!config.auth.sharedSecret) {
    throw new Error('No JWKS URI or shared secret configured for JWT verification');
  }

  const secret = new TextEncoder().encode(config.auth.sharedSecret);
  return jwtVerify(token, secret, { audience, issuer });
}

async function getUserRoles(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });

  if (!user) {
    return [];
  }

  return user.roles.map((r) => r.role.name);
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers['authorization'];
  const token = header?.split(' ')[1];

  if (!token) {
    if (config.auth.optional) {
      return next();
    }
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    const result = await verifyToken(token);
    const payload = result.payload;
    const userId = String(payload.sub ?? '');

    if (!userId) {
      return res.status(401).json({ error: 'Token missing subject claim' });
    }

    const email = typeof payload.email === 'string' ? payload.email : undefined;
    const tokenRoles = Array.isArray(payload['roles'])
      ? (payload['roles'] as string[])
      : [];
    const dbRoles = await getUserRoles(userId);

    req.auth = {
      userId,
      email,
      roles: Array.from(new Set([...tokenRoles, ...dbRoles])),
      token,
    };

    if (!email) {
      // Ensure the user exists for later RBAC checks; create a placeholder if needed.
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@placeholder.local` },
      });
    }

    return next();
  } catch (error) {
    if (config.auth.optional) {
      return next();
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRoles = (roles: string[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth && !config.auth.optional) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRoles = req.auth?.roles ?? [];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
