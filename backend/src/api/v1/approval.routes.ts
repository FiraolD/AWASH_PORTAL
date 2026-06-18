import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../lib/db.js';
import approvalService from '../../services/approval.service.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/rules', authenticate, authorize('MASTER_ADMIN', 'UNDERWRITING_ADMIN'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM approval_rules WHERE is_active = true ORDER BY product_type ASC, min_sum_insured ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch approval rules:', error);
    res.status(500).json({ error: 'Failed to fetch approval rules', details: (error as Error).message });
  }
});

router.get('/role-levels', authenticate, authorize('MASTER_ADMIN', 'UNDERWRITING_ADMIN'), async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM role_levels WHERE is_active = true AND can_approve = true ORDER BY level_order ASC`);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch role levels:', error);
    res.status(500).json({ error: 'Failed to fetch role levels' });
  }
});

router.post('/rules', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const userId = req.user?.id;
    const { rule_name, product_type, min_sum_insured, max_sum_insured, approval_levels } = req.body;

    // Normalize approval_levels
    let levelsArray;
    if (Array.isArray(approval_levels)) {
      levelsArray = approval_levels.map(item => 
        typeof item === 'string' ? item : item.level_code || item.id
      );
    } else if (typeof approval_levels === 'string') {
      // If it's a string, try to parse it as JSON
      try {
        const parsed = JSON.parse(approval_levels);
        levelsArray = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        levelsArray = [approval_levels];
      }
    } else {
      levelsArray = [];
    }

    // Ensure we have an array of strings
    const levelsJson = JSON.stringify(levelsArray);

    const result = await pool.query(
      `INSERT INTO approval_rules 
       (id, rule_name, product_type, min_sum_insured, max_sum_insured, approval_levels, is_active, created_by, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, true, $6, NOW(), NOW())
       RETURNING *`,
      [rule_name, product_type, min_sum_insured || null, max_sum_insured || null, levelsJson, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create approval rule:', error);
    res.status(500).json({ error: 'Failed to create approval rule' });
  }
});

router.put('/rules/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const { rule_name, min_sum_insured, max_sum_insured, approval_levels, is_active } = req.body;
    const updateFields: string[] = [];
    const values: any[] = [];

    if (approval_levels !== undefined) {
      if (!Array.isArray(approval_levels) || approval_levels.length === 0) {
        return res.status(400).json({ error: 'At least one approval level is required' });
      }

      const levelsResult = await pool.query(
        `SELECT id FROM role_levels WHERE id = ANY($1) AND is_active = true AND can_approve = true`,
        [approval_levels]
      );

      if (levelsResult.rows.length !== approval_levels.length) {
        return res.status(400).json({ error: 'Some approval levels are invalid or not available for approval' });
      }

      values.push(approval_levels);
      updateFields.push(`approval_levels = $${values.length}`);
    }

    if (rule_name !== undefined) { values.push(rule_name); updateFields.push(`rule_name = $${values.length}`); }
    if (min_sum_insured !== undefined) { values.push(min_sum_insured); updateFields.push(`min_sum_insured = $${values.length}`); }
    if (max_sum_insured !== undefined) { values.push(max_sum_insured); updateFields.push(`max_sum_insured = $${values.length}`); }
    if (is_active !== undefined) { values.push(is_active); updateFields.push(`is_active = $${values.length}`); }

    if (!updateFields.length) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    values.push(req.params.id);
    const query = `UPDATE approval_rules SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`;

    const result = await pool.query(query, values);
    if (!result.rows.length) return res.status(404).json({ error: 'Rule not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update approval rule:', error);
    res.status(500).json({ error: 'Failed to update approval rule' });
  }
});

router.delete('/rules/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM approval_rules WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Rule not found' });
    res.json({ message: 'Approval rule deleted successfully' });
  } catch (error) {
    console.error('Failed to delete approval rule:', error);
    res.status(500).json({ error: 'Failed to delete approval rule' });
  }
});

router.post('/check', authenticate, async (req, res) => {
  try {
    const { product_type, sum_insured, risk_score = 0 } = req.body;
    const approvalCheck = await approvalService.requiresApproval('POLICY', product_type, sum_insured, risk_score);
    res.json({
      requires_approval: approvalCheck.requires,
      approval_levels: approvalCheck.approvalFlow || [],
      rule: approvalCheck.rule || null,
      reason: approvalCheck.reason
    });
  } catch (error) {
    console.error('Failed to check approval requirements:', error);
    res.status(500).json({ error: 'Failed to check approval requirements' });
  }
});

export default router;
