import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Get audit logs
router.get('/', authenticate, authorize('MASTER_ADMIN', 'AUDITOR'), async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `
      SELECT al.*, u.email, u."firstName", u."lastName"
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (action) {
      query += ` AND al.action = $${paramIndex++}`;
      params.push(action);
    }
    if (userId) {
      query += ` AND al.user_id = $${paramIndex++}`;
      params.push(userId);
    }
    if (startDate) {
      query += ` AND al.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND al.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(Number(limit), offset);
    
    const result = await pool.query(query, params);
    
    const countResult = await pool.query('SELECT COUNT(*) FROM audit_logs');
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      logs: result.rows,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Create audit log (internal use)
router.post('/', async (req, res) => {
  try {
    const { user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent } = req.body;
    
    const result = await pool.query(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

// Get audit log by ID
router.get('/:id', authenticate, authorize('MASTER_ADMIN', 'AUDITOR'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT al.*, u.email, u."firstName", u."lastName"
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit log not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Get audit log actions list
router.get('/actions/list', authenticate, authorize('MASTER_ADMIN', 'AUDITOR'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      GROUP BY action
      ORDER BY count DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch audit actions:', error);
    res.json([]);
  }
});

export default router;