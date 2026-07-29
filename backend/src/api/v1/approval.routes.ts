import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware';
import pool from '../../lib/db';

const router = Router();

// ---------------------------------------------------------------------------
// Get all approval rules
// ---------------------------------------------------------------------------
router.get('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
          id,
          "ruleName",
          "requiredRoles",
          "minAmount",
          "maxAmount",
          "isActive",
          "createdAt",
          "updatedAt",
          "createdBy"
       FROM approval_rules
       ORDER BY "createdAt" DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[ApprovalRules] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch approval rules' });
  }
});

// ---------------------------------------------------------------------------
// Get single approval rule
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const result = await pool.query(
      `SELECT 
          id,
          "ruleName",
          "requiredRoles",
          "minAmount",
          "maxAmount",
          "isActive",
          "createdAt",
          "updatedAt",
          "createdBy"
       FROM approval_rules
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Approval rule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[ApprovalRules] Fetch single error:', error);
    res.status(500).json({ error: 'Failed to fetch approval rule' });
  }
});

// ---------------------------------------------------------------------------
// Create approval rule
// ---------------------------------------------------------------------------
router.post('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { ruleName, requiredRoles, minAmount, maxAmount } = req.body;
    const userId = req.user!.id;

    // Validate
    if (!ruleName || !requiredRoles || requiredRoles.length === 0) {
      return res.status(400).json({ error: 'ruleName and requiredRoles are required' });
    }

    const result = await pool.query(
      `INSERT INTO approval_rules (
        "ruleName",
        "requiredRoles",
        "minAmount",
        "maxAmount",
        "isActive",
        "createdBy",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())
      RETURNING *`,
      [ruleName, JSON.stringify(requiredRoles), minAmount || null, maxAmount || null, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[ApprovalRules] Create error:', error);
    res.status(500).json({ error: 'Failed to create approval rule' });
  }
});

// ---------------------------------------------------------------------------
// Update approval rule
// ---------------------------------------------------------------------------
router.put('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { ruleName, requiredRoles, minAmount, maxAmount, isActive } = req.body;

    // Check exists
    const checkResult = await pool.query('SELECT id FROM approval_rules WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Approval rule not found' });
    }

    await pool.query(
      `UPDATE approval_rules 
       SET "ruleName" = $1,
           "requiredRoles" = $2,
           "minAmount" = $3,
           "maxAmount" = $4,
           "isActive" = $5,
           "updatedAt" = NOW()
       WHERE id = $6`,
      [ruleName, JSON.stringify(requiredRoles), minAmount || null, maxAmount || null, isActive, id]
    );

    // Fetch updated
    const updated = await pool.query('SELECT * FROM approval_rules WHERE id = $1', [id]);

    res.json(updated.rows[0]);
  } catch (error) {
    console.error('[ApprovalRules] Update error:', error);
    res.status(500).json({ error: 'Failed to update approval rule' });
  }
});

// ---------------------------------------------------------------------------
// Delete approval rule
// ---------------------------------------------------------------------------
router.delete('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    const checkResult = await pool.query('SELECT id FROM approval_rules WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Approval rule not found' });
    }

    await pool.query('DELETE FROM approval_rules WHERE id = $1', [id]);
    res.json({ message: 'Approval rule deleted' });
  } catch (error) {
    console.error('[ApprovalRules] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete approval rule' });
  }
});

// ---------------------------------------------------------------------------
// Toggle active status
// ---------------------------------------------------------------------------
router.patch('/:id/toggle', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    const checkResult = await pool.query('SELECT id, "isActive" FROM approval_rules WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Approval rule not found' });
    }

    const newStatus = !checkResult.rows[0].isActive;

    await pool.query(
      `UPDATE approval_rules SET "isActive" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [newStatus, id]
    );

    res.json({ message: `Approval rule ${newStatus ? 'activated' : 'deactivated'}`, isActive: newStatus });
  } catch (error) {
    console.error('[ApprovalRules] Toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle approval rule' });
  }
});

export default router;