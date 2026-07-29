import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Get assignment rules
router.get('/assignment-rules', authenticate, authorize('MASTER_ADMIN', 'CLAIMS_ADMIN', 'MANAGER_CLAIMS', 'HEAD_CLAIMS'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM claims_assignment_rules WHERE is_active = true ORDER BY priority ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch assignment rules:', error);
    res.json([]);
  }
});

// Create assignment rule
router.post('/assignment-rules', authenticate, authorize('MASTER_ADMIN', 'CLAIMS_ADMIN', 'MANAGER_CLAIMS', 'HEAD_CLAIMS'), async (req, res) => {
  try {
    const { rule_name, product_type, min_amount, max_amount, assigned_role, priority } = req.body;
    
    const result = await pool.query(
      `INSERT INTO claims_assignment_rules (id, rule_name, product_type, min_amount, max_amount, assigned_role, priority, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())
       RETURNING *`,
      [rule_name, product_type, min_amount, max_amount || null, assigned_role, priority]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create assignment rule:', error);
    res.status(500).json({ error: 'Failed to create assignment rule' });
  }
});

// Update assignment rule
router.put('/assignment-rules/:id', authenticate, authorize('MASTER_ADMIN', 'MANAGER_CLAIMS', 'HEAD_CLAIMS'), async (req, res) => {
  try {
    const { rule_name, product_type, min_amount, max_amount, assigned_role, priority, is_active } = req.body;
    
    const result = await pool.query(
      `UPDATE claims_assignment_rules 
       SET rule_name = COALESCE($1, rule_name),
           product_type = COALESCE($2, product_type),
           min_amount = COALESCE($3, min_amount),
           max_amount = COALESCE($4, max_amount),
           assigned_role = COALESCE($5, assigned_role),
           priority = COALESCE($6, priority),
           is_active = COALESCE($7, is_active),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [rule_name, product_type, min_amount, max_amount, assigned_role, priority, is_active, req.params.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update assignment rule:', error);
    res.status(500).json({ error: 'Failed to update assignment rule' });
  }
});

// Delete assignment rule
router.delete('/assignment-rules/:id', authenticate, authorize('MASTER_ADMIN, MANAGER_CLAIMS, HEAD_CLAIMS'), async (req, res) => {
  try {
    await pool.query('DELETE FROM claims_assignment_rules WHERE id = $1', [req.params.id]);
    res.json({ message: 'Assignment rule deleted successfully' });
  } catch (error) {
    console.error('Failed to delete assignment rule:', error);
    res.status(500).json({ error: 'Failed to delete assignment rule' });
  }
});

// Assign claim to officer
router.post('/claims/:claimId/assign', authenticate, authorize('CLAIMS_ADMIN', 'MANAGER_CLAIMS', 'HEAD_CLAIMS', 'MASTER_ADMIN'), async (req, res) => {
  try {
    const { officerId } = req.body;
    
    await pool.query(
      `UPDATE claims 
       SET "assignedTo" = $1, status = 'ASSIGNED', "updatedAt" = NOW()
       WHERE id = $2`,
      [officerId, req.params.claimId]
    );
    
    res.json({ message: 'Claim assigned successfully' });
  } catch (error) {
    console.error('Failed to assign claim:', error);
    res.status(500).json({ error: 'Failed to assign claim' });
  }
});

// Get claim officers
router.get('/officers', authenticate, authorize('MASTER_ADMIN', 'CLAIMS_ADMIN', 'MANAGER_CLAIMS', 'HEAD_CLAIMS'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT co.*, u."firstName", u."lastName", u.email
      FROM claim_officers co
      JOIN users u ON u.id = co.user_id
      WHERE co.is_active = true
      ORDER BY co.role_level ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch claim officers:', error);
    res.json([]);
  }
});

export default router;