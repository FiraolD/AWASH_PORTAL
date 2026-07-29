import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware';
import pool from '../../lib/db';
import { createAuditLog, getClientIp, getHeaderString } from './audit.routes';

const router = Router();

// Get all
router.get('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { productType, isActive, calculationType } = req.query;
    let query = `SELECT id, "productType", "rateName", "baseRate", "minRate", "maxRate", "calculationType", "isPercentage", "effectiveFrom", "effectiveTo", "isActive", "createdAt", "updatedAt", "createdBy" FROM premium_rates WHERE 1=1`;
    const params: any[] = [];
    let p = 1;

    if (productType) { query += ` AND "productType" = $${p++}`; params.push(productType); }
    if (isActive !== undefined) { query += ` AND "isActive" = $${p++}`; params.push(isActive === 'true'); }
    if (calculationType) { query += ` AND "calculationType" = $${p++}`; params.push(calculationType); }

    query += ` ORDER BY "productType", "rateName"`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('[PremiumRates] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch premium rates' });
  }
});

// Get active by product
router.get('/active/:productType', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, "productType", "rateName", "baseRate", "minRate", "maxRate", "calculationType", "isPercentage", "effectiveFrom", "effectiveTo"
       FROM premium_rates WHERE "productType"=$1 AND "isActive"=true AND ("effectiveFrom" IS NULL OR "effectiveFrom"<=NOW()) AND ("effectiveTo" IS NULL OR "effectiveTo">=NOW()) ORDER BY "rateName"`,
      [req.params.productType]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[PremiumRates] Active error:', error);
    res.status(500).json({ error: 'Failed to fetch active premium rates' });
  }
});

// Create
router.post('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { productType, rateName, baseRate, minRate, maxRate, calculationType, isPercentage, effectiveFrom, effectiveTo } = req.body;
    if (!productType || !rateName || baseRate === undefined || !calculationType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO premium_rates ("productType", "rateName", "baseRate", "minRate", "maxRate", "calculationType", "isPercentage", "effectiveFrom", "effectiveTo", "isActive", "createdBy", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,NOW(),NOW()) RETURNING *`,
      [productType, rateName, baseRate, minRate || 0, maxRate || baseRate * 2, calculationType, isPercentage || false, effectiveFrom || null, effectiveTo || null, req.user!.id]
    );

    await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'CREATE', 'PREMIUM_RATE', result.rows[0].id, null, result.rows[0], getClientIp(req), getHeaderString(req, 'user-agent'));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[PremiumRates] Create error:', error);
    res.status(500).json({ error: 'Failed to create premium rate' });
  }
});

// Update
router.put('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const oldResult = await pool.query('SELECT * FROM premium_rates WHERE id=$1', [id]);
    if (oldResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const oldData = oldResult.rows[0];
    const d = req.body;

    await pool.query(
      `UPDATE premium_rates SET "productType"=$1,"rateName"=$2,"baseRate"=$3,"minRate"=$4,"maxRate"=$5,"calculationType"=$6,"isPercentage"=$7,"effectiveFrom"=$8,"effectiveTo"=$9,"isActive"=$10,"updatedAt"=NOW() WHERE id=$11`,
      [d.productType || oldData.productType, d.rateName || oldData.rateName, d.baseRate !== undefined ? d.baseRate : oldData.baseRate, d.minRate !== undefined ? d.minRate : oldData.minRate, d.maxRate !== undefined ? d.maxRate : oldData.maxRate, d.calculationType || oldData.calculationType, d.isPercentage !== undefined ? d.isPercentage : oldData.isPercentage, d.effectiveFrom !== undefined ? d.effectiveFrom : oldData.effectiveFrom, d.effectiveTo !== undefined ? d.effectiveTo : oldData.effectiveTo, d.isActive !== undefined ? d.isActive : oldData.isActive, id]
    );

    const updated = await pool.query('SELECT * FROM premium_rates WHERE id=$1', [id]);
    await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'UPDATE', 'PREMIUM_RATE', id, oldData, updated.rows[0], getClientIp(req), getHeaderString(req, 'user-agent'));
    res.json(updated.rows[0]);
  } catch (error) {
    console.error('[PremiumRates] Update error:', error);
    res.status(500).json({ error: 'Failed to update premium rate' });
  }
});

// Delete
router.delete('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const oldResult = await pool.query('SELECT * FROM premium_rates WHERE id=$1', [id]);
    if (oldResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    await pool.query('DELETE FROM premium_rates WHERE id=$1', [id]);
    await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'DELETE', 'PREMIUM_RATE', id, oldResult.rows[0], null, getClientIp(req), getHeaderString(req, 'user-agent'));
    res.json({ message: 'Premium rate deleted' });
  } catch (error) {
    console.error('[PremiumRates] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete premium rate' });
  }
});

// Toggle
router.patch('/:id/toggle', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const checkResult = await pool.query('SELECT id, "isActive", "rateName" FROM premium_rates WHERE id=$1', [id]);
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const newStatus = !checkResult.rows[0].isActive;
    await pool.query(`UPDATE premium_rates SET "isActive"=$1, "updatedAt"=NOW() WHERE id=$2`, [newStatus, id]);
    res.json({ message: `Premium rate ${newStatus ? 'activated' : 'deactivated'}`, isActive: newStatus });
  } catch (error) {
    console.error('[PremiumRates] Toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle premium rate' });
  }
});

export default router;