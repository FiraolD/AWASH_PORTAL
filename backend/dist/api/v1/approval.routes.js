import { Router } from 'express';
import { z } from 'zod';
import pool from '../../lib/db.js';
import approvalService from '../../services/approval.service.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
const router = Router();
const optionalNumber = z.preprocess((value) => (value === '' || value === null || value === undefined ? null : Number(value)), z.number().finite().nonnegative().nullable());
const approvalRuleSchemaBase = z.object({
    rule_name: z.string().trim().min(2).max(120),
    product_type: z.string().trim().min(1).max(80),
    min_sum_insured: optionalNumber.optional(),
    max_sum_insured: optionalNumber.optional(),
    min_risk_score: z.preprocess((value) => (value === '' || value === null || value === undefined ? 0 : Number(value)), z.number().int().min(0).max(100)).optional(),
    max_risk_score: z.preprocess((value) => (value === '' || value === null || value === undefined ? 100 : Number(value)), z.number().int().min(0).max(100)).optional(),
    approval_levels: z.array(z.string().trim().min(1)).min(1),
    is_active: z.boolean().optional(),
});
const approvalRuleSchema = approvalRuleSchemaBase
    .refine((data) => {
    if (data.min_sum_insured == null || data.max_sum_insured == null)
        return true;
    return data.min_sum_insured <= data.max_sum_insured;
}, { message: 'Minimum sum insured cannot exceed maximum sum insured', path: ['max_sum_insured'] })
    .refine((data) => {
    const minRisk = data.min_risk_score ?? 0;
    const maxRisk = data.max_risk_score ?? 100;
    return minRisk <= maxRisk;
}, { message: 'Minimum risk score cannot exceed maximum risk score', path: ['max_risk_score'] });
const approvalRuleUpdateSchema = approvalRuleSchemaBase.partial().refine((data) => Object.keys(data).length > 0, { message: 'No update fields provided' });
const checkApprovalSchema = z.object({
    product_type: z.string().trim().min(1),
    sum_insured: z.preprocess((value) => Number(value), z.number().finite().nonnegative()),
    risk_score: z.preprocess((value) => (value === undefined || value === null || value === '' ? 0 : Number(value)), z.number().int().min(0).max(100)).optional(),
});
async function assertApprovalLevelsExist(levels) {
    const result = await pool.query(`SELECT id FROM role_levels WHERE id = ANY($1) AND is_active = true AND can_approve = true`, [levels]);
    return result.rows.length === levels.length;
}
router.get('/rules', authenticate, authorize('MASTER_ADMIN', 'UNDERWRITING_ADMIN'), async (req, res) => {
    try {
        const activeOnly = req.query.activeOnly === 'true';
        const result = await pool.query(`SELECT id,
              rule_name AS "ruleName",
              product_type AS "productType",
              min_sum_insured AS "minSumInsured",
              max_sum_insured AS "maxSumInsured",
              min_risk_score AS "minRiskScore",
              max_risk_score AS "maxRiskScore",
              approval_levels AS "approvalLevels",
              is_active AS "isActive",
              created_by AS "createdBy",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM approval_rules
       WHERE ($1::boolean = false OR is_active = true)
       ORDER BY is_active DESC, product_type ASC, min_sum_insured ASC NULLS FIRST`, [activeOnly]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch approval rules:', error);
        res.status(500).json({ error: 'Failed to fetch approval rules' });
    }
});
router.get('/role-levels', authenticate, authorize('MASTER_ADMIN', 'UNDERWRITING_ADMIN'), async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT id,
             level_code AS "levelCode",
             level_name AS "levelName",
             department,
             level_order AS "levelOrder",
             can_approve AS "canApprove",
             can_reject AS "canReject",
             max_amount_limit AS "maxAmountLimit",
             is_active AS "isActive",
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM role_levels
      WHERE is_active = true AND can_approve = true
      ORDER BY level_order ASC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch role levels:', error);
        res.status(500).json({ error: 'Failed to fetch role levels' });
    }
});
router.post('/rules', authenticate, authorize('MASTER_ADMIN'), validateBody(approvalRuleSchema), async (req, res) => {
    try {
        const userId = req.user?.id;
        const { rule_name, product_type, min_sum_insured = null, max_sum_insured = null, min_risk_score = 0, max_risk_score = 100, approval_levels, is_active = true, } = req.body;
        const levelsExist = await assertApprovalLevelsExist(approval_levels);
        if (!levelsExist) {
            return res.status(400).json({ error: 'Some approval levels are invalid or not available for approval' });
        }
        const result = await pool.query(`INSERT INTO approval_rules 
       (id, rule_name, product_type, min_sum_insured, max_sum_insured, min_risk_score, max_risk_score, approval_levels, is_active, created_by, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, NOW(), NOW())
       RETURNING id,
                 rule_name AS "ruleName",
                 product_type AS "productType",
                 min_sum_insured AS "minSumInsured",
                 max_sum_insured AS "maxSumInsured",
                 min_risk_score AS "minRiskScore",
                 max_risk_score AS "maxRiskScore",
                 approval_levels AS "approvalLevels",
                 is_active AS "isActive",
                 created_by AS "createdBy",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt"`, [rule_name, product_type, min_sum_insured, max_sum_insured, min_risk_score, max_risk_score, JSON.stringify(approval_levels), is_active, userId]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to create approval rule:', error);
        res.status(500).json({ error: 'Failed to create approval rule' });
    }
});
router.put('/rules/:id', authenticate, authorize('MASTER_ADMIN'), validateBody(approvalRuleUpdateSchema), async (req, res) => {
    try {
        const updateFields = [];
        const values = [];
        if (req.body.approval_levels !== undefined) {
            const levelsExist = await assertApprovalLevelsExist(req.body.approval_levels);
            if (!levelsExist) {
                return res.status(400).json({ error: 'Some approval levels are invalid or not available for approval' });
            }
            values.push(JSON.stringify(req.body.approval_levels));
            updateFields.push(`approval_levels = $${values.length}::jsonb`);
        }
        const fields = [
            ['rule_name', 'rule_name'],
            ['product_type', 'product_type'],
            ['min_sum_insured', 'min_sum_insured'],
            ['max_sum_insured', 'max_sum_insured'],
            ['min_risk_score', 'min_risk_score'],
            ['max_risk_score', 'max_risk_score'],
            ['is_active', 'is_active'],
        ];
        for (const [bodyKey, columnName] of fields) {
            if (req.body[bodyKey] !== undefined) {
                values.push(req.body[bodyKey]);
                updateFields.push(`${columnName} = $${values.length}`);
            }
        }
        values.push(req.params.id);
        const query = `UPDATE approval_rules SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING id,
                                                                                     rule_name AS "ruleName",
                                                                                     product_type AS "productType",
                                                                                     min_sum_insured AS "minSumInsured",
                                                                                     max_sum_insured AS "maxSumInsured",
                                                                                     min_risk_score AS "minRiskScore",
                                                                                     max_risk_score AS "maxRiskScore",
                                                                                     approval_levels AS "approvalLevels",
                                                                                     is_active AS "isActive",
                                                                                     created_by AS "createdBy",
                                                                                     created_at AS "createdAt",
                                                                                     updated_at AS "updatedAt"`;
        const result = await pool.query(query, values);
        if (!result.rows.length)
            return res.status(404).json({ error: 'Rule not found' });
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to update approval rule:', error);
        res.status(500).json({ error: 'Failed to update approval rule' });
    }
});
router.delete('/rules/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        const result = await pool.query(`UPDATE approval_rules SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!result.rows.length)
            return res.status(404).json({ error: 'Rule not found' });
        res.json({ message: 'Approval rule deactivated successfully' });
    }
    catch (error) {
        console.error('Failed to delete approval rule:', error);
        res.status(500).json({ error: 'Failed to delete approval rule' });
    }
});
router.post('/check', authenticate, validateBody(checkApprovalSchema), async (req, res) => {
    try {
        const { product_type, sum_insured, risk_score = 0 } = req.body;
        const approvalCheck = await approvalService.requiresApproval('POLICY', product_type, sum_insured, risk_score);
        res.json({
            requires_approval: approvalCheck.requires,
            approval_levels: approvalCheck.approvalFlow || [],
            rule: approvalCheck.rule || null,
            reason: approvalCheck.reason
        });
    }
    catch (error) {
        console.error('Failed to check approval requirements:', error);
        res.status(500).json({ error: 'Failed to check approval requirements' });
    }
});
export default router;
