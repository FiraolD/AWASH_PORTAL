import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../lib/db.js';
import { EmailService } from '../../services/email.service.js';
import { getJwtSecret } from '../../lib/security.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Find user case-insensitively
        const result = await pool.query(`SELECT id, email, "passwordHash", "firstName", "lastName", role, status 
       FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const user = result.rows[0];
        // Check status
        if (user.status !== 'ACTIVE') {
            return res.status(401).json({ error: 'Account is inactive' });
        }
        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Generate token
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, getJwtSecret(), { expiresIn: '7d' });
        // Remove password hash from response
        const { passwordHash, ...userWithoutPassword } = user;
        res.json({
            success: true,
            user: userWithoutPassword,
            token
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;
        const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(`INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", phone, role, status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'CUSTOMER', 'ACTIVE', NOW(), NOW())
       RETURNING id, email, "firstName", "lastName", role`, [email.toLowerCase(), hashedPassword, firstName, lastName, phone || null]);
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, getJwtSecret(), { expiresIn: '7d' });
        res.status(201).json({ success: true, user, token });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
// Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const result = await pool.query(`SELECT id, email, "firstName", "lastName", role, status, phone, "avatarUrl", "createdAt" 
       FROM users WHERE id = $1`, [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Fetch current user error:', error);
        res.status(500).json({ error: 'Failed to fetch current user' });
    }
});
// Change password
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!currentPassword || !newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: 'Current password and new password are required. New password must be at least 8 characters.' });
        }
        const result = await pool.query('SELECT "passwordHash" FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isValid = await bcrypt.compare(currentPassword, result.rows[0].passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2', [hashedPassword, userId]);
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});
// Forgot password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const result = await pool.query('SELECT id, "firstName", "lastName" FROM users WHERE LOWER(email) = LOWER($1)', [email]);
        if (result.rows.length === 0) {
            return res.json({ message: 'If an account exists, a reset link will be sent' });
        }
        const user = result.rows[0];
        const resetToken = jwt.sign({ id: user.id, email }, getJwtSecret(), { expiresIn: '1h' });
        await EmailService.sendPasswordResetEmail(email, `${user.firstName} ${user.lastName}`, resetToken);
        res.json({ message: 'Password reset link sent to your email' });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});
// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword, password } = req.body;
        `r`;
        const nextPassword = newPassword || password;
        const decoded = jwt.verify(token, getJwtSecret());
        const hashedPassword = await bcrypt.hash(nextPassword, 10);
        await pool.query('UPDATE users SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2', [hashedPassword, decoded.id]);
        res.json({ message: 'Password reset successfully' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Invalid or expired token' });
    }
});
// Logout
router.post('/logout', authenticate, async (req, res) => {
    res.json({ message: 'Logged out successfully' });
});
// Verify reset token
router.post('/verify-reset-token', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        try {
            jwt.verify(token, getJwtSecret());
            res.json({ valid: true });
        }
        catch (error) {
            console.error('Invalid token:', error);
            res.status(400).json({ error: 'Invalid or expired token' });
        }
    }
    catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ error: 'Failed to verify token' });
    }
});
export default router;
