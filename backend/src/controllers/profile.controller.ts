import { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import pool from '../lib/db.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/avatars';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  },
});

export const ProfileController = {
  getProfile: async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT id, email, "firstName", "lastName", phone, 
               "addressStreet", "addressCity", "addressState", "addressZip", "addressCountry",
               "avatarUrl", role, status, "createdAt", "lastLoginAt"
        FROM users WHERE id = $1
      `, [req.user!.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  },

  updateProfile: async (req: AuthRequest, res: Response) => {
    try {
      const { firstName, lastName, phone, addressStreet, addressCity, addressState, addressZip, addressCountry } = req.body;

      const result = await pool.query(`
        UPDATE users 
        SET "firstName" = $1, "lastName" = $2, phone = $3,
            "addressStreet" = $4, "addressCity" = $5, "addressState" = $6, 
            "addressZip" = $7, "addressCountry" = $8, "updatedAt" = NOW()
        WHERE id = $9
        RETURNING id, email, "firstName", "lastName", phone, 
                  "addressStreet", "addressCity", "addressState", "addressZip", "addressCountry",
                  "avatarUrl", role, status
      `, [firstName, lastName, phone, addressStreet, addressCity, addressState, addressZip, addressCountry, req.user!.id]);

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  },

  uploadAvatar: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      const result = await pool.query(`
        UPDATE users SET "avatarUrl" = $1, "updatedAt" = NOW()
        WHERE id = $2 RETURNING "avatarUrl"
      `, [avatarUrl, req.user!.id]);

      res.json({ avatarUrl: result.rows[0].avatarUrl });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      res.status(500).json({ error: 'Failed to upload avatar' });
    }
  },

  changePassword: async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const result = await pool.query(
        'SELECT "passwordHash" FROM users WHERE id = $1',
        [req.user!.id]
      );

      const isValid = await bcrypt.compare(currentPassword, result.rows[0].passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await pool.query(
        'UPDATE users SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2',
        [hashedPassword, req.user!.id]
      );

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  },
};