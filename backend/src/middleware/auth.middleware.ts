import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../lib/db.js';
import { getJwtSecret } from '../lib/security.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    emailVerified?: boolean;
  };
}

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
}

const JWT_SECRET = getJwtSecret();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const AUTH_COOKIE_NAME = 'awash_access_token';

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload as object, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function setAuthCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}

export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  CUSTOMER_ADMIN: 'CUSTOMER_ADMIN',
  CUSTOMER_SUPPORT: 'CUSTOMER_SUPPORT',
  CUSTOMER_RELATION_OFFICER: 'CUSTOMER_RELATION_OFFICER',
  UNDERWRITING_OFFICER_I: 'UNDERWRITING_OFFICER_I',
  UNDERWRITING_OFFICER_II: 'UNDERWRITING_OFFICER_II',
  SENIOR_UNDERWRITING_OFFICER: 'SENIOR_UNDERWRITING_OFFICER',
  SUPERVISOR_UNDERWRITING: 'SUPERVISOR_UNDERWRITING',
  MANAGER_UNDERWRITING: 'MANAGER_UNDERWRITING',
  HEAD_UNDERWRITING: 'HEAD_UNDERWRITING',
  UNDERWRITING_ADMIN: 'UNDERWRITING_ADMIN',
  CLAIM_OFFICER_I: 'CLAIM_OFFICER_I',
  CLAIM_OFFICER_II: 'CLAIM_OFFICER_II',
  SENIOR_CLAIM_OFFICER: 'SENIOR_CLAIM_OFFICER',
  SUPERVISOR_CLAIMS: 'SUPERVISOR_CLAIMS',
  MANAGER_CLAIMS: 'MANAGER_CLAIMS',
  HEAD_CLAIMS: 'HEAD_CLAIMS',
  CLAIMS_ADMIN: 'CLAIMS_ADMIN',
  MASTER_ADMIN: 'MASTER_ADMIN',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  CEO: 'CEO',
  COO: 'COO',
  CFO: 'CFO',
  CTO: 'CTO',
  CCO: 'CCO',
  ADMIN: 'ADMIN',
} as const;

export const ROLE_GROUPS = {
  CLAIMS_STAFF: [
    ROLES.CLAIM_OFFICER_I, ROLES.CLAIM_OFFICER_II, ROLES.SENIOR_CLAIM_OFFICER,
    ROLES.SUPERVISOR_CLAIMS, ROLES.MANAGER_CLAIMS, ROLES.HEAD_CLAIMS, ROLES.CLAIMS_ADMIN,
  ],
  CLAIMS_REVIEWERS: [
    ROLES.CLAIM_OFFICER_I, ROLES.CLAIM_OFFICER_II, ROLES.SENIOR_CLAIM_OFFICER,
  ],
  CLAIMS_APPROVERS: [
    ROLES.SUPERVISOR_CLAIMS, ROLES.MANAGER_CLAIMS, ROLES.HEAD_CLAIMS, ROLES.CLAIMS_ADMIN,
  ],
  EXECUTIVES: [
    ROLES.MASTER_ADMIN, ROLES.SYSTEM_ADMIN, ROLES.SUPER_ADMIN,
    ROLES.CEO, ROLES.COO, ROLES.CFO, ROLES.CTO, ROLES.CCO, ROLES.ADMIN,
  ],
  UNDERWRITING_STAFF: [
    ROLES.UNDERWRITING_OFFICER_I, ROLES.UNDERWRITING_OFFICER_II, ROLES.SENIOR_UNDERWRITING_OFFICER,
    ROLES.SUPERVISOR_UNDERWRITING, ROLES.MANAGER_UNDERWRITING, ROLES.HEAD_UNDERWRITING, ROLES.UNDERWRITING_ADMIN,
  ],
};

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const token = bearerToken || readCookie(req, AUTH_COOKIE_NAME);

    if (!token) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const decoded = verifyToken(token);
    const userResult = await pool.query(
      `SELECT id, email, role, "firstName", "lastName", status, "emailVerified"
       FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const user = userResult.rows[0];
    if (user.status?.toUpperCase() !== 'ACTIVE') {
      res.status(403).json({ error: 'Account is deactivated. Contact support.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Invalid or expired authentication session.' });
      return;
    }
    console.error('[AUTH] Authentication error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;
    if (!userRole) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const authorizeClaimsStaff = authorize(...ROLE_GROUPS.CLAIMS_STAFF);
export const authorizeClaimsApprovers = authorize(...ROLE_GROUPS.CLAIMS_APPROVERS, ...ROLE_GROUPS.EXECUTIVES);
export const authorizeClaimsAll = authorize(...ROLE_GROUPS.CLAIMS_STAFF, ...ROLE_GROUPS.EXECUTIVES);
export const authorizeExecutives = authorize(...ROLE_GROUPS.EXECUTIVES);
export const authorizeUnderwriting = authorize(...ROLE_GROUPS.UNDERWRITING_STAFF, ...ROLE_GROUPS.EXECUTIVES);

export const softAuthenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const token = bearerToken || readCookie(req, AUTH_COOKIE_NAME);
    if (!token) {
      next();
      return;
    }

    const decoded = verifyToken(token);
    const userResult = await pool.query(
      `SELECT id, email, role, "firstName", "lastName", status, "emailVerified"
       FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].status?.toUpperCase() === 'ACTIVE') {
      const user = userResult.rows[0];
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      };
    }
  } catch {
    // Optional authentication intentionally ignores invalid sessions.
  }

  next();
};
