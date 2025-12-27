import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import type { DexiRole } from '../config.js';
import type { UserContext } from '../types.js';
import { roleFromGroups } from '../authorization.js';
import { loadIssuerConfigs } from '../auth/issuerConfig.js';

declare module 'express-serve-static-core' {
  interface Request {
    userContext?: UserContext;
  }
}

const ROLE_SET = new Set(['admin', 'manager', 'analyst', 'viewer']);

function normalizeRole(role: string | undefined): DexiRole {
  if (role && ROLE_SET.has(role)) {
    return role as DexiRole;
  }
  return 'viewer';
}

function parseDevUser(req: Request): UserContext {
  const headerUser = req.header('x-dev-user');
  const headerRole = req.header('x-dev-role');
  const headerApp = req.header('x-dev-app');

  return {
    userId: headerUser ?? config.devUserId,
    role: normalizeRole(headerRole ?? config.devUserRole),
    applicationId: headerApp ?? 'nexus',
  };
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  if (process.env.DEXI_DEV_AUTH === '1') {
    req.userContext = parseDevUser(req);
    return next();
  }

  const authHeader = req.header('authorization');
  if (!authHeader) {
    return res.status(401).json({ error: { code: 'auth_missing', message: 'Missing Authorization header' } });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({ error: { code: 'auth_invalid', message: 'Invalid Authorization header' } });
  }

  const verifyWithSecret = () => {
    if (!config.jwtSecret) {
      return res.status(500).json({ error: { code: 'auth_unconfigured', message: 'JWT_SECRET not configured' } });
    }
    try {
      const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
      const roleClaim = payload.role ? String(payload.role) : undefined;
      const groups = (payload['cognito:groups'] as string[] | undefined) ?? undefined;
      const role = roleClaim ? normalizeRole(roleClaim) : roleFromGroups(groups);
    req.userContext = {
      userId: String(payload.sub ?? payload.userId ?? 'unknown'),
      role,
      applicationId: String(payload.applicationId ?? 'nexus'),
      ...(payload.sessionId ? { sessionId: String(payload.sessionId) } : {}),
      ...(payload.campaignId ? { campaignId: String(payload.campaignId) } : {}),
      ...(payload.currentRoute ? { currentRoute: String(payload.currentRoute) } : {}),
    };
      return next();
    } catch (error) {
      return res.status(401).json({
        error: { code: 'auth_invalid', message: (error as Error).message },
      });
    }
  };

  const issuerConfigs = loadIssuerConfigs();
  if (!config.jwksUri && issuerConfigs.length === 0) {
    return verifyWithSecret();
  }

  const decoded = jwt.decode(token, { complete: true }) as { payload?: jwt.JwtPayload } | null;
  const tokenIss = decoded?.payload?.iss as string | undefined;

  const issuerConfig =
    issuerConfigs.find((issuer) => issuer.issuer === tokenIss) ??
    (config.jwksUri
      ? {
          issuer: config.jwtIssuer || tokenIss || '',
          jwksUri: config.jwksUri,
          audience: config.jwtAudience || '',
          tenantId: undefined,
          allowedAzp: undefined,
          appId: undefined,
        }
      : undefined);

  if (!issuerConfig || !issuerConfig.jwksUri) {
    return res.status(401).json({ error: { code: 'auth_invalid', message: 'Unknown token issuer' } });
  }

  const client = jwksRsa({ jwksUri: issuerConfig.jwksUri, cache: true, rateLimit: true });
  const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
    client.getSigningKey(header.kid as string, (err, key) => {
      if (err) return callback(err, undefined);
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  };

  jwt.verify(
    token,
    getKey,
    { issuer: issuerConfig.issuer || undefined, audience: issuerConfig.audience || undefined },
    (err, decoded) => {
      if (err || !decoded) {
        return res.status(401).json({ error: { code: 'auth_invalid', message: err?.message ?? 'Invalid token' } });
      }
      const payload = decoded as jwt.JwtPayload;
      if (issuerConfig.tenantId && payload.tid !== issuerConfig.tenantId) {
        return res.status(401).json({ error: { code: 'auth_invalid', message: 'Invalid tenant' } });
      }

      if (issuerConfig.allowedAzp?.length) {
        const azp = (payload.azp ?? payload.appid) as string | undefined;
        if (!azp || !issuerConfig.allowedAzp.includes(azp)) {
          return res.status(401).json({ error: { code: 'auth_invalid', message: 'Invalid authorized party' } });
        }
      }

      const roleClaim = payload.role ? String(payload.role) : undefined;
      const groups = (payload['cognito:groups'] as string[] | undefined) ?? undefined;
      const role = roleClaim ? normalizeRole(roleClaim) : roleFromGroups(groups);
      req.userContext = {
        userId: String(payload.sub ?? payload.userId ?? 'unknown'),
        role,
        applicationId: issuerConfig.appId ?? String(payload.applicationId ?? payload.azp ?? 'nexus'),
        ...(payload.sessionId ? { sessionId: String(payload.sessionId) } : {}),
        ...(payload.campaignId ? { campaignId: String(payload.campaignId) } : {}),
        ...(payload.currentRoute ? { currentRoute: String(payload.currentRoute) } : {}),
      };
      return next();
    }
  );
}
