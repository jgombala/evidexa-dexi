import jwt from 'jsonwebtoken';

export function mintLocalJwt(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required to mint a local token');
  }

  const issuer = env.JWT_ISSUER ?? 'http://localhost:3000';
  const audience = env.JWT_AUDIENCE ?? 'dexi-local';
  const tenantId = env.LOCAL_TENANT_ID ?? 'local-tenant';
  const azp = env.LOCAL_AZP ?? 'local-client';
  const userId = env.LOCAL_USER_ID ?? 'local-user';
  const roles = (env.LOCAL_ROLES ?? 'admin').split(',').map((role) => role.trim());
  const appId = env.LOCAL_APP_ID ?? 'nexus';

  const payload = {
    sub: userId,
    tid: tenantId,
    azp,
    roles,
    applicationId: appId,
  };

  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    issuer,
    audience,
    expiresIn: '1h',
  });
}
