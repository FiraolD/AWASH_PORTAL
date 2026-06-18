import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Get riders by product (for customer selection)
router.get('/product/:productId/available', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, "riderName", "description", "premiumRate", "calculationType", "isOptional", "maxLimit"
      FROM riders 
      WHERE "productId" = $1 AND "isActive" = true 
      ORDER BY "displayOrder" ASC
    `, [req.params.productId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch riders:', error);
    res.json([]);
  }
});

// Calculate rider premium
router.post('/calculate-premium', async (req, res) => {
  try {
    const { riders, coverageAmount } = req.body;
    let totalRiderPremium = 0;
    const riderBreakdown = [];
    
    for (const rider of riders) {
      let riderPremium = 0;
      if (rider.calculationType === 'PERCENTAGE') {
        riderPremium = coverageAmount * rider.premiumRate;
      } else {
        riderPremium = rider.premiumRate;
      }
      totalRiderPremium += riderPremium;
      riderBreakdown.push({
        riderId: rider.id,
        riderName: rider.riderName,
        premium: riderPremium,
        calculationType: rider.calculationType,
        rate: rider.premiumRate
      });
    }
    
    res.json({
      totalRiderPremium,
      breakdown: riderBreakdown
    });
  } catch (error) {
    console.error('Failed to calculate rider premium:', error);
    res.status(500).json({ error: 'Failed to calculate rider premium' });
  }
});

// CRUD operations
router.get('/product/:productId', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM riders WHERE "productId" = $1 ORDER BY "displayOrder" ASC
    `, [req.params.productId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch riders:', error);
    res.json([]);
  }
});

router.post('/', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const { productId, riderName, description, premiumRate, calculationType, isOptional, maxLimit, displayOrder, isActive } = req.body;
    
    const result = await pool.query(`
      INSERT INTO riders (
        id, "productId", "riderName", "description", "premiumRate", 
        "calculationType", "isOptional", "maxLimit", "displayOrder", "isActive", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      ) RETURNING *
    `, [productId, riderName, description, premiumRate, calculationType, isOptional !== false, maxLimit || null, displayOrder || 0, isActive !== false]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create rider:', error);
    res.status(500).json({ error: 'Failed to create rider' });
  }
});

router.put('/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const { riderName, description, premiumRate, calculationType, isOptional, maxLimit, displayOrder, isActive } = req.body;
    
    const result = await pool.query(`
      UPDATE riders 
      SET "riderName" = COALESCE($1, "riderName"),
          description = COALESCE($2, description),
          "premiumRate" = COALESCE($3, "premiumRate"),
          "calculationType" = COALESCE($4, "calculationType"),
          "isOptional" = COALESCE($5, "isOptional"),
          "maxLimit" = COALESCE($6, "maxLimit"),
          "displayOrder" = COALESCE($7, "displayOrder"),
          "isActive" = COALESCE($8, "isActive"),
          "updatedAt" = NOW()
      WHERE id = $9
      RETURNING *
    `, [riderName, description, premiumRate, calculationType, isOptional, maxLimit, displayOrder, isActive, req.params.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update rider:', error);
    res.status(500).json({ error: 'Failed to update rider' });
  }
});

router.delete('/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    await pool.query('DELETE FROM riders WHERE id = $1', [req.params.id]);
    res.json({ message: 'Rider deleted successfully' });
  } catch (error) {
    console.error('Failed to delete rider:', error);
    res.status(500).json({ error: 'Failed to delete rider' });
  }
});

export default router;