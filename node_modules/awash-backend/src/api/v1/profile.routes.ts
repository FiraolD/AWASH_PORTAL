import { Router } from 'express';
import pool from '../../lib/db.js';
import { uploadAvatar } from '../middleware/upload.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import bcrypt from 'bcryptjs';

const router = Router();

router.use(authenticate);

// Get profile
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const result = await pool.query(
      `SELECT id, email, "firstName", "lastName", phone, "avatarUrl", address, date_of_birth, gender, created_at, last_login_at
       FROM users WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.put('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { firstName, lastName, phone, address, dateOfBirth, gender } = req.body;
    
    const result = await pool.query(
      `UPDATE users 
       SET "firstName" = COALESCE($1, "firstName"),
           "lastName" = COALESCE($2, "lastName"),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           date_of_birth = COALESCE($5, date_of_birth),
           gender = COALESCE($6, gender),
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, email, "firstName", "lastName", phone, "avatarUrl", address, date_of_birth, gender`,
      [firstName, lastName, phone, address, dateOfBirth, gender, userId]
    );
    
    res.json({ message: 'Profile updated successfully', profile: result.rows[0] });
  } catch (error) {
    console.error('Failed to update profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;
    
    const result = await pool.query(
      'SELECT "passwordHash" FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET "passwordHash" = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Failed to change password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Upload avatar
router.post('/avatar', uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Create the avatar URL path
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    const result = await pool.query(
      `UPDATE users SET "avatarUrl" = $1, updated_at = NOW() WHERE id = $2 RETURNING "avatarUrl"`,
      [avatarUrl, userId]
    );
    
    res.json({ message: 'Avatar updated successfully', avatarUrl: result.rows[0].avatarUrl });
  } catch (error) {
    console.error('Failed to upload avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

export default router;



