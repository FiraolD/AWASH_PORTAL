import { Router, Response } from 'express';
import { authenticate, authorizeExecutives } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types';
import pool from '../../config/database';
import { createAuditLog } from './auditLogs.routes'; // ✅ Static import

const router = Router();

// ---------------------------------------------------------------------------
// Get all assignment rules
// ---------------------------------------------------------------------------
router.get('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
          id,
          "ruleName",
          "productType",
          "claimType",
          "minAmount",
          "maxAmount",
          "assignedRole",
          "priorityLevel",
          "isActive",
          "createdAt",
          "updatedAt",
          "createdBy"
       FROM claims_assignment_rules
       ORDER BY "priorityLevel" ASC, "createdAt" DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[AssignmentRules] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch assignment rules' });
  }
});

// ---------------------------------------------------------------------------
// Create assignment rule
// ---------------------------------------------------------------------------
router.post('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { ruleName, productType, claimType, minAmount, maxAmount, assignedRole, priorityLevel } = req.body;
    const userId = req.user!.id;

    if (!ruleName || !productType || !assignedRole) {
      return res.status(400).json({ error: 'ruleName, productType, and assignedRole are required' });
    }

    const result = await pool.query(
      `INSERT INTO claims_assignment_rules (
        "ruleName", "productType", "claimType", "minAmount", "maxAmount",
        "assignedRole", "priorityLevel", "isActive", "createdBy", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW(), NOW())
      RETURNING *`,
      [ruleName, productType, claimType || null, minAmount || null, maxAmount || null, assignedRole, priorityLevel || 0, userId]
    );

    // ✅ Static audit log call
    await createAuditLog(
      req.user!.id, req.user!.email, req.user!.role,
      'CREATE', 'CLAIMS_ASSIGNMENT_RULE', result.rows[0].id,
      null, result.rows[0],
      req.ip || '0.0.0.0', req.headers?.['user-agent'] || 'system'
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[AssignmentRules] Create error:', error);
    res.status(500).json({ error: 'Failed to create assignment rule' });
  }
});

// ---------------------------------------------------------------------------
// Update assignment rule
// ---------------------------------------------------------------------------
router.put('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { ruleName, productType, claimType, minAmount, maxAmount, assignedRole, priorityLevel, isActive } = req.body;

    const oldResult = await pool.query('SELECT * FROM claims_assignment_rules WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment rule not found' });
    }

    const oldData = oldResult.rows[0];

    await pool.query(
      `UPDATE claims_assignment_rules 
       SET "ruleName" = $1, "productType" = $2, "claimType" = $3, "minAmount" = $4,
           "maxAmount" = $5, "assignedRole" = $6, "priorityLevel" = $7, "isActive" = $8, "updatedAt" = NOW()
       WHERE id = $9`,
      [
        ruleName || oldData.ruleName, productType || oldData.productType,
        claimType !== undefined ? claimType : oldData.claimType,
        minAmount !== undefined ? minAmount : oldData.minAmount,
        maxAmount !== undefined ? maxAmount : oldData.maxAmount,
        assignedRole || oldData.assignedRole,
        priorityLevel !== undefined ? priorityLevel : oldData.priorityLevel,
        isActive !== undefined ? isActive : oldData.isActive,
        id,
      ]
    );

    const updated = await pool.query('SELECT * FROM claims_assignment_rules WHERE id = $1', [id]);

    // ✅ Static audit log call
    await createAuditLog(
      req.user!.id, req.user!.email, req.user!.role,
      'UPDATE', 'CLAIMS_ASSIGNMENT_RULE', id,
      oldData, updated.rows[0],
      req.ip || '0.0.0.0', req.headers?.['user-agent'] || 'system'
    );

    res.json(updated.rows[0]);
  } catch (error) {
    console.error('[AssignmentRules] Update error:', error);
    res.status(500).json({ error: 'Failed to update assignment rule' });
  }
});

// ---------------------------------------------------------------------------
// Delete assignment rule
// ---------------------------------------------------------------------------
router.delete('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const oldResult = await pool.query('SELECT * FROM claims_assignment_rules WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment rule not found' });
    }

    await pool.query('DELETE FROM claims_assignment_rules WHERE id = $1', [id]);

    // ✅ Static audit log call
    await createAuditLog(
      req.user!.id, req.user!.email, req.user!.role,
      'DELETE', 'CLAIMS_ASSIGNMENT_RULE', id,
      oldResult.rows[0], null,
      req.ip || '0.0.0.0', req.headers?.['user-agent'] || 'system'
    );

    res.json({ message: 'Assignment rule deleted' });
  } catch (error) {
    console.error('[AssignmentRules] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete assignment rule' });
  }
});

// ---------------------------------------------------------------------------
// Toggle active status
// ---------------------------------------------------------------------------
router.patch('/:id/toggle', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const checkResult = await pool.query(
      'SELECT id, "isActive", "ruleName" FROM claims_assignment_rules WHERE id = $1', [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment rule not found' });
    }

    const newStatus = !checkResult.rows[0].isActive;

    await pool.query(
      `UPDATE claims_assignment_rules SET "isActive" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [newStatus, id]
    );

    await createAuditLog(
      req.user!.id, req.user!.email, req.user!.role,
      newStatus ? 'ACTIVATE' : 'DEACTIVATE', 'CLAIMS_ASSIGNMENT_RULE', id,
      { isActive: !newStatus, ruleName: checkResult.rows[0].ruleName },
      { isActive: newStatus, ruleName: checkResult.rows[0].ruleName },
      req.ip || '0.0.0.0', req.headers?.['user-agent'] || 'system'
    );

    res.json({ message: `Assignment rule ${newStatus ? 'activated' : 'deactivated'}`, isActive: newStatus });
  } catch (error) {
    console.error('[AssignmentRules] Toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle assignment rule' });
  }
});

export default router;