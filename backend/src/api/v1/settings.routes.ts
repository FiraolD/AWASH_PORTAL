import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware.js';
import pool from '../../lib/db.js';
import { createAuditLog, getClientIp, getHeaderString } from './audit.routes.js';

const router = Router();

// Get all
router.get('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, "settingKey", "settingValue", "settingType", description, "isPublic", "createdAt", "updatedAt", "updatedBy"
       FROM system_settings ORDER BY "settingKey"`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[Settings] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get public
router.get('/public', async (req, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT "settingKey", "settingValue", "settingType" FROM system_settings WHERE "isPublic"=true ORDER BY "settingKey"`
    );
    const settings: Record<string, any> = {};
    result.rows.forEach((row: any) => {
      let val: any = row.settingValue;
      if (row.settingType === 'number') val = Number(val);
      if (row.settingType === 'boolean') val = val === 'true';
      if (row.settingType === 'json') { try { val = JSON.parse(val); } catch {} }
      settings[row.settingKey] = val;
    });
    res.json(settings);
  } catch (error) {
    console.error('[Settings] Public error:', error);
    res.status(500).json({ error: 'Failed to fetch public settings' });
  }
});

// Upsert
router.put('/:key', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const key = String(req.params.key);
    const { value, type, description, isPublic } = req.body;
    if (!value && value !== '' && value !== false) return res.status(400).json({ error: 'Value required' });

    const result = await pool.query(
      `INSERT INTO system_settings ("settingKey", "settingValue", "settingType", description, "isPublic", "updatedBy", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       ON CONFLICT ("settingKey") DO UPDATE SET "settingValue"=$2, "settingType"=$3, description=COALESCE($4,system_settings.description), "isPublic"=COALESCE($5,system_settings."isPublic"), "updatedBy"=$6, "updatedAt"=NOW()
       RETURNING *`,
      [key, String(value), type || 'string', description || null, isPublic !== undefined ? isPublic : false, req.user!.id]
    );

    await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'UPSERT', 'SYSTEM_SETTING', key, null, { value: String(value), type: type || 'string' }, getClientIp(req), getHeaderString(req, 'user-agent'));
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Settings] Upsert error:', error);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

// Delete
router.delete('/:key', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const key = String(req.params.key);
    const oldResult = await pool.query('SELECT * FROM system_settings WHERE "settingKey"=$1', [key]);
    if (oldResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    await pool.query('DELETE FROM system_settings WHERE "settingKey"=$1', [key]);
    await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'DELETE', 'SYSTEM_SETTING', key, oldResult.rows[0], null, getClientIp(req), getHeaderString(req, 'user-agent'));
    res.json({ message: 'Setting deleted' });
  } catch (error) {
    console.error('[Settings] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

export default router;