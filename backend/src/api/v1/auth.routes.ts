import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../../lib/db.js';
import { generateToken, authenticate } from '../../middleware/auth.middleware.js';
import { sendVerificationEmail } from '../../services/email.service.js';

const router = Router();

// ---------------------------------------------------------------------------
// SIGNUP – Create customer account
// ---------------------------------------------------------------------------
router.post('/signup', async (req, res: Response) => {
  try {
    const { firstName, lastName, email, phone, password, address } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'First name, last name, email, and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const existingPhone = await pool.query(
        'SELECT id FROM users WHERE phone = $1',
        [phone.trim()]
      );
      if (existingPhone.rows.length > 0) {
        return res.status(409).json({ error: 'An account with this phone number already exists' });
      }
    }

    // Hash the password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user – using "passwordHash" column
    const result = await pool.query(
      `INSERT INTO users (
        id, "firstName", "lastName", email, phone, "passwordHash", role,
        "emailVerified", "verificationToken", "verificationTokenExpires",
        "isActive", address, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, 'CUSTOMER',
        false, $6, $7, true, $8, NOW(), NOW()
      ) RETURNING id, email, "firstName", "lastName", role`,
      [
        firstName.trim(),
        lastName.trim(),
        email.toLowerCase().trim(),
        phone?.trim() || null,
        passwordHash,           // ✅ Hashed password stored in "passwordHash"
        verificationToken,
        verificationTokenExpires,
        address?.trim() || null,
      ]
    );

    const user = result.rows[0];

    // Send verification email (non-blocking)
    try {
      await sendVerificationEmail(user.email, user.firstName, verificationToken);
      console.log(`Verification email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    res.status(201).json({
      message: 'Account created successfully. Please check your email to activate your account.',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        emailVerified: false,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Signup error:', error.message);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// ---------------------------------------------------------------------------
// VERIFY EMAIL – Confirm email address
// ---------------------------------------------------------------------------
router.get('/verify-email', async (req, res: Response) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find user with this token
    const result = await pool.query(
      `SELECT id, email, "firstName" FROM users 
       WHERE "verificationToken" = $1 
         AND "verificationTokenExpires" > NOW()
         AND "emailVerified" = false`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or expired verification token. Please request a new verification email.' 
      });
    }

    const user = result.rows[0];

    // Mark email as verified
    await pool.query(
      `UPDATE users 
       SET "emailVerified" = true, 
           "verificationToken" = NULL, 
           "verificationTokenExpires" = NULL,
           "updatedAt" = NOW()
       WHERE id = $1`,
      [user.id]
    );

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3011')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)[0] || 'http://localhost:3011';

    res.redirect(`${frontendUrl}/login?verified=true&email=${encodeURIComponent(user.email)}`);
  } catch (error: any) {
    console.error('[Auth] Email verification error:', error.message);
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3011')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)[0] || 'http://localhost:3011';

    res.redirect(`${frontendUrl}/login?verified=false`);
  }
});

// ---------------------------------------------------------------------------
// RESEND VERIFICATION EMAIL
// ---------------------------------------------------------------------------
router.post('/resend-verification', async (req, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await pool.query(
      `SELECT id, email, "firstName", "emailVerified" FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    const user = result.rows[0];

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified. Please log in.' });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE users 
       SET "verificationToken" = $1, "verificationTokenExpires" = $2, "updatedAt" = NOW()
       WHERE id = $3`,
      [verificationToken, verificationTokenExpires, user.id]
    );

    await sendVerificationEmail(user.email, user.firstName, verificationToken);

    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (error: any) {
    console.error('[Auth] Resend verification error:', error.message);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// ---------------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------------
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user – select "passwordHash" column
    const result = await pool.query(
      `SELECT id, email, "passwordHash", role, "firstName", "lastName", "emailVerified", "isActive"
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.isActive) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in. Check your inbox for the activation link.',
      });
    }

    // Compare password using "passwordHash" column
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      token,
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error.message);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// ---------------------------------------------------------------------------
// GET PROFILE
// ---------------------------------------------------------------------------
router.get('/profile', authenticate, async (req, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, email, role, "firstName", "lastName", phone, address, "emailVerified", "createdAt"
       FROM users WHERE id = $1`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('[Auth] Profile error:', error.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;