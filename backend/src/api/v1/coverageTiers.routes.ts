import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Get coverage tiers by product
router.get('/product/:productId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM coverage_tiers 
      WHERE "productId" = $1 AND "isActive" = true 
      ORDER BY "displayOrder" ASC, "minCoverage" ASC
    `, [req.params.productId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch coverage tiers:', error);
    res.json([]);
  }
});

// Get coverage tier by coverage amount
router.get('/product/:productId/amount/:coverageAmount', async (req, res) => {
  try {
    const { productId, coverageAmount } = req.params;
    const result = await pool.query(`
      SELECT * FROM coverage_tiers 
      WHERE "productId" = $1 
        AND "minCoverage" <= $2 
        AND ("maxCoverage" IS NULL OR "maxCoverage" >= $2)
        AND "isActive" = true
      LIMIT 1
    `, [productId, coverageAmount]);
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Failed to fetch coverage tier:', error);
    res.status(500).json({ error: 'Failed to fetch coverage tier' });
  }
});

// Create coverage tier (admin only)
router.post('/', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const { productId, tierName, description, baseRate, minCoverage, maxCoverage, displayOrder, isActive } = req.body;
    
    const result = await pool.query(`
      INSERT INTO coverage_tiers (
        id, "productId", "tierName", "description", "baseRate", 
        "minCoverage", "maxCoverage", "displayOrder", "isActive", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
      ) RETURNING *
    `, [productId, tierName, description, baseRate, minCoverage, maxCoverage || null, displayOrder || 0, isActive !== false]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create coverage tier:', error);
    res.status(500).json({ error: 'Failed to create coverage tier' });
  }
});

// Update coverage tier
router.put('/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const { tierName, description, baseRate, minCoverage, maxCoverage, displayOrder, isActive } = req.body;
    
    const result = await pool.query(`
      UPDATE coverage_tiers 
      SET "tierName" = COALESCE($1, "tierName"),
          description = COALESCE($2, description),
          "baseRate" = COALESCE($3, "baseRate"),
          "minCoverage" = COALESCE($4, "minCoverage"),
          "maxCoverage" = COALESCE($5, "maxCoverage"),
          "displayOrder" = COALESCE($6, "displayOrder"),
          "isActive" = COALESCE($7, "isActive"),
          "updatedAt" = NOW()
      WHERE id = $8
      RETURNING *
    `, [tierName, description, baseRate, minCoverage, maxCoverage, displayOrder, isActive, req.params.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update coverage tier:', error);
    res.status(500).json({ error: 'Failed to update coverage tier' });
  }
});

// Delete coverage tier
router.delete('/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    await pool.query('DELETE FROM coverage_tiers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Coverage tier deleted successfully' });
  } catch (error) {
    console.error('Failed to delete coverage tier:', error);
    res.status(500).json({ error: 'Failed to delete coverage tier' });
  }
});

export default router;