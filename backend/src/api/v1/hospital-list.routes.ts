import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware.js';
import pool from '../../lib/db.js';
import { createAuditLog, getClientIp, getHeaderString } from './audit.routes';

const router = Router();

// Public list
router.get('/', async (req, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT "hospitalName" FROM hospital_list WHERE "isActive"=true ORDER BY "hospitalName"`
    );
    res.json(result.rows.map((r: any) => r.hospitalName));
  } catch (error) {
    res.json(['Tikur Anbessa Specialized Hospital', "St. Paul's Hospital Millennium Medical College", 'Yekatit 12 Hospital Medical College']);
  }
});

// Admin all
router.get('/all', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`SELECT id, "hospitalName", "isActive", "createdAt", "updatedAt" FROM hospital_list ORDER BY "hospitalName"`);
    res.json(result.rows);
  } catch (error) {
    console.error('[Hospital] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});

// Create
router.post('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { hospitalName } = req.body;
    if (!hospitalName || !hospitalName.trim()) return res.status(400).json({ error: 'Name required' });

    const exist = await pool.query('SELECT id FROM hospital_list WHERE "hospitalName"=$1', [hospitalName.trim()]);
    if (exist.rows.length > 0) {
      await pool.query(`UPDATE hospital_list SET "isActive"=true, "updatedAt"=NOW() WHERE "hospitalName"=$1`, [hospitalName.trim()]);
      return res.json({ message: 'Hospital reactivated' });
    }

    const result = await pool.query(
      `INSERT INTO hospital_list ("hospitalName", "isActive", "createdAt", "updatedAt") VALUES ($1,true,NOW(),NOW()) RETURNING *`,
      [hospitalName.trim()]
    );

    await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'CREATE', 'HOSPITAL', result.rows[0].id, null, result.rows[0], getClientIp(req), getHeaderString(req, 'user-agent'));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[Hospital] Create error:', error);
    res.status(500).json({ error: 'Failed to add hospital' });
  }
});

// Update
router.put('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { hospitalName } = req.body;
    if (!hospitalName || !hospitalName.trim()) return res.status(400).json({ error: 'Name required' });

    const oldResult = await pool.query('SELECT * FROM hospital_list WHERE id=$1', [id]);
    if (oldResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    await pool.query(`UPDATE hospital_list SET "hospitalName"=$1, "updatedAt"=NOW() WHERE id=$2`, [hospitalName.trim(), id]);

    const updated = await pool.query('SELECT * FROM hospital_list WHERE id=$1', [id]);
    await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'UPDATE', 'HOSPITAL', id, oldResult.rows[0], updated.rows[0], getClientIp(req), getHeaderString(req, 'user-agent'));
    res.json(updated.rows[0]);
  } catch (error) {
    console.error('[Hospital] Update error:', error);
    res.status(500).json({ error: 'Failed to update hospital' });
  }
});

// Deactivate
router.delete('/:id', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const oldResult = await pool.query('SELECT * FROM hospital_list WHERE id=$1', [id]);
    if (oldResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    await pool.query(`UPDATE hospital_list SET "isActive"=false, "updatedAt"=NOW() WHERE id=$1`, [id]);
    await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'DEACTIVATE', 'HOSPITAL', id, oldResult.rows[0], { isActive: false }, getClientIp(req), getHeaderString(req, 'user-agent'));
    res.json({ message: 'Hospital deactivated' });
  } catch (error) {
    console.error('[Hospital] Delete error:', error);
    res.status(500).json({ error: 'Failed to deactivate hospital' });
  }
});

export default router;