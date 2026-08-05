import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware.js';
import pool from '../../lib/db.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET audit logs with pagination
// ---------------------------------------------------------------------------
router.get('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const entityType = req.query.entityType as string;
    const action = req.query.action as string;

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

    const params: any[] = [];
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
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM (${query}) AS filtered`,
      params
    );
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
  } catch (error: any) {
    console.error('[AuditLogs] Fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ---------------------------------------------------------------------------
// Helper function to create audit logs (called by other routes)
// ---------------------------------------------------------------------------
export async function createAuditLog(
  userId: string,
  userEmail: string,
  userRole: string,
  action: string,
  entityType: string,
  entityId: string,
  oldData: any,
  newData: any,
  ipAddress: string,
  userAgent: string
) {
  try {
    // Note: your table only has "userId", not "userEmail" or "userRole"
    // We store email and role in the oldValues/newValues if needed
    await pool.query(
      `INSERT INTO audit_logs (
        "userId",
        action,
        "entityType",
        "entityId",
        "oldValues",
        "newValues",
        "ipAddress",
        "userAgent",
        "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        ipAddress || null,
        userAgent || null,
      ]
    );
  } catch (error: any) {
    console.error('[AuditLog] Failed to create audit log:', error.message);
    // Don't throw – audit log failure shouldn't break the main operation
  }
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
export function getClientIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    ''
  );
}

export function getHeaderString(req: any, headerName: string): string {
  return req.headers[headerName] || '';
}

export default router;