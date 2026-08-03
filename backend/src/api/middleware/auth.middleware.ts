// src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../../lib/db.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
}

// ---------------------------------------------------------------------------
// Role definitions (centralized)
// ---------------------------------------------------------------------------
export const ROLES = {
  // Customer
  CUSTOMER: 'CUSTOMER',
  
  // Customer Admin / Support
  CUSTOMER_ADMIN: 'CUSTOMER_ADMIN',
  CUSTOMER_SUPPORT: 'CUSTOMER_SUPPORT',
  CUSTOMER_RELATION_OFFICER: 'CUSTOMER_RELATION_OFFICER',
  
  // Underwriting
  UNDERWRITER_I: 'UNDERWRITER_I',
  UNDERWRITER_II: 'UNDERWRITER_II',
  SENIOR_UNDERWRITER: 'SENIOR_UNDERWRITER',
  UNDERWRITING_MANAGER: 'UNDERWRITING_MANAGER',
  HEAD_UNDERWRITING: 'HEAD_UNDERWRITING',
  UNDERWRITING_ADMIN: 'UNDERWRITING_ADMIN',
  
  // Claims
  CLAIM_OFFICER: 'CLAIM_OFFICER',
  CLAIM_OFFICER_I: 'CLAIM_OFFICER_I',
  CLAIM_OFFICER_II: 'CLAIM_OFFICER_II',
  SENIOR_CLAIM_OFFICER: 'SENIOR_CLAIM_OFFICER',
  SUPERVISOR_CLAIMS: 'SUPERVISOR_CLAIMS',
  MANAGER_CLAIMS: 'MANAGER_CLAIMS',
  HEAD_CLAIMS: 'HEAD_CLAIMS',
  CLAIMS_ADMIN: 'CLAIMS_ADMIN',
  
  // Master Admin / Executives
  MASTER_ADMIN: 'MASTER_ADMIN',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  CEO: 'CEO',
  COO: 'COO',
  CFO: 'CFO',
  ADMIN: 'ADMIN',
} as const;

// ---------------------------------------------------------------------------
// Role groups (for convenience)
// ---------------------------------------------------------------------------
export const ROLE_GROUPS = {
  // All claims staff
  CLAIMS_STAFF: [
    ROLES.CLAIM_OFFICER,
    ROLES.CLAIM_OFFICER_I,
    ROLES.CLAIM_OFFICER_II,
    ROLES.SENIOR_CLAIM_OFFICER,
    ROLES.SUPERVISOR_CLAIMS,
    ROLES.MANAGER_CLAIMS,
    ROLES.HEAD_CLAIMS,
    ROLES.CLAIMS_ADMIN,
  ],
  
  // Claims officers (reviewers – cannot approve/reject)
  CLAIMS_REVIEWERS: [
    ROLES.CLAIM_OFFICER,
    ROLES.CLAIM_OFFICER_I,
    ROLES.CLAIM_OFFICER_II,
    ROLES.SENIOR_CLAIM_OFFICER,
  ],
  
  // Claims approvers (can approve/reject)
  CLAIMS_APPROVERS: [
    ROLES.SUPERVISOR_CLAIMS,
    ROLES.MANAGER_CLAIMS,
    ROLES.HEAD_CLAIMS,
    ROLES.CLAIMS_ADMIN,
  ],
  
  // Admin / Executives
  EXECUTIVES: [
    ROLES.MASTER_ADMIN,
    ROLES.SYSTEM_ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.CEO,
    ROLES.COO,
    ROLES.CFO,
    ROLES.ADMIN,
  ],
  
  // Underwriting staff
  UNDERWRITING_STAFF: [
    ROLES.UNDERWRITER_I,
    ROLES.UNDERWRITER_II,
    ROLES.SENIOR_UNDERWRITER,
    ROLES.UNDERWRITING_MANAGER,
    ROLES.HEAD_UNDERWRITING,
    ROLES.UNDERWRITING_ADMIN,
  ],
  
  // Customer-facing roles
  CUSTOMER_FACING: [
    ROLES.CUSTOMER,
    ROLES.CUSTOMER_ADMIN,
    ROLES.CUSTOMER_SUPPORT,
    ROLES.CUSTOMER_RELATION_OFFICER,
  ],
  
  // All authenticated users (everyone)
  ALL_AUTHENTICATED: [
    ...Object.values(ROLES),
  ],
};

// ---------------------------------------------------------------------------
// JWT Authentication Middleware
// ---------------------------------------------------------------------------
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access denied. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ error: 'Access denied. No token provided.' });
      return;
    }

    // Verify JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };

    // Verify user still exists in database
    const userResult = await pool.query(
      `SELECT id, email, role, "firstName", "lastName", "status" 
       FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'User not found.' });
      return;
    }

    const user = userResult.rows[0];

    if (!user.status) {
      res.status(403).json({ error: 'Account is deactivated. Contact admin.' });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    console.log(`[AUTH] User authenticated: ${user.email} (${user.role})`);
    
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Invalid token.' });
      return;
    }
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired.' });
      return;
    }
    console.error('[AUTH] Authentication error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// ---------------------------------------------------------------------------
// Role Authorization Middleware
// ---------------------------------------------------------------------------
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole) {
      console.log('[AUTHORIZE] No user role found – access denied');
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    console.log(`[AUTHORIZE] User role: ${userRole}`);
    console.log(`[AUTHORIZE] Allowed roles: [${allowedRoles.join(', ')}]`);

    const isAllowed = allowedRoles.includes(userRole);

    if (!isAllowed) {
      console.log(`[AUTHORIZE] ACCESS DENIED – ${userRole} not in allowed list`);
      res.status(403).json({ 
        error: 'Insufficient permissions',
        userRole,
        requiredRoles: allowedRoles,
      });
      return;
    }

    console.log(`[AUTHORIZE] ACCESS GRANTED – ${userRole}`);
    next();
  };
};

// ---------------------------------------------------------------------------
// Convenience middleware using role groups
// ---------------------------------------------------------------------------

// Allow all claims staff
export const authorizeClaimsStaff = authorize(...ROLE_GROUPS.CLAIMS_STAFF);

// Allow claims approvers only
export const authorizeClaimsApprovers = authorize(...ROLE_GROUPS.CLAIMS_APPROVERS, ...ROLE_GROUPS.EXECUTIVES);

// Allow claims reviewers (officers) only
export const authorizeClaimsReviewers = authorize(...ROLE_GROUPS.CLAIMS_REVIEWERS);

// Allow all claims staff + executives
export const authorizeClaimsAll = authorize(
  ...ROLE_GROUPS.CLAIMS_STAFF,
  ...ROLE_GROUPS.EXECUTIVES
);

// Allow executives only
export const authorizeExecutives = authorize(...ROLE_GROUPS.EXECUTIVES);

// Allow customers only
export const authorizeCustomer = authorize(ROLES.CUSTOMER);

// Allow any authenticated user
export const authorizeAny = authorize(...ROLE_GROUPS.ALL_AUTHENTICATED);

// ---------------------------------------------------------------------------
// Optional: Soft auth – attaches user if token present, but doesn't block
// ---------------------------------------------------------------------------
export const softAuthenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token – continue without user
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };

    const userResult = await pool.query(
      `SELECT id, email, role, "firstName", "lastName" FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (userResult.rows.length > 0) {
      req.user = {
        id: userResult.rows[0].id,
        email: userResult.rows[0].email,
        role: userResult.rows[0].role,
        firstName: userResult.rows[0].firstName,
        lastName: userResult.rows[0].lastName,
      };
    }
  } catch {
    // Invalid token – continue without user
  }
  
  next();
};