import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// =============================================
// GET / – Fetch all premium rates (with product info)
// =============================================
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pr.id,
        pr.product_id,
        pr.product_type,
        pr.coverage_tier,
        pr.base_rate,
        pr.min_coverage,
        pr.max_coverage,
        pr.risk_factor,
        pr.is_active,
        pr.created_at,
        pr.updated_at,
        p.name AS product_name,
        p.code AS product_code
      FROM premium_rates pr
      LEFT JOIN products p ON p.id = pr.product_id
      WHERE pr.is_active = true 
      ORDER BY p.name ASC, pr.min_coverage ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch premium rates:', error);
    res.status(500).json({ error: 'Failed to fetch premium rates' });
  }
});

// =============================================
// GET /product/:productId – Get rates by product
// =============================================
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(`
      SELECT * FROM premium_rates 
      WHERE product_id = $1 AND is_active = true 
      ORDER BY min_coverage ASC
    `, [productId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch premium rates for product:', error);
    res.status(500).json({ error: 'Failed to fetch premium rates' });
  }
});

// =============================================
// POST / – Create a new premium rate (admin only)
// =============================================
router.post('/', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const { 
      product_id,      // Required – UUID of the product
      coverage_tier, 
      base_rate, 
      min_coverage, 
      max_coverage, 
      risk_factor 
    } = req.body;

    // Validate required fields
    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    if (!coverage_tier) {
      return res.status(400).json({ error: 'Coverage tier is required' });
    }
    if (!base_rate || base_rate <= 0) {
      return res.status(400).json({ error: 'Valid base rate is required' });
    }
    if (!min_coverage || min_coverage <= 0) {
      return res.status(400).json({ error: 'Valid minimum coverage is required' });
    }

    // Check if product exists and get its code
    const productCheck = await pool.query(
      'SELECT id, code FROM products WHERE id = $1',
      [product_id]
    );
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const productCode = productCheck.rows[0].code;

    // Insert the new rate
    const result = await pool.query(`
      INSERT INTO premium_rates (
        id, 
        product_id, 
        product_type, 
        coverage_tier, 
        base_rate, 
        min_coverage, 
        max_coverage, 
        risk_factor, 
        is_active, 
        created_at, 
        updated_at
      ) VALUES (
        gen_random_uuid()::uuid, 
        $1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW()
      ) RETURNING *
    `, [
      product_id, 
      productCode, 
      coverage_tier, 
      base_rate, 
      min_coverage, 
      max_coverage || null, 
      risk_factor || 1.0
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Failed to create premium rate:', error);
    console.error('SQL Error details:', error.message);
    res.status(500).json({ 
      error: 'Failed to create premium rate',
      details: error.message
    });
  }
});

// =============================================
// PUT /:id – Update a premium rate
// =============================================
router.put('/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { base_rate, min_coverage, max_coverage, risk_factor, is_active } = req.body;

    const result = await pool.query(`
      UPDATE premium_rates 
      SET base_rate = COALESCE($1, base_rate),
          min_coverage = COALESCE($2, min_coverage),
          max_coverage = COALESCE($3, max_coverage),
          risk_factor = COALESCE($4, risk_factor),
          is_active = COALESCE($5, is_active),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [base_rate, min_coverage, max_coverage, risk_factor, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Premium rate not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update premium rate:', error);
    res.status(500).json({ error: 'Failed to update premium rate' });
  }
});

// =============================================
// DELETE /:id – Delete a premium rate
// =============================================
router.delete('/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM premium_rates WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Premium rate not found' });
    }
    res.json({ message: 'Premium rate deleted successfully' });
  } catch (error) {
    console.error('Failed to delete premium rate:', error);
    res.status(500).json({ error: 'Failed to delete premium rate' });
  }
});

// =============================================
// PATCH /:id/toggle – Toggle active status
// =============================================
router.patch('/:id/toggle', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await pool.query(`
      UPDATE premium_rates 
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Premium rate not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to toggle premium rate:', error);
    res.status(500).json({ error: 'Failed to toggle premium rate' });
  }
});

export default router;