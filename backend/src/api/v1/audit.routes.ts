import { Router, Response } from 'express';
import { authenticate, authorizeExecutives } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../middleware/auth.middleware.ts;
import pool from '../../lib/db';

const router = Router();

// ---------------------------------------------------------------------------
// Get audit logs (paginated, filterable)
// ---------------------------------------------------------------------------
router.get('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      actionType, 
      entityType, 
      userId, 
      userRole,
      startDate,
      endDate,
      search 
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = `SELECT 
        id,
        "userId",
        "userEmail",
        "userRole",
        "actionType",
        "entityType",
        "entityId",
        "oldValues",
        "newValues",
        "ipAddress",
        "userAgent",
        "createdAt"
     FROM audit_logs WHERE 1=1`;

    let countQuery = `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1`;

    const params: any[] = [];
    let paramCount = 1;

    // Filters
    if (actionType) {
      const condition = ` AND "actionType" = $${paramCount++}`;
      query += condition;
      countQuery += condition;
      params.push(actionType);
    }

    if (entityType) {
      const condition = ` AND "entityType" = $${paramCount++}`;
      query += condition;
      countQuery += condition;
      params.push(entityType);
    }

    if (userId) {
      const condition = ` AND "userId" = $${paramCount++}`;
      query += condition;
      countQuery += condition;
      params.push(userId);
    }

    if (userRole) {
      const condition = ` AND "userRole" = $${paramCount++}`;
      query += condition;
      countQuery += condition;
      params.push(userRole);
    }

    if (startDate) {
      const condition = ` AND "createdAt" >= $${paramCount++}`;
      query += condition;
      countQuery += condition;
      params.push(startDate);
    }

    if (endDate) {
      const condition = ` AND "createdAt" <= $${paramCount++}`;
      query += condition;
      countQuery += condition;
      params.push(endDate);
    }

    if (search) {
      const condition = ` AND ("userEmail" ILIKE $${paramCount} OR "actionType" ILIKE $${paramCount} OR "entityType" ILIKE $${paramCount})`;
      query += condition;
      countQuery += condition;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Count
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Data
    query += ` ORDER BY "createdAt" DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      data: result.rows,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error('[AuditLogs] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ---------------------------------------------------------------------------
// Get audit log by ID
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
          id,
          "userId",
          "userEmail",
          "userRole",
          "actionType",
          "entityType",
          "entityId",
          "oldValues",
          "newValues",
          "ipAddress",
          "userAgent",
          "createdAt"
       FROM audit_logs
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[AuditLogs] Fetch single error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// ---------------------------------------------------------------------------
// Create audit log (internal use)
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
        "userId",
        "userEmail",
        "userRole",
        "actionType",
        "entityType",
        "entityId",
        "oldValues",
        "newValues",
        "ipAddress",
        "userAgent",
        "createdAt"
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
// Get audit log statistics
// ---------------------------------------------------------------------------
router.get('/stats/summary', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
          COUNT(*) as "totalLogs",
          COUNT(DISTINCT "userId") as "uniqueUsers",
          COUNT(DISTINCT "actionType") as "uniqueActions",
          COUNT(DISTINCT "entityType") as "uniqueEntities",
          MIN("createdAt") as "firstLog",
          MAX("createdAt") as "lastLog"
       FROM audit_logs`
    );

    const actionBreakdown = await pool.query(
      `SELECT "actionType", COUNT(*) as count
       FROM audit_logs
       GROUP BY "actionType"
       ORDER BY count DESC
       LIMIT 10`
    );

    const dailyActivity = await pool.query(
      `SELECT 
          DATE("createdAt") as date,
          COUNT(*) as count
       FROM audit_logs
       WHERE "createdAt" >= NOW() - INTERVAL '30 days'
       GROUP BY DATE("createdAt")
       ORDER BY date DESC`
    );

    res.json({
      summary: result.rows[0],
      actionBreakdown: actionBreakdown.rows,
      dailyActivity: dailyActivity.rows,
    });
  } catch (error) {
    console.error('[AuditLogs] Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch audit stats' });
  }
});

// ---------------------------------------------------------------------------
// Export audit logs (CSV)
// ---------------------------------------------------------------------------
router.get('/export', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, actionType } = req.query;

    let query = `SELECT * FROM audit_logs WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND "createdAt" >= $${paramCount++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND "createdAt" <= $${paramCount++}`;
      params.push(endDate);
    }
    if (actionType) {
      query += ` AND "actionType" = $${paramCount++}`;
      params.push(actionType);
    }

    query += ` ORDER BY "createdAt" DESC LIMIT 10000`;

    const result = await pool.query(query, params);

    // Convert to CSV
    const headers = ['ID', 'User ID', 'User Email', 'User Role', 'Action Type', 'Entity Type', 'Entity ID', 'Old Values', 'New Values', 'IP Address', 'User Agent', 'Created At'];
    const csvRows = [headers.join(',')];

    result.rows.forEach((row: any) => {
      csvRows.push([
        row.id,
        row.userId,
        `"${row.userEmail}"`,
        row.userRole,
        row.actionType,
        row.entityType,
        row.entityId,
        `"${(row.oldValues || '').replace(/"/g, '""')}"`,
        `"${(row.newValues || '').replace(/"/g, '""')}"`,
        row.ipAddress,
        `"${row.userAgent}"`,
        row.createdAt,
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('[AuditLogs] Export error:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

// ---------------------------------------------------------------------------
// Delete old audit logs (cleanup)
// ---------------------------------------------------------------------------
router.delete('/cleanup', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { olderThanDays = 365 } = req.body;

    const result = await pool.query(
      `DELETE FROM audit_logs WHERE "createdAt" < NOW() - INTERVAL '1 day' * $1`,
      [olderThanDays]
    );

    res.json({ 
      message: 'Old audit logs deleted',
      deletedCount: result.rowCount 
    });
  } catch (error) {
    console.error('[AuditLogs] Cleanup error:', error);
    res.status(500).json({ error: 'Failed to delete old audit logs' });
  }
});

export default router;