import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware';
import pool from '../../lib/db';
import { createAuditLog } from './audit.routes';
const router = Router();

// ---------------------------------------------------------------------------
// Get all system settings (admin only)
// ---------------------------------------------------------------------------
router.get('/', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
          id,
          "settingKey",
          "settingValue",
          "settingType",
          description,
          "isPublic",
          "createdAt",
          "updatedAt",
          "updatedBy"
       FROM system_settings
       ORDER BY "settingKey" ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[SystemSettings] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// ---------------------------------------------------------------------------
// Get public system settings (no auth required)
// ---------------------------------------------------------------------------
router.get('/public', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          "settingKey",
          "settingValue",
          "settingType"
       FROM system_settings
       WHERE "isPublic" = true
       ORDER BY "settingKey" ASC`
    );

    // Convert to key-value object
    const settings: Record<string, any> = {};
    result.rows.forEach((row: any) => {
      let value: any = row.settingValue;
      if (row.settingType === 'number') value = Number(value);
      if (row.settingType === 'boolean') value = value === 'true';
      if (row.settingType === 'json') {
        try { value = JSON.parse(value); } catch { /* keep as string */ }
      }
      settings[row.settingKey] = value;
    });

    res.json(settings);
  } catch (error) {
    console.error('[SystemSettings] Fetch public error:', error);
    res.status(500).json({ error: 'Failed to fetch public settings' });
  }
});

// ---------------------------------------------------------------------------
// Get single setting by key
// ---------------------------------------------------------------------------
router.get('/:key', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;

    const result = await pool.query(
      `SELECT * FROM system_settings WHERE "settingKey" = $1`,
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[SystemSettings] Fetch single error:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// ---------------------------------------------------------------------------
// Create or update a setting (upsert)
// ---------------------------------------------------------------------------
router.put('/:key', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { value, type, description, isPublic } = req.body;
    const userId = req.user!.id;

    if (!value && value !== '' && value !== false) {
      return res.status(400).json({ error: 'Value is required' });
    }

    // Upsert
    const result = await pool.query(
      `INSERT INTO system_settings (
        "settingKey",
        "settingValue",
        "settingType",
        description,
        "isPublic",
        "updatedBy",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT ("settingKey") 
      DO UPDATE SET 
        "settingValue" = $2,
        "settingType" = $3,
        description = COALESCE($4, system_settings.description),
        "isPublic" = COALESCE($5, system_settings."isPublic"),
        "updatedBy" = $6,
        "updatedAt" = NOW()
      RETURNING *`,
      [
        key,
        String(value),
        type || 'string',
        description || null,
        isPublic !== undefined ? isPublic : false,
        userId,
      ]
    );

    // Log audit
await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'UPSERT', 'SYSTEM_SETTING',
   key, null, { value: String(value) }, req.ip || '0.0.0.0', req.headers?.['user-agent'] || 'system');

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[SystemSettings] Upsert error:', error);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

// ---------------------------------------------------------------------------
// Delete a setting
// ---------------------------------------------------------------------------
router.delete('/:key', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;

    const oldResult = await pool.query(
      'SELECT * FROM system_settings WHERE "settingKey" = $1',
      [key]
    );
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    await pool.query('DELETE FROM system_settings WHERE "settingKey" = $1', [key]);

 await createAuditLog(req.user!.id, req.user!.email, req.user!.role, 'DELETE', 'SYSTEM_SETTING',
   key, oldResult.rows[0], null, req.ip || '0.0.0.0', req.headers?.['user-agent'] || 'system');

    res.json({ message: 'Setting deleted' });
  } catch (error) {
    console.error('[SystemSettings] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

// ---------------------------------------------------------------------------
// Bulk update settings
// ---------------------------------------------------------------------------
router.post('/bulk', authenticate, authorizeExecutives, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { settings } = req.body; // Array of { key, value, type }
    const userId = req.user!.id;

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({ error: 'Settings array is required' });
    }

    await client.query('BEGIN');

    for (const setting of settings) {
      await client.query(
        `INSERT INTO system_settings (
          "settingKey", "settingValue", "settingType", "updatedBy", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT ("settingKey") 
        DO UPDATE SET 
          "settingValue" = $2,
          "settingType" = $3,
          "updatedBy" = $4,
          "updatedAt" = NOW()`,
        [setting.key, String(setting.value), setting.type || 'string', userId]
      );
    }

    await client.query('COMMIT');

    res.json({ message: `${settings.length} settings updated` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[SystemSettings] Bulk update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  } finally {
    client.release();
  }
});

export default router;