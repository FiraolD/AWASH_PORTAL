const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { validationResult } = require('express-validator');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';
// ---------------------------------------------------------------------------
// REGISTER
// ---------------------------------------------------------------------------
exports.register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { name, email, password } = req.body;
        // Check if user exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        // Create user – use "passwordHash" column
        const result = await pool.query(`INSERT INTO users (id, email, "passwordHash", role, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'CUSTOMER', NOW(), NOW())
       RETURNING id, email, role`, [email.toLowerCase(), hashedPassword]);
        // Generate token
        const token = jwt.sign({ id: result.rows[0].id, email: result.rows[0].email, role: result.rows[0].role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(201).json({
            user: { id: result.rows[0].id, email: result.rows[0].email, role: result.rows[0].role },
            token,
        });
    }
    catch (error) {
        console.error('[Auth] Register error:', error.message);
        res.status(500).json({ error: 'Registration failed' });
    }
};
// ---------------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------------
exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password } = req.body;
        // Find user – select "passwordHash"
        const result = await pool.query('SELECT id, email, "passwordHash", role, "firstName", "lastName", "isActive" FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = result.rows[0];
        // Check if account is active
        if (user.isActive === false) {
            return res.status(403).json({ error: 'Account is deactivated. Contact support.' });
        }
        // Compare password – use user.passwordHash
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate token
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
            },
            token,
        });
    }
    catch (error) {
        console.error('[Auth] Login error:', error.message);
        res.status(500).json({ error: 'Login failed' });
    }
};
// ---------------------------------------------------------------------------
// GET PROFILE
// ---------------------------------------------------------------------------
exports.getProfile = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, role, "firstName", "lastName", phone, address, "createdAt" FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('[Auth] Profile error:', error.message);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};
