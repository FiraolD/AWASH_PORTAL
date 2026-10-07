import { Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../lib/db.js';
import { AuthRequest } from '../api/middleware/auth.middleware.js';

export const UserController = {
  // Get all users
  getAllUsers: async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT id, email, "firstName", "lastName", role, status, phone, "createdAt", "lastLoginAt"
        FROM users ORDER BY "createdAt" DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  // Get customers only
  getCustomers: async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT id, email, "firstName", "lastName", role, status, phone, "createdAt"
        FROM users WHERE role = 'CUSTOMER' ORDER BY "createdAt" DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  },

  // Get user by ID
  getUserById: async (req: AuthRequest, res: Response) => {
    try {
      const id = String(req.params.id);
      const result = await pool.query(`
        SELECT id, email, "firstName", "lastName", role, status, phone,
               "addressStreet", "addressCity", "addressState", "addressZip", "addressCountry",
               "avatarUrl", "createdAt", "lastLoginAt"
        FROM users WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  },

  // Create user
  createUser: async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, firstName, lastName, role, phone } = req.body;

      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(`
        INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", role, phone, status, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'ACTIVE', NOW(), NOW())
        RETURNING id, email, "firstName", "lastName", role, phone
      `, [email, hashedPassword, firstName, lastName, role, phone]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Failed to create user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  },

  // Update user
  updateUser: async (req: AuthRequest, res: Response) => {
    try {
      const id = String(req.params.id);
      const { firstName, lastName, phone, role, addressStreet, addressCity, addressState, addressZip, addressCountry } = req.body;

      const result = await pool.query(`
        UPDATE users SET "firstName" = $1, "lastName" = $2, phone = $3, role = $4,
          "addressStreet" = $5, "addressCity" = $6, "addressState" = $7, "addressZip" = $8, "addressCountry" = $9,
          "updatedAt" = NOW()
        WHERE id = $10 RETURNING id, email, "firstName", "lastName", role, phone
      `, [firstName, lastName, phone, role, addressStreet, addressCity, addressState, addressZip, addressCountry, id]);

      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Failed to update user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  },

  // Update user status
  updateUserStatus: async (req: AuthRequest, res: Response) => {
    try {
      const id = String(req.params.id);
      const { status } = req.body;

      await pool.query('UPDATE users SET status = $1, "updatedAt" = NOW() WHERE id = $2', [status, id]);
      res.json({ message: `User ${status.toLowerCase()} successfully` });
    } catch (error) {
      console.error('Failed to update user status:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  },

  // Delete user
  deleteUser: async (req: AuthRequest, res: Response) => {
    try {
      const id = String(req.params.id);
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Failed to delete user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  },
};