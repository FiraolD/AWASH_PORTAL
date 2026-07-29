import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware';
import pool from '../../lib/db';
import { createAuditLog } from './audit.routes';

const router = Router();

// ---------------------------------------------------------------------------
// Get all premium rates (with optional filtering)
// ---------------------------------------------------------------------------
router.get('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { productType, isActive, calculationType } = req.query;

    let query = `SELECT 
        id,
        "productType",
        "rateName",
        "baseRate",
        "minRate",
        "maxRate",
        "calculationType",
        "isPercentage",
        "effectiveFrom",
        "effectiveTo",
        "isActive",
        "createdAt",
        "updatedAt",
        "createdBy"
     FROM premium_rates WHERE 1=1`;

    const params: any[] = [];
    let paramCount = 1;

    if (productType) {
      query += ` AND "productType" = $${paramCount++}`;
      params.push(productType);
    }

    if (isActive !== undefined) {
      query += ` AND "isActive" = $${paramCount++}`;
      params.push(isActive === 'true');
    }

    if (calculationType) {
      query += ` AND "calculationType" = $${paramCount++}`;
      params.push(calculationType);
    }

    query += ` ORDER BY "productType" ASC, "rateName" ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('[PremiumRates] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch premium rates' });
  }
});

// ---------------------------------------------------------------------------
// Get active premium rates for a product type (public)
// ---------------------------------------------------------------------------
router.get('/active/:productType', async (req: AuthRequest, res: Response) => {
  try {
    const { productType } = req.params;

    const result = await pool.query(
      `SELECT 
          id,
          "productType",
          "rateName",
          "baseRate",
          "minRate",
          "maxRate",
          "calculationType",
          "isPercentage",
          "effectiveFrom",
          "effectiveTo"
       FROM premium_rates
       WHERE "productType" = $1
         AND "isActive" = true
         AND ("effectiveFrom" IS NULL OR "effectiveFrom" <= NOW())
         AND ("effectiveTo" IS NULL OR "effectiveTo" >= NOW())
       ORDER BY "rateName" ASC`,
      [productType]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[PremiumRates] Fetch active error:', error);
    res.status(500).json({ error: 'Failed to fetch active premium rates' });
  }
});

// ---------------------------------------------------------------------------
// Get single premium rate
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM premium_rates WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Premium rate not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[PremiumRates] Fetch single error:', error);
    res.status(500).json({ error: 'Failed to fetch premium rate' });
  }
});

// ---------------------------------------------------------------------------
// Create premium rate
// ---------------------------------------------------------------------------
router.post('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const {
      productType,
      rateName,
      baseRate,
      minRate,
      maxRate,
      calculationType,
      isPercentage,
      effectiveFrom,
      effectiveTo,
    } = req.body;

    const userId = req.user!.id;

    // Validate
    if (!productType || !rateName || baseRate === undefined || !calculationType) {
      return res.status(400).json({ error: 'productType, rateName, baseRate, and calculationType are required' });
    }

    const result = await pool.query(
      `INSERT INTO premium_rates (
        "productType",
        "rateName",
        "baseRate",
        "minRate",
        "maxRate",
        "calculationType",
        "isPercentage",
        "effectiveFrom",
        "effectiveTo",
        "isActive",
        "createdBy",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, NOW(), NOW())
      RETURNING *`,
      [
        productType,
        rateName,
        baseRate,
        minRate || 0,
        maxRate || baseRate * 2,
        calculationType,
        isPercentage || false,
        effectiveFrom || null,
        effectiveTo || null,
        userId,
      ]
    );

    // Log audit
   await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'CREATE', 'PREMIUM_RATE',
     result.rows[0].id, null, result.rows[0], req.ip || '0.0.0.0', req.headers?.['user-agent'] || 'system');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[PremiumRates] Create error:', error);
    res.status(500).json({ error: 'Failed to create premium rate' });
  }
});

// ---------------------------------------------------------------------------
// Update premium rate
// ---------------------------------------------------------------------------
router.put('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      productType,
      rateName,
      baseRate,
      minRate,
      maxRate,
      calculationType,
      isPercentage,
      effectiveFrom,
      effectiveTo,
      isActive,
    } = req.body;

    // Check exists
    const oldResult = await pool.query('SELECT * FROM premium_rates WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Premium rate not found' });
    }

    const oldData = oldResult.rows[0];

    await pool.query(
      `UPDATE premium_rates 
       SET "productType" = $1,
           "rateName" = $2,
           "baseRate" = $3,
           "minRate" = $4,
           "maxRate" = $5,
           "calculationType" = $6,
           "isPercentage" = $7,
           "effectiveFrom" = $8,
           "effectiveTo" = $9,
           "isActive" = $10,
           "updatedAt" = NOW()
       WHERE id = $11`,
      [
        productType || oldData.productType,
        rateName || oldData.rateName,
        baseRate !== undefined ? baseRate : oldData.baseRate,
        minRate !== undefined ? minRate : oldData.minRate,
        maxRate !== undefined ? maxRate : oldData.maxRate,
        calculationType || oldData.calculationType,
        isPercentage !== undefined ? isPercentage : oldData.isPercentage,
        effectiveFrom !== undefined ? effectiveFrom : oldData.effectiveFrom,
        effectiveTo !== undefined ? effectiveTo : oldData.effectiveTo,
        isActive !== undefined ? isActive : oldData.isActive,
        id,
      ]
    );

    // Fetch updated
    const updated = await pool.query('SELECT * FROM premium_rates WHERE id = $1', [id]);

    // Log audit
await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'UPDATE', 'PREMIUM_RATE', id, oldData, updated.rows[0], 
  req.ip || '0.0.0.0', req.headers?.['user-agent'] || 'system');

    res.json(updated.rows[0]);
  } catch (error) {
    console.error('[PremiumRates] Update error:', error);
    res.status(500).json({ error: 'Failed to update premium rate' });
  }
});

// ---------------------------------------------------------------------------
// Delete premium rate
// ---------------------------------------------------------------------------
router.delete('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const oldResult = await pool.query('SELECT * FROM premium_rates WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Premium rate not found' });
    }

    await pool.query('DELETE FROM premium_rates WHERE id = $1', [id]);

    // Log audit
  await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'DELETE', 'PREMIUM_RATE', id, oldResult.rows[0],
     null, req.ip || '0.0.0.0', req.headers?.['user-agent'] || 'system');

    res.json({ message: 'Premium rate deleted' });
  } catch (error) {
    console.error('[PremiumRates] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete premium rate' });
  }
});

// ---------------------------------------------------------------------------
// Toggle active status
// ---------------------------------------------------------------------------
router.patch('/:id/toggle', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const checkResult = await pool.query(
      'SELECT id, "isActive", "rateName" FROM premium_rates WHERE id = $1',
      [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Premium rate not found' });
    }

    const newStatus = !checkResult.rows[0].isActive;

    await pool.query(
      `UPDATE premium_rates SET "isActive" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [newStatus, id]
    );

    res.json({
      message: `Premium rate ${newStatus ? 'activated' : 'deactivated'}`,
      isActive: newStatus,
    });
  } catch (error) {
    console.error('[PremiumRates] Toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle premium rate' });
  }
});

export default router;