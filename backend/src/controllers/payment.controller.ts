import { Response } from 'express';
import pool from '../lib/db.js';
import { AuthRequest } from '../api/middleware/auth.middleware.js';

export const PaymentController = {
  // Get user's payments
  getMyPayments: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const result = await pool.query(`
        SELECT p.*, pol."policyNumber"
        FROM payments p
        JOIN policies pol ON pol.id = p."policyId"
        WHERE p."userId" = $1 ORDER BY p.date DESC
      `, [userId]);
      res.json(result.rows);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  },

  // Get payment methods
  getPaymentMethods: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const result = await pool.query(`
        SELECT id, type, last4, brand, expiry, "isDefault", "createdAt"
        FROM payment_methods WHERE "userId" = $1 ORDER BY "isDefault" DESC, "createdAt" DESC
      `, [userId]);
      res.json(result.rows);
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
  },

  // Create payment method
  createPaymentMethod: async (req: AuthRequest, res: Response) => {
    try {
      const { type, last4, brand, expiry, isDefault } = req.body;
      const userId = req.user!.id;

      if (isDefault) {
        await pool.query('UPDATE payment_methods SET "isDefault" = false WHERE "userId" = $1', [userId]);
      }

      const result = await pool.query(`
        INSERT INTO payment_methods (id, "userId", type, last4, brand, expiry, "isDefault", "createdAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `, [userId, type, last4, brand, expiry, isDefault || false]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Failed to create payment method:', error);
      res.status(500).json({ error: 'Failed to create payment method' });
    }
  },

  // Delete payment method
  deletePaymentMethod: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM payment_methods WHERE id = $1 AND "userId" = $2', [id, req.user!.id]);
      res.json({ message: 'Payment method deleted successfully' });
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      res.status(500).json({ error: 'Failed to delete payment method' });
    }
  },
};