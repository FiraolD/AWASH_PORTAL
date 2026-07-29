import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../lib/db.js';
import { EmailService } from '../services/email.service.js';
import { config } from '../config/index.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

export const AuthController = {
  register: async (req, res) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(`
        INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", phone, role, status, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'CUSTOMER', 'ACTIVE', NOW(), NOW())
        RETURNING id, email, "firstName", "lastName", role
      `, [email.toLowerCase(), hashedPassword, firstName, lastName, phone || null]);

      const user = result.rows[0];

      await EmailService.sendWelcomeEmail(email, `${firstName} ${lastName}`);

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.status !== 'ACTIVE') {
        return res.status(401).json({ error: 'Account is inactive' });
      }

      await pool.query(
        'UPDATE users SET "lastLoginAt" = NOW() WHERE id = $1',
        [user.id]
      );

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      const { passwordHash, ...userWithoutPassword } = user;

      res.json({ success: true, user: userWithoutPassword, token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      const result = await pool.query(
        'SELECT id, email, "firstName", "lastName" FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        const resetToken = jwt.sign(
          { id: user.id, email: user.email },
          config.jwt.secret,
          { expiresIn: '1h' }
        );

        await EmailService.sendPasswordResetEmail(
          user.email,
          `${user.firstName} ${user.lastName}`,
          resetToken
        );
      }

      res.json({ message: 'If an account exists, you will receive a password reset email.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Failed to process request' });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      let decoded;
      try {
        decoded = jwt.verify(token, config.jwt.secret) as { id: string };
      } catch {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await pool.query(
        'UPDATE users SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2',
        [hashedPassword, decoded.id]
      );

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  },

  getCurrentUser: async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        'SELECT id, email, "firstName", "lastName", role, status, phone, "avatarUrl", "createdAt", "lastLoginAt" FROM users WHERE id = $1',
        [req.user!.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  },
};