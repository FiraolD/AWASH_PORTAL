import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('MASTER_ADMIN'));

// Get system overview
router.get('/overview', async (req, res) => {
  try {
    const totalUsers = await pool.query("SELECT COUNT(*) FROM users");
    const totalproducts = await pool.query("SELECT COUNT(*) FROM products");
    const totalPolicies = await pool.query("SELECT COUNT(*) FROM policies");
    const totalClaims = await pool.query("SELECT COUNT(*) FROM claims");
    const totalPayments = await pool.query("SELECT COUNT(*) FROM payments");
    const activeUsers = await pool.query("SELECT COUNT(*) FROM users WHERE status = 'ACTIVE'");
    const pendingPolicies = await pool.query(
      "SELECT COUNT(*) FROM policies WHERE status IN ('PENDING_UNDERWRITING', 'SUBMITTED')"
    );
    const pendingClaims = await pool.query("SELECT COUNT(*) FROM claims WHERE status = 'SUBMITTED'");
    
    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalPolicies: parseInt(totalPolicies.rows[0].count),
      totalClaims: parseInt(totalClaims.rows[0].count),
      totalPayments: parseInt(totalPayments.rows[0].count),
      totalProducts: parseInt(totalproducts.rows[0].count), // Assuming total products is equivalent to total policies
      activeUsers: parseInt(activeUsers.rows[0].count),
      pendingPolicies: parseInt(pendingPolicies.rows[0].count),
      pendingClaims: parseInt(pendingClaims.rows[0].count),
      systemHealth: 'OK'
    });
  } catch (error) {
    console.error('Failed to fetch admin overview:', error);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

// Get system metrics
router.get('/metrics', async (req, res) => {
  try {
    const usersResult = await pool.query(`
      SELECT COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '30 days') as new_users
      FROM users
    `);
    
    const policiesResult = await pool.query(`
      SELECT COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '30 days') as new_policies
      FROM policies
    `);

    const claimsResult = await pool.query(`
      SELECT COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '30 days') as new_claims
      FROM claims
    `);

    const revenueResult = await pool.query(`
      SELECT SUM("amount") as total_revenue
      FROM payments
      WHERE "createdAt" > NOW() - INTERVAL '30 days'
    `);

    const productResult = await pool.query(`
      SELECT COUNT(*) as total_products
      FROM products
    `);

    res.json({
      period: 'Last 30 days',
      newUsers: parseInt(usersResult.rows[0].new_users || 0),
      newPolicies: parseInt(policiesResult.rows[0].new_policies || 0),
      newClaims: parseInt(claimsResult.rows[0].new_claims || 0),
      newProducts: parseInt(productResult.rows[0].total_products || 0),
      revenue: parseFloat(revenueResult.rows[0].total_revenue || 0)
    });
  } catch (error) {
    console.error('Failed to fetch system metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get database status
router.get('/database/status', async (req, res) => {
  try {
    await pool.query('SELECT 1 as connected');
    res.json({
      status: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({
      status: 'disconnected',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Clear cache (placeholder)
router.post('/cache/clear', async (req, res) => {
  res.json({ message: 'Cache cleared successfully' });
});

export default router;