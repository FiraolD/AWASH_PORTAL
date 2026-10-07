import { Router } from 'express';
import { authenticate, authorizeExecutives } from '../../middleware/auth.middleware.js';
import pool from '../../lib/db.js';
const router = Router();
// ===========================================================================
// GET all assignment rules
// ===========================================================================
router.get('/', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const result = await pool.query(`SELECT 
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
       WHERE "isActive" = true
       ORDER BY "priorityLevel" ASC, "createdAt" DESC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('[AssignmentRules] Fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch assignment rules' });
    }
});
// ===========================================================================
// CREATE assignment rule
// ===========================================================================
router.post('/', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const { ruleName, productType, minAmount, maxAmount, assignedRole, priorityLevel, isActive } = req.body;
        if (!ruleName || !productType || !assignedRole) {
            return res.status(400).json({ error: 'ruleName, productType, and assignedRole are required' });
        }
        const result = await pool.query(`INSERT INTO claims_assignment_rules (
          "ruleName", "productType", "minAmount", "maxAmount",
          "assignedRole", "priorityLevel", "isActive", "createdAt", "updatedAt"
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
       RETURNING *`, [
            ruleName,
            productType,
            minAmount || 0,
            maxAmount || null,
            assignedRole,
            priorityLevel || 0,
            isActive !== undefined ? isActive : true,
        ]);
        console.log('[AssignmentRules] Created:', result.rows[0].id);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('[AssignmentRules] Create error:', error.message);
        res.status(500).json({ error: 'Failed to create assignment rule', detail: error.message });
    }
});
// ===========================================================================
// UPDATE assignment rule
// ===========================================================================
router.put('/:id', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const id = String(req.params.id);
        const { ruleName, productType, minAmount, maxAmount, assignedRole, priorityLevel, isActive } = req.body;
        const oldResult = await pool.query('SELECT * FROM claims_assignment_rules WHERE id = $1', [id]);
        if (oldResult.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment rule not found' });
        }
        const oldData = oldResult.rows[0];
        await pool.query(`UPDATE claims_assignment_rules 
       SET 
          "ruleName"      = $1,
          "productType"   = $2,
          "minAmount"     = $3,
          "maxAmount"     = $4,
          "assignedRole"  = $5,
          "priorityLevel" = $6,
          "isActive"      = $7,
          "updatedAt"     = NOW()
       WHERE id = $8`, [
            ruleName ?? oldData.ruleName,
            productType ?? oldData.productType,
            minAmount !== undefined ? minAmount : oldData.minAmount,
            maxAmount !== undefined ? maxAmount : oldData.maxAmount,
            assignedRole ?? oldData.assignedRole,
            priorityLevel !== undefined ? priorityLevel : oldData.priorityLevel,
            isActive !== undefined ? isActive : oldData.isActive,
            id,
        ]);
        const updated = await pool.query('SELECT * FROM claims_assignment_rules WHERE id = $1', [id]);
        res.json(updated.rows[0]);
    }
    catch (error) {
        console.error('[AssignmentRules] Update error:', error.message);
        res.status(500).json({ error: 'Failed to update assignment rule' });
    }
});
// ===========================================================================
// DELETE assignment rule
// ===========================================================================
router.delete('/:id', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const id = String(req.params.id);
        const oldResult = await pool.query('SELECT * FROM claims_assignment_rules WHERE id = $1', [id]);
        if (oldResult.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment rule not found' });
        }
        await pool.query('DELETE FROM claims_assignment_rules WHERE id = $1', [id]);
        res.json({ message: 'Assignment rule deleted' });
    }
    catch (error) {
        console.error('[AssignmentRules] Delete error:', error.message);
        res.status(500).json({ error: 'Failed to delete assignment rule' });
    }
});
// ===========================================================================
// TOGGLE active/inactive
// ===========================================================================
router.patch('/:id/toggle', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const id = String(req.params.id);
        const checkResult = await pool.query('SELECT id, "isActive", "ruleName" FROM claims_assignment_rules WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment rule not found' });
        }
        const newStatus = !checkResult.rows[0].isActive;
        await pool.query(`UPDATE claims_assignment_rules SET "isActive" = $1, "updatedAt" = NOW() WHERE id = $2`, [newStatus, id]);
        res.json({
            message: `Assignment rule ${newStatus ? 'activated' : 'deactivated'}`,
            isActive: newStatus,
        });
    }
    catch (error) {
        console.error('[AssignmentRules] Toggle error:', error.message);
        res.status(500).json({ error: 'Failed to toggle assignment rule' });
    }
});
export default router;
