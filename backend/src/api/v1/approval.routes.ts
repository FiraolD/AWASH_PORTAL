// src/api/v1/approval.routes.ts

import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware.js';
import pool from '../../lib/db.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET all approval rules
// ---------------------------------------------------------------------------
router.get(
  '/rules',
  authenticate,
  authorizeExecutives,
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT 
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
         ORDER BY "createdAt" DESC`
      );

      res.json(result.rows);
    } catch (error: any) {
      console.error('[ApprovalRules] Fetch all error:', error);
      res.status(500).json({
        error: 'Failed to fetch approval rules',
        detail: error.message,
      });
    }
  }
);

// ---------------------------------------------------------------------------
// GET single approval rule
// ---------------------------------------------------------------------------
router.get(
  '/rules/:id',
  authenticate,
  authorizeExecutives,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT 
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
         WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('[ApprovalRules] Fetch single error:', error);
      res.status(500).json({
        error: 'Failed to fetch rule',
        detail: error.message,
      });
    }
  }
);

// ---------------------------------------------------------------------------
// CREATE approval rule
// ---------------------------------------------------------------------------
router.post(
  '/rules',
  authenticate,
  authorizeExecutives,
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        ruleName,
        productType,
        minSumInsured,
        maxSumInsured,
        minRiskScore,
        maxRiskScore,
        approvalLevels,
        isActive,
      } = req.body;

      // Validate required fields
      if (!ruleName || !productType || !approvalLevels) {
        return res.status(400).json({
          error: 'ruleName, productType, and approvalLevels are required',
        });
      }

      const result = await pool.query(
        `INSERT INTO approval_rules (
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
         RETURNING *`,
        [
          ruleName,
          productType,
          minSumInsured || null,
          maxSumInsured || null,
          minRiskScore || null,
          maxRiskScore || null,
          JSON.stringify(approvalLevels), // JSONB – stringify the array/object
          isActive !== undefined ? isActive : true,
          req.user!.id,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error('[ApprovalRules] Create error:', error);
      res.status(500).json({
        error: 'Failed to create approval rule',
        detail: error.message,
      });
    }
  }
);

// ---------------------------------------------------------------------------
// UPDATE approval rule
// ---------------------------------------------------------------------------
router.put(
  '/rules/:id',
  authenticate,
  authorizeExecutives,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        ruleName,
        productType,
        minSumInsured,
        maxSumInsured,
        minRiskScore,
        maxRiskScore,
        approvalLevels,
        isActive,
      } = req.body;

      // Check if exists
      const oldResult = await pool.query(
        'SELECT * FROM approval_rules WHERE id = $1',
        [id]
      );

      if (oldResult.rows.length === 0) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      const oldData = oldResult.rows[0];

      const result = await pool.query(
        `UPDATE approval_rules
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
         RETURNING *`,
        [
          ruleName ?? oldData.ruleName,
          productType ?? oldData.productType,
          minSumInsured ?? oldData.minSumInsured,
          maxSumInsured ?? oldData.maxSumInsured,
          minRiskScore ?? oldData.minRiskScore,
          maxRiskScore ?? oldData.maxRiskScore,
          approvalLevels ? JSON.stringify(approvalLevels) : oldData.approvalLevels,
          isActive !== undefined ? isActive : oldData.isActive,
          id,
        ]
      );

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('[ApprovalRules] Update error:', error);
      res.status(500).json({
        error: 'Failed to update approval rule',
        detail: error.message,
      });
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE approval rule
// ---------------------------------------------------------------------------
router.delete(
  '/rules/:id',
  authenticate,
  authorizeExecutives,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM approval_rules WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      res.json({ message: 'Rule deleted successfully' });
    } catch (error: any) {
      console.error('[ApprovalRules] Delete error:', error);
      res.status(500).json({
        error: 'Failed to delete rule',
        detail: error.message,
      });
    }
  }
);

// ---------------------------------------------------------------------------
// GET role levels (for dropdowns)
// ---------------------------------------------------------------------------
router.get(
  '/role-levels',
  authenticate,
  authorizeExecutives,
  async (req: AuthRequest, res: Response) => {
    try {
      // Since there's no separate role_levels table, return the distinct
      // approval levels from the rules table, or define them here
      const roleLevels = [
        { level: 1, name: 'Claim Officer I', role: 'CLAIM_OFFICER_I' },
        { level: 2, name: 'Claim Officer II', role: 'CLAIM_OFFICER_II' },
        { level: 3, name: 'Senior Claim Officer', role: 'SENIOR_CLAIM_OFFICER' },
        { level: 4, name: 'Supervisor Claims', role: 'SUPERVISOR_CLAIMS' },
        { level: 5, name: 'Manager Claims', role: 'MANAGER_CLAIMS' },
        { level: 6, name: 'Head of Claims', role: 'HEAD_CLAIMS' },
      ];

      res.json(roleLevels);
    } catch (error: any) {
      console.error('[Approval] Role levels error:', error);
      res.status(500).json({
        error: 'Failed to fetch role levels',
        detail: error.message,
      });
    }
  }
);

export default router;