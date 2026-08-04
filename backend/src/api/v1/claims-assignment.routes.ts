import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware.js';
import pool from '../../lib/db.js';
import { createAuditLog, getClientIp, getHeaderString } from './audit.routes.js';

const router = Router();

// ===========================================================================
// GET all assignment rules
// ===========================================================================
router.get('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
          id, 
          "ruleName", 
          "productType", 
          "minAmount", 
          "maxAmount",
          "assignedRole", 
          "priorityLevel", 
          "isActive", 
          "createdAt", 
          "updatedAt"
       FROM claims_assignment_rules 
       ORDER BY "priorityLevel" ASC, "createdAt" DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[AssignmentRules] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch assignment rules' });
  }
});

// ===========================================================================
// CREATE assignment rule
// ===========================================================================
router.post('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { ruleName, productType, minAmount, maxAmount, assignedRole, priorityLevel, isActive } = req.body;

    if (!ruleName || !productType || !assignedRole) {
      return res.status(400).json({ error: 'ruleName, productType, and assignedRole are required' });
    }

    const result = await pool.query(
      `INSERT INTO claims_assignment_rules (
          "ruleName",         -- $1
          "productType",      -- $2
          "minAmount",        -- $3
          "maxAmount",        -- $4
          "assignedRole",     -- $5
          "priorityLevel",    -- $6
          "isActive",         -- $7
          "createdBy",        -- $8
          "createdAt",        -- NOW()
          "updatedAt"         -- NOW()
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) 
       RETURNING *`,
      [
        ruleName,                                 // $1
        productType,                              // $2
        minAmount ?? null,                        // $3
        maxAmount ?? null,                        // $4
        assignedRole,                             // $5
        priorityLevel || 0,                       // $6
        isActive !== undefined ? isActive : true, // $7
        req.user!.id,                             // $8
      ]
    );

    await createAuditLog(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'CREATE',
      'CLAIMS_ASSIGNMENT_RULE',
      result.rows[0].id,
      null,
      result.rows[0],
      getClientIp(req),
      getHeaderString(req, 'user-agent')
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[AssignmentRules] Create error:', error);
    res.status(500).json({ error: 'Failed to create assignment rule' });
  }
});

// ===========================================================================
// UPDATE assignment rule
// ===========================================================================
router.put('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { ruleName, productType, minAmount, maxAmount, assignedRole, priorityLevel, isActive } = req.body;

    // Check if exists
    const oldResult = await pool.query(
      'SELECT * FROM claims_assignment_rules WHERE id = $1',
      [id]
    );
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment rule not found' });
    }
    const oldData = oldResult.rows[0];

    // Update with proper placeholders
    await pool.query(
      `UPDATE claims_assignment_rules 
       SET 
          "ruleName"      = $1,
          "productType"   = $2,
          "minAmount"     = $3,
          "maxAmount"     = $4,
          "assignedRole"  = $5,
          "priorityLevel" = $6,
          "isActive"      = $7,
          "updatedAt"     = NOW()
       WHERE id = $8`,
      [
        ruleName ?? oldData.ruleName,                            // $1
        productType ?? oldData.productType,                      // $2
        minAmount !== undefined ? minAmount : oldData.minAmount, // $3
        maxAmount !== undefined ? maxAmount : oldData.maxAmount, // $4
        assignedRole ?? oldData.assignedRole,                    // $5
        priorityLevel !== undefined ? priorityLevel : oldData.priorityLevel, // $6
        isActive !== undefined ? isActive : oldData.isActive,    // $7
        id,                                                      // $8
      ]
    );

    // Fetch updated record
    const updated = await pool.query(
      'SELECT * FROM claims_assignment_rules WHERE id = $1',
      [id]
    );

    await createAuditLog(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'UPDATE',
      'CLAIMS_ASSIGNMENT_RULE',
      id,
      oldData,
      updated.rows[0],
      getClientIp(req),
      getHeaderString(req, 'user-agent')
    );

    res.json(updated.rows[0]);
  } catch (error) {
    console.error('[AssignmentRules] Update error:', error);
    res.status(500).json({ error: 'Failed to update assignment rule' });
  }
});

// ===========================================================================
// DELETE assignment rule
// ===========================================================================
router.delete('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    const oldResult = await pool.query(
      'SELECT * FROM claims_assignment_rules WHERE id = $1',
      [id]
    );
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment rule not found' });
    }

    await pool.query('DELETE FROM claims_assignment_rules WHERE id = $1', [id]);

    await createAuditLog(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'DELETE',
      'CLAIMS_ASSIGNMENT_RULE',
      id,
      oldResult.rows[0],
      null,
      getClientIp(req),
      getHeaderString(req, 'user-agent')
    );

    res.json({ message: 'Assignment rule deleted' });
  } catch (error) {
    console.error('[AssignmentRules] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete assignment rule' });
  }
});

// ===========================================================================
// TOGGLE active/inactive
// ===========================================================================
router.patch('/:id/toggle', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    const checkResult = await pool.query(
      'SELECT id, "isActive", "ruleName" FROM claims_assignment_rules WHERE id = $1',
      [id]
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
      req.user!.id,
      req.user!.email,
      req.user!.role,
      newStatus ? 'ACTIVATE' : 'DEACTIVATE',
      'CLAIMS_ASSIGNMENT_RULE',
      id,
      { isActive: !newStatus, ruleName: checkResult.rows[0].ruleName },
      { isActive: newStatus, ruleName: checkResult.rows[0].ruleName },
      getClientIp(req),
      getHeaderString(req, 'user-agent')
    );

    res.json({
      message: `Assignment rule ${newStatus ? 'activated' : 'deactivated'}`,
      isActive: newStatus,
    });
  } catch (error) {
    console.error('[AssignmentRules] Toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle assignment rule' });
  }
});

export default router;