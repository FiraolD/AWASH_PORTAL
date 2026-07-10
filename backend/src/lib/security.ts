const DEFAULT_DEV_JWT_SECRET = 'awash-dev-secret-change-me';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (secret && secret.trim().length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to at least 32 characters in production');
  }

  return secret?.trim() || DEFAULT_DEV_JWT_SECRET;
}

export function getAllowedOrigins() {
  const origins = process.env.CORS_ORIGIN || process.env.FRONTEND_URL;

  if (!origins) {
    return process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:3011', 'http://localhost:5173'];
  }

  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
