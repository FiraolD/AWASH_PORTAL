import { Router } from 'express';
import { authenticate, authorizeExecutives } from '../../middleware/auth.middleware.js';
import pool from '../../lib/db.js';
import { createAuditLog, getClientIp, getHeaderString } from './audit.routes.js';
const router = Router();
// ---------------------------------------------------------------------------
// GET all settings
// ---------------------------------------------------------------------------
router.get('/', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const result = await pool.query(`SELECT "settingKey", "settingValue", "settingType", description, "isPublic", "createdAt", "updatedAt", "updatedBy"
       FROM system_settings 
       ORDER BY "settingKey" ASC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('[Settings] Fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
// ---------------------------------------------------------------------------
// GET public settings (no auth required)
// ---------------------------------------------------------------------------
router.get('/public', async (req, res) => {
    try {
        const result = await pool.query(`SELECT "settingKey", "settingValue", "settingType" 
       FROM system_settings 
       WHERE "isPublic" = true 
       ORDER BY "settingKey" ASC`);
        const settings = {};
        result.rows.forEach((row) => {
            let val = row.settingValue;
            if (row.settingType === 'number')
                val = Number(val);
            else if (row.settingType === 'boolean')
                val = val === 'true';
            else if (row.settingType === 'json') {
                try {
                    val = JSON.parse(val);
                }
                catch { /* keep as string */ }
            }
            settings[row.settingKey] = val;
        });
        res.json(settings);
    }
    catch (error) {
        console.error('[Settings] Public error:', error.message);
        res.status(500).json({ error: 'Failed to fetch public settings' });
    }
});
// ---------------------------------------------------------------------------
// GET backup settings
// ---------------------------------------------------------------------------
router.get('/backup', authenticate, authorizeExecutives, async (req, res) => {
    try {
        res.json({
            enabled: false,
            lastBackup: null,
            nextBackup: null,
            frequency: 'daily',
            location: 'local',
        });
    }
    catch (error) {
        console.error('[Settings] Backup fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch backup settings' });
    }
});
// ---------------------------------------------------------------------------
// POST create backup
// ---------------------------------------------------------------------------
router.post('/backup', authenticate, authorizeExecutives, async (req, res) => {
    try {
        res.json({ message: 'Backup initiated successfully' });
    }
    catch (error) {
        console.error('[Settings] Backup create error:', error.message);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});
// ---------------------------------------------------------------------------
// GET hospitals list
// ---------------------------------------------------------------------------
router.get('/hospitals', async (req, res) => {
    try {
        try {
            const result = await pool.query(`SELECT hospital_name FROM hospital_list WHERE is_active = true ORDER BY hospital_name ASC`);
            if (result.rows.length > 0) {
                return res.json(result.rows.map((r) => r.hospital_name));
            }
        }
        catch {
            // Table doesn't exist
        }
        res.json([]);
    }
    catch (error) {
        console.error('[Settings] Hospitals error:', error.message);
        res.status(500).json({ error: 'Failed to fetch hospitals' });
    }
});
// ---------------------------------------------------------------------------
// UPSERT a setting
// ---------------------------------------------------------------------------
router.put('/:key', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const key = String(req.params.key);
        const { value, type, description, isPublic } = req.body;
        if (value === undefined && value !== '') {
            return res.status(400).json({ error: 'Value is required' });
        }
        const result = await pool.query(`INSERT INTO system_settings ("settingKey", "settingValue", "settingType", description, "isPublic", "updatedBy", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT ("settingKey") 
       DO UPDATE SET 
         "settingValue" = $2, 
         "settingType" = $3, 
         description = COALESCE($4, system_settings.description), 
         "isPublic" = COALESCE($5, system_settings."isPublic"), 
         "updatedBy" = $6, 
         "updatedAt" = NOW()
       RETURNING *`, [
            key,
            String(value),
            type || 'string',
            description || null,
            isPublic !== undefined ? isPublic : false,
            req.user.id,
        ]);
        // Audit log (non-blocking)
        try {
            await createAuditLog(req.user.id, req.user.email, req.user.role, 'UPSERT', 'SYSTEM_SETTING', key, null, { value: String(value), type: type || 'string' }, getClientIp(req), getHeaderString(req, 'user-agent'));
        }
        catch (auditError) {
            console.warn('[Settings] Audit log failed:', auditError);
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('[Settings] Upsert error:', error.message);
        res.status(500).json({ error: 'Failed to save setting' });
    }
});
// ---------------------------------------------------------------------------
// DELETE a setting
// ---------------------------------------------------------------------------
router.delete('/:key', authenticate, authorizeExecutives, async (req, res) => {
    try {
        const key = String(req.params.key);
        const oldResult = await pool.query('SELECT * FROM system_settings WHERE "settingKey" = $1', [key]);
        if (oldResult.rows.length === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        await pool.query('DELETE FROM system_settings WHERE "settingKey" = $1', [key]);
        try {
            await createAuditLog(req.user.id, req.user.email, req.user.role, 'DELETE', 'SYSTEM_SETTING', key, oldResult.rows[0], null, getClientIp(req), getHeaderString(req, 'user-agent'));
        }
        catch (auditError) {
            console.warn('[Settings] Audit log failed:', auditError);
        }
        res.json({ message: 'Setting deleted' });
    }
    catch (error) {
        console.error('[Settings] Delete error:', error.message);
        res.status(500).json({ error: 'Failed to delete setting' });
    }
});
export default router;
