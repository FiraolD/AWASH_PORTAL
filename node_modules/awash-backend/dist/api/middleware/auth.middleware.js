import jwt from 'jsonwebtoken';
import pool from '../../lib/db.js';
import { config } from '../../config/index.js';
export const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const decoded = jwt.verify(token, config.jwt.secret);
        const result = await pool.query('SELECT id, email, role FROM users WHERE id = $1 AND status = $2', [decoded.id, 'ACTIVE']);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (req.user.role === 'MASTER_ADMIN') {
            return next();
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};
