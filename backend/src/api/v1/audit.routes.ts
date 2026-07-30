import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware.js';
import pool from '../../lib/db.js';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function getHeaderString(req: any, headerName: string, defaultValue: string = 'system'): string {
  const value = req.headers?.[headerName];
  if (Array.isArray(value)) return value[0] || defaultValue;
  return value || defaultValue;
}

export function getClientIp(req: any): string {
  return (
    (req.ip as string) ||
    (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    '0.0.0.0'
  );
}

// ---------------------------------------------------------------------------
// Create audit log (exported for other route files)
// ---------------------------------------------------------------------------
export async function createAuditLog(
  userId: string,
  userEmail: string,
  userRole: string,
  actionType: string,
  entityType: string,
  entityId: string,
  oldValues: any = null,
  newValues: any = null,
  ipAddress: string = '0.0.0.0',
  userAgent: string = 'system'
) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (
        "userId", "userEmail", "userRole", "actionType", "entityType", "entityId",
        "oldValues", "newValues", "ipAddress", "userAgent", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        userId,
        userEmail,
        userRole,
        actionType,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent,
      ]
    );
  } catch (error) {
    console.error('[AuditLogs] Create error:', error);
  }
}

// ---------------------------------------------------------------------------
// Get audit logs (paginated, filterable)
// ---------------------------------------------------------------------------
router.get('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, actionType, entityType, userId, userRole, startDate, endDate, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `SELECT id, "userId", "userEmail", "userRole", "actionType", "entityType", "entityId", "oldValues", "newValues", "ipAddress", "userAgent", "createdAt" FROM audit_logs WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1`;

    const params: any[] = [];
    let paramCount = 1;

    if (actionType) { query += ` AND "actionType" = $${paramCount++}`; countQuery += ` AND "actionType" = $${paramCount - 1}`; params.push(actionType); }
    if (entityType) { query += ` AND "entityType" = $${paramCount++}`; countQuery += ` AND "entityType" = $${paramCount - 1}`; params.push(entityType); }
    if (userId) { query += ` AND "userId" = $${paramCount++}`; countQuery += ` AND "userId" = $${paramCount - 1}`; params.push(userId); }
    if (userRole) { query += ` AND "userRole" = $${paramCount++}`; countQuery += ` AND "userRole" = $${paramCount - 1}`; params.push(userRole); }
    if (startDate) { query += ` AND "createdAt" >= $${paramCount++}`; countQuery += ` AND "createdAt" >= $${paramCount - 1}`; params.push(startDate); }
    if (endDate) { query += ` AND "createdAt" <= $${paramCount++}`; countQuery += ` AND "createdAt" <= $${paramCount - 1}`; params.push(endDate); }
    if (search) { query += ` AND ("userEmail" ILIKE $${paramCount} OR "actionType" ILIKE $${paramCount} OR "entityType" ILIKE $${paramCount})`; countQuery += ` AND ("userEmail" ILIKE $${paramCount} OR "actionType" ILIKE $${paramCount} OR "entityType" ILIKE $${paramCount})`; params.push(`%${search}%`); paramCount++; }

    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    query += ` ORDER BY "createdAt" DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);

    res.json({ data: result.rows, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    console.error('[AuditLogs] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ---------------------------------------------------------------------------
// Get single audit log
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const result = await pool.query(`SELECT * FROM audit_logs WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Audit log not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[AuditLogs] Fetch single error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

export default router;