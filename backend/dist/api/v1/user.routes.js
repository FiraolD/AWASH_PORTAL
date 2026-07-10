import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import bcrypt from 'bcryptjs';
const router = Router();
// ==================== ADMIN USER MANAGEMENT ====================
// Get all users (admin only)
router.get('/', authenticate, authorize('MASTER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT id, email, "firstName", "lastName", role, status, phone, "avatarUrl", "createdAt", "lastLoginAt"
      FROM users
      ORDER BY "createdAt" DESC
    `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// Get all customers (for customer admin)
router.get('/customers', authenticate, authorize('CUSTOMER_ADMIN', 'MASTER_ADMIN'), async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT id, email, "firstName", "lastName", role, status, phone, "avatarUrl", "createdAt", "lastLoginAt"
      FROM users 
      WHERE role = 'CUSTOMER'
      ORDER BY "createdAt" DESC
    `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch customers:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});
// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, email, "firstName", "lastName", role, status, phone, "avatarUrl", "createdAt"
       FROM users WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to fetch user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});
// Get customer by ID (for customer admin)
router.get('/customers/:id', authenticate, authorize('CUSTOMER_ADMIN', 'MASTER_ADMIN'), async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT id, email, "firstName", "lastName", role, status, phone, "avatarUrl", address, "createdAt"
      FROM users 
      WHERE id = $1 AND role = 'CUSTOMER'
    `, [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to fetch customer:', error);
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
});
// Create user (admin only)
router.post('/', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        const { email, password, firstName, lastName, role, phone } = req.body;
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(`INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", role, phone, status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::uuid, $1, $2, $3, $4, $5, $6, 'ACTIVE', NOW(), NOW())
       RETURNING id, email, "firstName", "lastName", role`, [email.toLowerCase(), hashedPassword, firstName, lastName, role || 'CUSTOMER', phone || null]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to create user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});
// Update user
router.put('/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        const { firstName, lastName, role, phone, status } = req.body;
        await pool.query(`UPDATE users 
       SET "firstName" = COALESCE($1, "firstName"),
           "lastName" = COALESCE($2, "lastName"),
           role = COALESCE($3, role),
           phone = COALESCE($4, phone),
           status = COALESCE($5, status),
           "updatedAt" = NOW()
       WHERE id = $6`, [firstName, lastName, role, phone, status, req.params.id]);
        res.json({ message: 'User updated successfully' });
    }
    catch (error) {
        console.error('Failed to update user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});
// Update customer (for customer admin)
router.put('/customers/:id', authenticate, authorize('CUSTOMER_ADMIN', 'MASTER_ADMIN'), async (req, res) => {
    try {
        const { firstName, lastName, phone, status, address } = req.body;
        await pool.query(`UPDATE users 
       SET "firstName" = COALESCE($1, "firstName"),
           "lastName" = COALESCE($2, "lastName"),
           phone = COALESCE($3, phone),
           status = COALESCE($4, status),
           address = COALESCE($5, address),
           "updatedAt" = NOW()
       WHERE id = $6 AND role = 'CUSTOMER'`, [firstName, lastName, phone, status, address, req.params.id]);
        res.json({ message: 'Customer updated successfully' });
    }
    catch (error) {
        console.error('Failed to update customer:', error);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});
// Delete user
router.delete('/:id', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Failed to delete user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
// Update user status
router.patch('/:id/status', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        const { status } = req.body;
        await pool.query('UPDATE users SET status = $1, "updatedAt" = NOW() WHERE id = $2', [status, req.params.id]);
        res.json({ message: `User ${status.toLowerCase()} successfully` });
    }
    catch (error) {
        console.error('Failed to update user status:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});
// Get available users for role assignment
router.get('/available/for-role', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT id, email, "firstName", "lastName", role
      FROM users
      WHERE role != 'MASTER_ADMIN'
      ORDER BY "firstName" ASC
    `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch available users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// Get customer stats (for customer admin dashboard)
router.get('/stats/customers', authenticate, authorize('CUSTOMER_ADMIN', 'MASTER_ADMIN'), async (req, res) => {
    try {
        const totalCustomers = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER'");
        const activeCustomers = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER' AND status = 'ACTIVE'");
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const newCustomersThisMonth = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER' AND \"createdAt\" >= $1", [startOfMonth]);
        res.json({
            totalCustomers: parseInt(totalCustomers.rows[0].count),
            activeCustomers: parseInt(activeCustomers.rows[0].count),
            newCustomersThisMonth: parseInt(newCustomersThisMonth.rows[0].count)
        });
    }
    catch (error) {
        console.error('Failed to fetch customer stats:', error);
        res.status(500).json({ error: 'Failed to fetch customer stats' });
    }
});
export default router;
