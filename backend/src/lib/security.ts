const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3011',
  'http://localhost:5173',
  'http://10.1.12.21:3011',
];

const VERCEL_PREVIEW_PATTERNS = [
  /^https:\/\/awash-portal(?:-[a-z0-9]+)?-firaolds-projects\.vercel\.app$/i,
  /^https:\/\/awash-portal\.vercel\.app$/i,
];

const RENDER_PATTERNS = [
  /^https:\/\/awash-portal(?:-[a-z0-9]+)?\.onrender\.com$/i,
];

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret && secret.trim().length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to at least 32 characters in production');
  }

  return secret?.trim() || 'awash-dev-secret-change-me';
}

export function getAllowedOrigins(): string[] {
  const envOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV === 'production') {
    return envOrigins;
  }

  return [...DEFAULT_DEV_ORIGINS, ...envOrigins];
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;

  if (allowedOrigins.includes(origin)) return true;

  for (const pattern of VERCEL_PREVIEW_PATTERNS) {
    if (pattern.test(origin)) return true;
  }
  for (const pattern of RENDER_PATTERNS) {
    if (pattern.test(origin)) return true;
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      const url = new URL(origin);
      if (
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}