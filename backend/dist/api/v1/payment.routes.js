import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
router.use(authenticate);
// Get my payments
router.get('/my-payments', async (req, res) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(`SELECT p.id, p."policyId", p."userId", p.amount, p."paymentMethod", p."referenceNumber", p."transactionId", p.status, p."paidAt", p."createdAt", p."updatedAt", 
              pol."policyNumber", pol.type
       FROM payments p
       JOIN policies pol ON pol.id = p."policyId"
       WHERE p."userId" = $1
       ORDER BY p."createdAt" DESC`, [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch payments:', error);
        res.json([]);
    }
});
// Get payment by ID
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(`SELECT p.id, p."policyId", p."userId", p.amount, p."paymentMethod", p."referenceNumber", p."transactionId", p.status, p."paidAt", p."createdAt", p."updatedAt",
              pol."policyNumber"
       FROM payments p
       JOIN policies pol ON pol.id = p."policyId"
       WHERE p.id = $1 AND p."userId" = $2`, [req.params.id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to fetch payment:', error);
        res.status(500).json({ error: 'Failed to fetch payment' });
    }
});
// Create payment
router.post('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { policyId, amount, paymentMethod, reference } = req.body;
        const result = await pool.query(`INSERT INTO payments (id, "policyId", "userId", amount, "paymentMethod", "referenceNumber", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'PENDING', NOW(), NOW())
       RETURNING id, "policyId", "userId", amount, "paymentMethod", "referenceNumber", "transactionId", status, "paidAt", "createdAt", "updatedAt"`, [policyId, userId, amount, paymentMethod, reference]);
        res.status(201).json({
            message: 'Payment initiated successfully',
            payment: result.rows[0]
        });
    }
    catch (error) {
        console.error('Failed to create payment:', error);
        res.status(500).json({ error: 'Failed to process payment' });
    }
});
// Update payment status (webhook)
router.patch('/:id/status', async (req, res) => {
    try {
        const { status, transactionId } = req.body;
        const result = await pool.query(`UPDATE payments 
       SET status = $1, "transactionId" = $2, "paidAt" = CASE WHEN $1 = 'COMPLETED' THEN NOW() ELSE "paidAt" END, "updatedAt" = NOW()
       WHERE id = $3
       RETURNING id, "policyId", "userId", amount, "paymentMethod", "referenceNumber", "transactionId", status, "paidAt", "createdAt", "updatedAt"`, [status, transactionId, req.params.id]);
        // If payment is completed, update policy payment status
        if (status === 'COMPLETED' && result.rows.length > 0) {
            await pool.query(`UPDATE policies 
         SET status = 'ACTIVE', "updatedAt" = NOW()
         WHERE id = $1`, [result.rows[0]["policyId"]]);
        }
        res.json({ message: 'Payment status updated', payment: result.rows[0] });
    }
    catch (error) {
        console.error('Failed to update payment status:', error);
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});
// Get payment methods
router.get('/methods/list', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM payment_methods WHERE is_active = true ORDER BY name ASC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch payment methods:', error);
        res.json([]);
    }
});
export default router;
