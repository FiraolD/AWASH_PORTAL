import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware';

import pool from '../../lib/db';

const router = Router();

// ---------------------------------------------------------------------------
// Get all role levels
// ---------------------------------------------------------------------------
router.get('/', authenticate, authorizeExecutives, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          id,
          "roleName",
          "displayName",
          "hierarchyLevel",
          department,
          "canApprove",
          "canReject",
          "canReview",
          "maxApprovalAmount",
          "isActive",
          "createdAt",
          "updatedAt"
       FROM role_levels
       ORDER BY "hierarchyLevel" ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[RoleLevels] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch role levels' });
  }
});

// ---------------------------------------------------------------------------
// Get active role levels by department
// ---------------------------------------------------------------------------
router.get('/active/:department', authenticate, async (req, res) => {
  try {
    const { department } = req.params;

    const result = await pool.query(
      `SELECT 
          id,
          "roleName",
          "displayName",
          "hierarchyLevel",
          "canApprove",
          "canReject",
          "canReview",
          "maxApprovalAmount"
       FROM role_levels
       WHERE department = $1 AND "isActive" = true
       ORDER BY "hierarchyLevel" ASC`,
      [department]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[RoleLevels] Fetch active error:', error);
    res.status(500).json({ error: 'Failed to fetch active role levels' });
  }
});

// ---------------------------------------------------------------------------
// Get single role level
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, authorizeExecutives, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM role_levels WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Role level not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[RoleLevels] Fetch single error:', error);
    res.status(500).json({ error: 'Failed to fetch role level' });
  }
});

// ---------------------------------------------------------------------------
// Update role level
// ---------------------------------------------------------------------------
router.put('/:id', authenticate, authorizeExecutives, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      displayName,
      hierarchyLevel,
      department,
      canApprove,
      canReject,
      canReview,
      maxApprovalAmount,
      isActive,
    } = req.body;

    // Check exists
    const oldResult = await pool.query('SELECT * FROM role_levels WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Role level not found' });
    }

    const oldData = oldResult.rows[0];

    await pool.query(
      `UPDATE role_levels 
       SET "displayName" = $1,
           "hierarchyLevel" = $2,
           department = $3,
           "canApprove" = $4,
           "canReject" = $5,
           "canReview" = $6,
           "maxApprovalAmount" = $7,
           "isActive" = $8,
           "updatedAt" = NOW()
       WHERE id = $9`,
      [
        displayName !== undefined ? displayName : oldData.displayName,
        hierarchyLevel !== undefined ? hierarchyLevel : oldData.hierarchyLevel,
        department !== undefined ? department : oldData.department,
        canApprove !== undefined ? canApprove : oldData.canApprove,
        canReject !== undefined ? canReject : oldData.canReject,
        canReview !== undefined ? canReview : oldData.canReview,
        maxApprovalAmount !== undefined ? maxApprovalAmount : oldData.maxApprovalAmount,
        isActive !== undefined ? isActive : oldData.isActive,
        id,
      ]
    );

    // Fetch updated
    const updated = await pool.query('SELECT * FROM role_levels WHERE id = $1', [id]);

    // Log audit
    const { createAuditLog } = await import('./auditLogs.routes');
    createAuditLog(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'UPDATE',
      'ROLE_LEVEL',
      id,
      oldData,
      updated.rows[0],
      req.ip || '0.0.0.0',
      req.headers['user-agent'] || 'system'
    );

    res.json(updated.rows[0]);
  } catch (error) {
    console.error('[RoleLevels] Update error:', error);
    res.status(500).json({ error: 'Failed to update role level' });
  }
});

// ---------------------------------------------------------------------------
// Toggle active status
// ---------------------------------------------------------------------------
router.patch('/:id/toggle', authenticate, authorizeExecutives, async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await pool.query(
      'SELECT id, "isActive", "roleName" FROM role_levels WHERE id = $1',
      [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Role level not found' });
    }

    const newStatus = !checkResult.rows[0].isActive;

    await pool.query(
      `UPDATE role_levels SET "isActive" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [newStatus, id]
    );

    res.json({
      message: `Role level ${newStatus ? 'activated' : 'deactivated'}`,
      isActive: newStatus,
    });
  } catch (error) {
    console.error('[RoleLevels] Toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle role level' });
  }
});

export default router;