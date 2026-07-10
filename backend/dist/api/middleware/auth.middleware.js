import jwt from 'jsonwebtoken';
import pool from '../../lib/db.js';
import { getJwtSecret } from '../../lib/security.js';
export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization header' });
        }
        const token = authHeader.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        // Verify the token
        const decoded = jwt.verify(token, getJwtSecret());
        // Get user from database
        const result = await pool.query('SELECT id, email, role, "firstName", "lastName" FROM users WHERE id = $1 AND status = $2', [decoded.id, 'ACTIVE']);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }
        req.user = result.rows[0];
        next();
    }
    catch (error) {
        console.error('Token verification failed:', error.message);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Authentication failed' });
    }
};
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};
