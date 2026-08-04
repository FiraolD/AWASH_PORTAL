import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware.js';
import pool from '../../lib/db.js';
import { createAuditLog, getClientIp, getHeaderString } from './audit.routes.js';

const router = Router();

router.get('/', authenticate, authorizeExecutives, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        pr.id,
        pr."productId",
        p.name AS "productName",
        p.code AS "productCode",
        pr."productType",
        pr."coverageTier",
        pr."baseRate",
        pr."minCoverage",
        pr."maxCoverage",
        pr."riskFactor",
        pr."isActive",
        pr."createdAt",
        pr."updatedAt"
      FROM premium_rates pr
      LEFT JOIN products p
        ON pr."productId" = p.id
      ORDER BY p.name, pr."coverageTier"
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('[PremiumRates] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch premium rates' });
  }
});

router.get('/product/:productId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM premium_rates
      WHERE "productId" = $1
      ORDER BY "coverageTier"
      `,
      [req.params.productId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[PremiumRates] Product fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch premium rates' });
  }
});
// Create
router.post('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const {
  productId,
  productType,
  coverageTier,
  baseRate,
  minCoverage,
  maxCoverage,
  riskFactor
} = req.body;

    if (!productType || !coverageTier || baseRate === undefined || !minCoverage || !maxCoverage || !riskFactor) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

const result = await pool.query(
`
INSERT INTO premium_rates (
    "productId",
    "productType",
    "coverageTier",
    "baseRate",
    "minCoverage",
    "maxCoverage",
    "riskFactor",
    "isActive",
    "createdAt",
    "updatedAt"
)
VALUES (
    $1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW()
)
RETURNING *
`,
[
    productId,
    productType,
    coverageTier,
    baseRate,
    minCoverage,
    maxCoverage,
    riskFactor
]
);

    await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'CREATE', 'PREMIUM_RATE', result.rows[0].id, null, result.rows[0], getClientIp(req), getHeaderString(req, 'user-agent'));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[PremiumRates] Create error:', error);
    res.status(500).json({ error: 'Failed to create premium rate' });
  }
});

// Update
router.put(
  '/:id',
  authenticate,
  authorizeExecutives,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = String(req.params.id);

      // Check if record exists
      const oldResult = await pool.query(
        'SELECT * FROM premium_rates WHERE id = $1',
        [id]
      );
      
      if (oldResult.rows.length === 0) {
        return res.status(404).json({ error: 'Premium rate not found' });
      }

      const oldData = oldResult.rows[0];
      const d = req.body;

      // Update with matching placeholders and values
      await pool.query(
        `UPDATE premium_rates
         SET
           "productId"   = $1,
           "productType" = $2,
           "baseRate"    = $3,
           "minCoverage" = $4,
           "maxCoverage" = $5,
           "riskFactor"  = $6,
           "isActive"    = $7,
           "updatedAt"   = NOW()
         WHERE id = $9`,
        [
          d.productId   ?? oldData.productId,      // $1
          d.productType ?? oldData.productType,     // $2
          d.baseRate    ?? oldData.baseRate,        // $3
          d.minCoverage ?? oldData.minCoverage,     // $4
          d.maxCoverage ?? oldData.maxCoverage,     // $5
          d.riskFactor  ?? oldData.riskFactor,      // $6
          d.isActive    ?? oldData.isActive,        // $7
          id,                                       // $9
        ]
      );

      // Fetch updated record
      const updated = await pool.query(
        'SELECT * FROM premium_rates WHERE id = $1',
        [id]
      );

      // Audit log
      await createAuditLog(
        req.user!.id,
        req.user!.email,
        req.user!.role,
        'UPDATE',
        'PREMIUM_RATE',
        id,
        oldData,
        updated.rows[0],
        getClientIp(req),
        getHeaderString(req, 'user-agent')
      );

      res.json(updated.rows[0]);
    } catch (error) {
      console.error('[PremiumRates] Update error:', error);
      res.status(500).json({ error: 'Failed to update premium rate' });
    }
  }
);

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
    const checkResult = await pool.query('SELECT id, "isActive", "coverageTier" FROM premium_rates WHERE id=$1', [id]);
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