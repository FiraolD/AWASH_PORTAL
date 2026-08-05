import { Router } from 'express';
import { authenticate, authorizeExecutives } from '../../middleware/auth.middleware.js';
import pool from '../../lib/db.js';
const router = Router();
// ---------------------------------------------------------------------------
// GET audit logs with pagination
// ---------------------------------------------------------------------------
router.get('/', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const entityType = req.query.entityType;
        const action = req.query.action;
        let query = `
      SELECT 
        id, 
        "userId", 
        action, 
        "entityType", 
        "entityId", 
        "oldValues", 
        "newValues", 
        "ipAddress", 
        "userAgent", 
        "createdAt"
      FROM audit_logs 
      WHERE 1=1`;
        const params = [];
        let paramCount = 1;
        if (entityType) {
            query += ` AND "entityType" = $${paramCount++}`;
            params.push(entityType);
        }
        if (action) {
            query += ` AND action = $${paramCount++}`;
            params.push(action);
        }
        // Count total
        const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) AS filtered`, params);
        const total = parseInt(countResult.rows[0].count);
        // Add ordering and pagination
        query += ` ORDER BY "createdAt" DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
        params.push(limit, offset);
        const result = await pool.query(query, params);
        res.json({
            data: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('[AuditLogs] Fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});
// ---------------------------------------------------------------------------
// GET distinct actions for filter dropdown
// ---------------------------------------------------------------------------
router.get('/actions', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const result = await pool.query(`SELECT DISTINCT action FROM audit_logs ORDER BY action ASC`);
        res.json(result.rows.map((row) => row.action));
    }
    catch (error) {
        console.error('[AuditLogs] Actions fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch actions' });
    }
});
// ---------------------------------------------------------------------------
// GET distinct entity types for filter dropdown
// ---------------------------------------------------------------------------
router.get('/entity-types', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const result = await pool.query(`SELECT DISTINCT "entityType" FROM audit_logs ORDER BY "entityType" ASC`);
        res.json(result.rows.map((row) => row.entityType));
    }
    catch (error) {
        console.error('[AuditLogs] Entity types fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch entity types' });
    }
});
// ---------------------------------------------------------------------------
// Helper function to create audit logs (called by other routes)
// ---------------------------------------------------------------------------
export async function createAuditLog(userId, userEmail, userRole, action, entityType, entityId, oldData, newData, ipAddress, userAgent) {
    try {
        // Note: your table only has "userId", not "userEmail" or "userRole"
        // We store email and role in the oldValues/newValues if needed
        await pool.query(`INSERT INTO audit_logs (
        "userId",
        action,
        "entityType",
        "entityId",
        "oldValues",
        "newValues",
        "ipAddress",
        "userAgent",
        "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`, [
            userId,
            action,
            entityType,
            entityId,
            oldData ? JSON.stringify(oldData) : null,
            newData ? JSON.stringify(newData) : null,
            ipAddress || null,
            userAgent || null,
        ]);
    }
    catch (error) {
        console.error('[AuditLog] Failed to create audit log:', error.message);
        // Don't throw – audit log failure shouldn't break the main operation
    }
}
// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
export function getClientIp(req) {
    return (req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        '');
}
export function getHeaderString(req, headerName) {
    return req.headers[headerName] || '';
}
export default router;
