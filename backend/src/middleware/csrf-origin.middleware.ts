import { Request, Response, NextFunction } from 'express';
import { getAllowedOrigins, isOriginAllowed } from '../lib/security.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTH_COOKIE_NAME = 'awash_access_token';

function hasAuthCookie(req: Request): boolean {
  return (req.headers.cookie || '').split(';').some((part) => part.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
}

/**
 * Cookie-authenticated state-changing requests must originate from an allowed
 * application origin. Bearer-authenticated API clients and provider webhooks
 * without the session cookie are intentionally unaffected.
 */
export function csrfOriginGuard(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || !hasAuthCookie(req)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (origin && !isOriginAllowed(origin, getAllowedOrigins())) {
    res.status(403).json({ error: 'Cross-origin request blocked.' });
    return;
  }

  next();
}
