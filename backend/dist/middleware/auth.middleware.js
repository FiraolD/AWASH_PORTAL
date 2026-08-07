import jwt from 'jsonwebtoken';
import pool from '../lib/db.js';
// ---------------------------------------------------------------------------
// JWT Configuration
// ---------------------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: 604800 }); // 7 days in seconds
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
// ---------------------------------------------------------------------------
// Verify JWT Token
// ---------------------------------------------------------------------------
export function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}
// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------
export const ROLES = {
    // Customer
    CUSTOMER: 'CUSTOMER',
    CUSTOMER_ADMIN: 'CUSTOMER_ADMIN',
    CUSTOMER_SUPPORT: 'CUSTOMER_SUPPORT',
    CUSTOMER_RELATION_OFFICER: 'CUSTOMER_RELATION_OFFICER',
    // Underwriting
    UNDERWRITING_OFFICER_I: 'UNDERWRITING_OFFICER_I',
    UNDERWRITING_OFFICER_II: 'UNDERWRITING_OFFICER_II',
    SENIOR_UNDERWRITING_OFFICER: 'SENIOR_UNDERWRITING_OFFICER',
    SUPERVISOR_UNDERWRITING: 'SUPERVISOR_UNDERWRITING',
    MANAGER_UNDERWRITING: 'MANAGER_UNDERWRITING',
    HEAD_UNDERWRITING: 'HEAD_UNDERWRITING',
    UNDERWRITING_ADMIN: 'UNDERWRITING_ADMIN',
    // Claims
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
    CTO: 'CTO',
    CCO: 'CCO',
    ADMIN: 'ADMIN',
};
// ---------------------------------------------------------------------------
// Role groups
// ---------------------------------------------------------------------------
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
// ---------------------------------------------------------------------------
// Authentication Middleware
// ---------------------------------------------------------------------------
export const authenticate = async (req, res, next) => {
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
        const decoded = verifyToken(token);
        // Verify user still exists in database
        const userResult = await pool.query(`SELECT id, email, role, "firstName", "lastName", "emailVerified", "isActive"
       FROM users WHERE id = $1`, [decoded.id]);
        if (userResult.rows.length === 0) {
            res.status(401).json({ error: 'User not found.' });
            return;
        }
        const user = userResult.rows[0];
        if (!user.isActive) {
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
            emailVerified: user.emailVerified,
        };
        console.log(`[AUTH] User authenticated: ${user.email} (${user.role})`);
        next();
    }
    catch (error) {
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
export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
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
// Convenience authorization middleware
// ---------------------------------------------------------------------------
export const authorizeClaimsStaff = authorize(...ROLE_GROUPS.CLAIMS_STAFF);
export const authorizeClaimsApprovers = authorize(...ROLE_GROUPS.CLAIMS_APPROVERS, ...ROLE_GROUPS.EXECUTIVES);
export const authorizeClaimsAll = authorize(...ROLE_GROUPS.CLAIMS_STAFF, ...ROLE_GROUPS.EXECUTIVES);
export const authorizeExecutives = authorize(...ROLE_GROUPS.EXECUTIVES);
export const authorizeUnderwriting = authorize(...ROLE_GROUPS.UNDERWRITING_STAFF, ...ROLE_GROUPS.EXECUTIVES);
// ---------------------------------------------------------------------------
// Optional: Soft authentication (attaches user if token present, doesn't block)
// ---------------------------------------------------------------------------
export const softAuthenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const userResult = await pool.query(`SELECT id, email, role, "firstName", "lastName", "emailVerified" FROM users WHERE id = $1`, [decoded.id]);
        if (userResult.rows.length > 0) {
            req.user = {
                id: userResult.rows[0].id,
                email: userResult.rows[0].email,
                role: userResult.rows[0].role,
                firstName: userResult.rows[0].firstName,
                lastName: userResult.rows[0].lastName,
                emailVerified: userResult.rows[0].emailVerified,
            };
        }
    }
    catch {
        // Invalid token – continue without user
    }
    next();
};
