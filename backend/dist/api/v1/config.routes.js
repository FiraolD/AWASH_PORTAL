import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
const router = Router();
// Get all configuration
router.get('/', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM configuration ORDER BY category ASC, config_key ASC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch config:', error);
        res.json([]);
    }
});
// Get config by category
router.get('/:category', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM configuration WHERE category = $1 ORDER BY config_key ASC`, [req.params.category]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch config:', error);
        res.json([]);
    }
});
// Update configuration
router.put('/:key', authenticate, authorize('MASTER_ADMIN'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const { value } = req.body;
        const result = await pool.query(`INSERT INTO configuration (config_key, config_value, updated_at, updated_by)
       VALUES ($1, $2, NOW(), $3)
       ON CONFLICT (config_key) DO UPDATE
       SET config_value = EXCLUDED.config_value, updated_at = NOW(), updated_by = EXCLUDED.updated_by
       RETURNING *`, [req.params.key, JSON.stringify(value), userId]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to update config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
});
// Get role levels
router.get('/role-levels/list', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM role_levels WHERE is_active = true 
       ORDER BY department ASC, level_order ASC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch role levels:', error);
        res.json([]);
    }
});
export default router;
