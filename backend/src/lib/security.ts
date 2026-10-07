const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3011',
  'http://localhost:5173',
  'http://10.1.12.21:3011',
];

// Vercel preview deployments match this shape:
//   <project>-<hash>-<team>.vercel.app
// We allow any team-scoped preview plus the production alias.
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

/**
 * Explicit allowlist from env, plus pattern-matched Vercel/Render hosts.
 * Env var always takes precedence (union).
 */
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

/**
 * Returns true if the origin is allowed.
 * Order: exact allowlist → pattern-matched hosts → localhost in dev.
 */
export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true; // native apps / curl send no Origin

  if (allowedOrigins.includes(origin)) return true;

  // Pattern-based matching for Vercel/Render preview hosts
  for (const pattern of VERCEL_PREVIEW_PATTERNS) {
    if (pattern.test(origin)) return true;
  }
  for (const pattern of RENDER_PATTERNS) {
    if (pattern.test(origin)) return true;
  }

  // Local development only
  if (process.env.NODE_ENV !== 'production') {
    try {
      const url = new URL(origin);
      if (url.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}