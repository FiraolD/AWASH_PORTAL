import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware.js';
import pool from '../../lib/db.js';
import { createAuditLog, getClientIp, getHeaderString } from './audit.routes';

const router = Router();

// Get all
router.get('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, "roleName", "displayName", "hierarchyLevel", department, "canApprove", "canReject", "canReview", "maxApprovalAmount", "isActive", "createdAt", "updatedAt"
       FROM role_levels ORDER BY "hierarchyLevel"`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[RoleLevels] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch role levels' });
  }
});

// Get active by department
router.get('/active/:department', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, "roleName", "displayName", "hierarchyLevel", "canApprove", "canReject", "canReview", "maxApprovalAmount"
       FROM role_levels WHERE department=$1 AND "isActive"=true ORDER BY "hierarchyLevel"`,
      [req.params.department]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[RoleLevels] Active error:', error);
    res.status(500).json({ error: 'Failed to fetch active role levels' });
  }
});

// Update
router.put('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const oldResult = await pool.query('SELECT * FROM role_levels WHERE id=$1', [id]);
    if (oldResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const oldData = oldResult.rows[0];
    const d = req.body;

    await pool.query(
      `UPDATE role_levels SET "displayName"=$1,"hierarchyLevel"=$2,department=$3,"canApprove"=$4,"canReject"=$5,"canReview"=$6,"maxApprovalAmount"=$7,"isActive"=$8,"updatedAt"=NOW() WHERE id=$9`,
      [d.displayName !== undefined ? d.displayName : oldData.displayName, d.hierarchyLevel !== undefined ? d.hierarchyLevel : oldData.hierarchyLevel, d.department !== undefined ? d.department : oldData.department, d.canApprove !== undefined ? d.canApprove : oldData.canApprove, d.canReject !== undefined ? d.canReject : oldData.canReject, d.canReview !== undefined ? d.canReview : oldData.canReview, d.maxApprovalAmount !== undefined ? d.maxApprovalAmount : oldData.maxApprovalAmount, d.isActive !== undefined ? d.isActive : oldData.isActive, id]
    );

    const updated = await pool.query('SELECT * FROM role_levels WHERE id=$1', [id]);
    await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'UPDATE', 'ROLE_LEVEL', id, oldData, updated.rows[0], getClientIp(req), getHeaderString(req, 'user-agent'));
    res.json(updated.rows[0]);
  } catch (error) {
    console.error('[RoleLevels] Update error:', error);
    res.status(500).json({ error: 'Failed to update role level' });
  }
});

// Toggle
router.patch('/:id/toggle', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const checkResult = await pool.query('SELECT id, "isActive", "roleName" FROM role_levels WHERE id=$1', [id]);
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const newStatus = !checkResult.rows[0].isActive;
    await pool.query(`UPDATE role_levels SET "isActive"=$1, "updatedAt"=NOW() WHERE id=$2`, [newStatus, id]);
    res.json({ message: `Role level ${newStatus ? 'activated' : 'deactivated'}`, isActive: newStatus });
  } catch (error) {
    console.error('[RoleLevels] Toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle role level' });
  }
});

export default router;