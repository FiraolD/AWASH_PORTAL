import { Router } from 'express';
import { authenticate, authorizeExecutives } from '../../middleware/auth.middleware.js';
import pool from '../../lib/db.js';
const router = Router();
// ===========================================================================
// ROLE LEVELS ROUTES
// ===========================================================================
// ---------------------------------------------------------------------------
// GET all role levels
// ---------------------------------------------------------------------------
router.get('/role-levels', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const result = await pool.query(`SELECT 
            id,
            "levelCode",
            "levelName",
            "department",
            "levelOrder",
            "canApprove",
            "canReject",
            "maxAmountLimit",
            "isActive",
            "createdAt",
            "updatedAt"
         FROM role_levels
         WHERE "isActive" = true
         ORDER BY "levelOrder" ASC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('[RoleLevels] Fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch role levels',
            detail: error.message,
        });
    }
});
// ---------------------------------------------------------------------------
// CREATE role level
// ---------------------------------------------------------------------------
router.post('/role-levels', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const { levelCode, levelName, department, levelOrder, canApprove, canReject, maxAmountLimit, isActive, } = req.body;
        // Validate required fields
        if (!levelCode || !levelName) {
            return res.status(400).json({
                error: 'levelCode and levelName are required',
            });
        }
        const result = await pool.query(`INSERT INTO role_levels (
            "levelCode",
            "levelName",
            "department",
            "levelOrder",
            "canApprove",
            "canReject",
            "maxAmountLimit",
            "isActive",
            "createdAt",
            "updatedAt"
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`, [
            levelCode,
            levelName,
            department || 'CLAIMS',
            levelOrder || 0,
            canApprove !== undefined ? canApprove : false,
            canReject !== undefined ? canReject : false,
            maxAmountLimit || null,
            isActive !== undefined ? isActive : true,
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('[RoleLevels] Create error:', error);
        res.status(500).json({
            error: 'Failed to create role level',
            detail: error.message,
        });
    }
});
// ---------------------------------------------------------------------------
// UPDATE role level
// ---------------------------------------------------------------------------
router.put('/role-levels/:id', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const { id } = req.params;
        const { levelCode, levelName, department, levelOrder, canApprove, canReject, maxAmountLimit, isActive, } = req.body;
        // Check if exists
        const oldResult = await pool.query('SELECT * FROM role_levels WHERE id = $1', [id]);
        if (oldResult.rows.length === 0) {
            return res.status(404).json({ error: 'Role level not found' });
        }
        const oldData = oldResult.rows[0];
        const result = await pool.query(`UPDATE role_levels
         SET
            "levelCode"      = $1,
            "levelName"      = $2,
            "department"     = $3,
            "levelOrder"     = $4,
            "canApprove"     = $5,
            "canReject"      = $6,
            "maxAmountLimit" = $7,
            "isActive"       = $8,
            "updatedAt"      = NOW()
         WHERE id = $9
         RETURNING *`, [
            levelCode ?? oldData.levelCode,
            levelName ?? oldData.levelName,
            department ?? oldData.department,
            levelOrder ?? oldData.levelOrder,
            canApprove !== undefined ? canApprove : oldData.canApprove,
            canReject !== undefined ? canReject : oldData.canReject,
            maxAmountLimit ?? oldData.maxAmountLimit,
            isActive !== undefined ? isActive : oldData.isActive,
            id,
        ]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('[RoleLevels] Update error:', error);
        res.status(500).json({
            error: 'Failed to update role level',
            detail: error.message,
        });
    }
});
// ---------------------------------------------------------------------------
// DELETE role level
// ---------------------------------------------------------------------------
router.delete('/role-levels/:id', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM role_levels WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Role level not found' });
        }
        res.json({ message: 'Role level deleted successfully' });
    }
    catch (error) {
        console.error('[RoleLevels] Delete error:', error);
        res.status(500).json({
            error: 'Failed to delete role level',
            detail: error.message,
        });
    }
});
// ===========================================================================
// APPROVAL RULES ROUTES
// ===========================================================================
// ---------------------------------------------------------------------------
// GET all approval rules
// ---------------------------------------------------------------------------
router.get('/rules', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const result = await pool.query(`SELECT 
            id,
            "ruleName",
            "productType",
            "minSumInsured",
            "maxSumInsured",
            "minRiskScore",
            "maxRiskScore",
            "approvalLevels",
            "isActive",
            "createdBy",
            "createdAt",
            "updatedAt"
         FROM approval_rules
         ORDER BY "createdAt" DESC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('[ApprovalRules] Fetch all error:', error);
        res.status(500).json({
            error: 'Failed to fetch approval rules',
            detail: error.message,
        });
    }
});
// ---------------------------------------------------------------------------
// GET single approval rule
// ---------------------------------------------------------------------------
router.get('/rules/:id', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`SELECT 
            id,
            "ruleName",
            "productType",
            "minSumInsured",
            "maxSumInsured",
            "minRiskScore",
            "maxRiskScore",
            "approvalLevels",
            "isActive",
            "createdBy",
            "createdAt",
            "updatedAt"
         FROM approval_rules
         WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('[ApprovalRules] Fetch single error:', error);
        res.status(500).json({
            error: 'Failed to fetch rule',
            detail: error.message,
        });
    }
});
// ---------------------------------------------------------------------------
// CREATE approval rule
// ---------------------------------------------------------------------------
router.post('/rules', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const { ruleName, productType, minSumInsured, maxSumInsured, minRiskScore, maxRiskScore, approvalLevels, isActive, } = req.body;
        if (!ruleName || !productType || !approvalLevels) {
            return res.status(400).json({
                error: 'ruleName, productType, and approvalLevels are required',
            });
        }
        const result = await pool.query(`INSERT INTO approval_rules (
            "ruleName",
            "productType",
            "minSumInsured",
            "maxSumInsured",
            "minRiskScore",
            "maxRiskScore",
            "approvalLevels",
            "isActive",
            "createdBy",
            "createdAt",
            "updatedAt"
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING *`, [
            ruleName,
            productType,
            minSumInsured || null,
            maxSumInsured || null,
            minRiskScore || null,
            maxRiskScore || null,
            JSON.stringify(approvalLevels),
            isActive !== undefined ? isActive : true,
            req.user.id,
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('[ApprovalRules] Create error:', error);
        res.status(500).json({
            error: 'Failed to create approval rule',
            detail: error.message,
        });
    }
});
// ---------------------------------------------------------------------------
// UPDATE approval rule
// ---------------------------------------------------------------------------
router.put('/rules/:id', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const { id } = req.params;
        const { ruleName, productType, minSumInsured, maxSumInsured, minRiskScore, maxRiskScore, approvalLevels, isActive, } = req.body;
        const oldResult = await pool.query('SELECT * FROM approval_rules WHERE id = $1', [id]);
        if (oldResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }
        const oldData = oldResult.rows[0];
        const result = await pool.query(`UPDATE approval_rules
         SET
            "ruleName"      = $1,
            "productType"   = $2,
            "minSumInsured" = $3,
            "maxSumInsured" = $4,
            "minRiskScore"  = $5,
            "maxRiskScore"  = $6,
            "approvalLevels" = $7,
            "isActive"      = $8,
            "updatedAt"     = NOW()
         WHERE id = $9
         RETURNING *`, [
            ruleName ?? oldData.ruleName,
            productType ?? oldData.productType,
            minSumInsured ?? oldData.minSumInsured,
            maxSumInsured ?? oldData.maxSumInsured,
            minRiskScore ?? oldData.minRiskScore,
            maxRiskScore ?? oldData.maxRiskScore,
            approvalLevels ? JSON.stringify(approvalLevels) : oldData.approvalLevels,
            isActive !== undefined ? isActive : oldData.isActive,
            id,
        ]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('[ApprovalRules] Update error:', error);
        res.status(500).json({
            error: 'Failed to update approval rule',
            detail: error.message,
        });
    }
});
// ---------------------------------------------------------------------------
// DELETE approval rule
// ---------------------------------------------------------------------------
router.delete('/rules/:id', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM approval_rules WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }
        res.json({ message: 'Rule deleted successfully' });
    }
    catch (error) {
        console.error('[ApprovalRules] Delete error:', error);
        res.status(500).json({
            error: 'Failed to delete rule',
            detail: error.message,
        });
    }
});
export default router;
