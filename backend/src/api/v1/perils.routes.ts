import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Get perils by product
router.get('/product/:productId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM perils 
      WHERE "productId" = $1 AND "isActive" = true 
      ORDER BY "displayOrder" ASC
    `, [req.params.productId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch perils:', error);
    res.json([]);
  }
});

// Create peril
router.post('/', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const { 
      productId, perilName, description, premiumRate, calculationType,
      minCoverage, maxCoverage, isDefault, isOptional, displayOrder, isActive 
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO perils (
        id, "productId", "perilName", "description", "premiumRate", "calculationType",
        "minCoverage", "maxCoverage", "isDefault", "isOptional", "displayOrder", 
        "isActive", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::uuid, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
      ) RETURNING *
    `, [productId, perilName, description, premiumRate, calculationType, 
        minCoverage, maxCoverage, isDefault || false, isOptional !== false, 
        displayOrder || 0, isActive !== false]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create peril:', error);
    res.status(500).json({ error: 'Failed to create peril' });
  }
});

// Update peril
router.put('/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const { 
      perilName, description, premiumRate, calculationType,
      minCoverage, maxCoverage, isDefault, isOptional, displayOrder, isActive 
    } = req.body;
    
    const result = await pool.query(`
      UPDATE perils 
      SET "perilName" = COALESCE($1, "perilName"),
          description = COALESCE($2, description),
          "premiumRate" = COALESCE($3, "premiumRate"),
          "calculationType" = COALESCE($4, "calculationType"),
          "minCoverage" = COALESCE($5, "minCoverage"),
          "maxCoverage" = COALESCE($6, "maxCoverage"),
          "isDefault" = COALESCE($7, "isDefault"),
          "isOptional" = COALESCE($8, "isOptional"),
          "displayOrder" = COALESCE($9, "displayOrder"),
          "isActive" = COALESCE($10, "isActive"),
          "updatedAt" = NOW()
      WHERE id = $11
      RETURNING *
    `, [perilName, description, premiumRate, calculationType, minCoverage, 
        maxCoverage, isDefault, isOptional, displayOrder, isActive, req.params.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update peril:', error);
    res.status(500).json({ error: 'Failed to update peril' });
  }
});

// Delete peril
router.delete('/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    await pool.query('DELETE FROM perils WHERE id = $1', [req.params.id]);
    res.json({ message: 'Peril deleted successfully' });
  } catch (error) {
    console.error('Failed to delete peril:', error);
    res.status(500).json({ error: 'Failed to delete peril' });
  }
});

export default router;