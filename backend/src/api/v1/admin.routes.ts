import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware';
import pool from '../../lib/db';

const router = Router();

// ---------------------------------------------------------------------------
// Get all hospitals
// ---------------------------------------------------------------------------
router.get('/hospitals', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT "hospitalName" 
       FROM hospital_list 
       WHERE "isActive" = true 
       ORDER BY "hospitalName" ASC`
    );
    res.json(result.rows.map((row: any) => row.hospitalName));
  } catch (error) {
    console.error('[Settings] Fetch hospitals error:', error);
    // Fallback list
    res.json([
      'Tikur Anbessa Specialized Hospital',
      "St. Paul's Hospital Millennium Medical College",
      'Yekatit 12 Hospital Medical College',
      'Zewditu Memorial Hospital',
      'Alert Hospital',
      'Menelik II Referral Hospital',
      'Gandhi Memorial Hospital',
    ]);
  }
});

// ---------------------------------------------------------------------------
// Add hospital (admin only)
// ---------------------------------------------------------------------------
router.post('/hospitals', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Hospital name is required' });
    }
    await pool.query(
      `INSERT INTO hospital_list ("hospitalName") VALUES ($1) ON CONFLICT ("hospitalName") DO NOTHING`,
      [name.trim()]
    );
    res.status(201).json({ message: 'Hospital added' });
  } catch (error) {
    console.error('[Settings] Add hospital error:', error);
    res.status(500).json({ error: 'Failed to add hospital' });
  }
});

// ---------------------------------------------------------------------------
// Update hospital (admin only)
// ---------------------------------------------------------------------------
router.put('/hospitals/:name', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { name: oldName } = req.params;
    const { name: newName } = req.body;
    if (!newName || newName.trim().length === 0) {
      return res.status(400).json({ error: 'New hospital name is required' });
    }
    await pool.query(
      `UPDATE hospital_list SET "hospitalName" = $1 WHERE "hospitalName" = $2`,
      [newName.trim(), oldName]
    );
    res.json({ message: 'Hospital updated' });
  } catch (error) {
    console.error('[Settings] Update hospital error:', error);
    res.status(500).json({ error: 'Failed to update hospital' });
  }
});

// ---------------------------------------------------------------------------
// Delete hospital (admin only)
// ---------------------------------------------------------------------------
router.delete('/hospitals/:name', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    await pool.query(`DELETE FROM hospital_list WHERE "hospitalName" = $1`, [name]);
    res.json({ message: 'Hospital deleted' });
  } catch (error) {
    console.error('[Settings] Delete hospital error:', error);
    res.status(500).json({ error: 'Failed to delete hospital' });
  }
});

// ---------------------------------------------------------------------------
// Get all system settings
// ---------------------------------------------------------------------------
router.get('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, "settingKey", "settingValue", "settingType", description, "isPublic", "createdAt", "updatedAt", "updatedBy"
       FROM system_settings
       ORDER BY "settingKey" ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[Settings] Fetch settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ---------------------------------------------------------------------------
// Update a setting (admin only)
// ---------------------------------------------------------------------------
router.put('/:key', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const key = String(req.params.key);
    const { value } = req.body;
    const userId = req.user!.id;

    await pool.query(
      `UPDATE system_settings 
       SET "settingValue" = $1, "updatedAt" = NOW(), "updatedBy" = $2
       WHERE "settingKey" = $3`,
      [value, userId, key]
    );

    res.json({ message: 'Setting updated' });
  } catch (error) {
    console.error('[Settings] Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;