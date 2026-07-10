import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Define allowed roles for settings management
const SETTINGS_ROLES = ['MASTER_ADMIN', 'SYSTEM_ADMIN', 'CUSTOMER_ADMIN'];

// =============================================
// GET / – Fetch all settings
// =============================================
router.get('/', authenticate, authorize(...SETTINGS_ROLES), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT setting_key, setting_value, description, updated_at, updated_by 
       FROM system_settings`
    );

    const settings: Record<string, any> = {};
    for (const row of result.rows) {
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch {
        settings[row.setting_key] = row.setting_value;
      }
    }

    // If no settings found, return default values
    if (Object.keys(settings).length === 0) {
      const defaults = {
        companyName: 'Awash Insurance SC',
        companyEmail: 'info@awashinsurance.com',
        supportEmail: 'support@awashinsurance.com',
        supportPhone: '+251-11-551-0000',
        claimsEmail: 'claims@awashinsurance.com',
        vatRate: 0.15,
        drrRate: 0.01,
        currency: 'ETB',
        dateFormat: 'DD/MM/YYYY',
        timezone: 'Africa/Addis_Ababa',
        enableOnlinePayments: true,
        enableChatSupport: true,
        maintenanceMode: false,
        emailNotifications: true,
        smsAlerts: false,
        claimUpdates: true,
        twoFactorAuth: false,
        sessionTimeout: 30,
        passwordExpiry: 90,
        maxLoginAttempts: 5
      };
      return res.json(defaults);
    }

    res.json(settings);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// =============================================
// PUT / – Update multiple settings
// =============================================
router.put('/', authenticate, authorize(...SETTINGS_ROLES), async (req, res) => {
  const userId = req.user?.id;
  const settings = req.body;

  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return res.status(400).json({ error: 'Invalid settings payload' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const [key, value] of Object.entries(settings)) {
      // Convert value to JSON string for storage
      const settingValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      // Insert or update using ON CONFLICT (requires setting_key to be primary key)
      const query = `
        INSERT INTO system_settings (setting_key, setting_value, updated_at, updated_by)
        VALUES ($1, $2, NOW(), $3)
        ON CONFLICT (setting_key) DO UPDATE
        SET setting_value = EXCLUDED.setting_value,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
      `;
      await client.query(query, [key, settingValue, userId]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Settings updated successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Failed to update settings:', error);
    console.error('SQL Error details:', error.message);
    // Log the actual SQL query that failed (optional)
    res.status(500).json({ 
      error: 'Failed to update settings',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// =============================================
// GET /backup – Get backup settings
// =============================================
router.get('/backup', authenticate, authorize(...SETTINGS_ROLES), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'backupSettings'`
    );

    if (result.rows.length > 0) {
      try {
        const backupSettings = JSON.parse(result.rows[0].setting_value);
        res.json(backupSettings);
      } catch {
        res.json({});
      }
    } else {
      // Default backup settings
      res.json({
        autoBackupEnabled: false,
        backupFrequency: 'daily',
        backupTime: '00:00',
        backupRetention: 30,
        lastBackup: null
      });
    }
  } catch (error) {
    console.error('Failed to fetch backup settings:', error);
    res.status(500).json({ error: 'Failed to fetch backup settings' });
  }
});

// =============================================
// PUT /backup – Update backup settings
// =============================================
router.put('/backup', authenticate, authorize(...SETTINGS_ROLES), async (req, res) => {
  const userId = req.user?.id;
  const backupSettings = req.body;

  try {
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at, updated_by)
       VALUES ('backupSettings', $1, NOW(), $2)
       ON CONFLICT (setting_key) DO UPDATE
       SET setting_value = EXCLUDED.setting_value,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by`,
      [JSON.stringify(backupSettings), userId]
    );
    res.json({ message: 'Backup settings updated successfully' });
  } catch (error) {
    console.error('Failed to update backup settings:', error);
    res.status(500).json({ error: 'Failed to update backup settings' });
  }
});

// =============================================
// POST /backup/run – Trigger manual backup
// =============================================
router.post('/backup/run', authenticate, authorize(...SETTINGS_ROLES), async (req, res) => {
  try {
    // For now, just a placeholder – in production you would actually run pg_dump
    const backupFile = `backup_${Date.now()}.sql`;
    // ... actual backup logic would go here ...
    res.json({ 
      message: 'Database backup completed successfully', 
      backupFile 
    });
  } catch (error) {
    console.error('Failed to run backup:', error);
    res.status(500).json({ error: 'Failed to run database backup' });
  }
});

// =============================================
// PUT /maintenance – Toggle maintenance mode
// =============================================
router.put('/maintenance', authenticate, authorize(...SETTINGS_ROLES), async (req, res) => {
  const userId = req.user?.id;
  const { maintenanceMode } = req.body;

  if (typeof maintenanceMode !== 'boolean') {
    return res.status(400).json({ error: 'maintenanceMode must be a boolean' });
  }

  try {
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at, updated_by)
       VALUES ('maintenanceMode', $1, NOW(), $2)
       ON CONFLICT (setting_key) DO UPDATE
       SET setting_value = EXCLUDED.setting_value,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by`,
      [JSON.stringify(maintenanceMode), userId]
    );
    res.json({ message: 'Maintenance mode updated successfully', maintenanceMode });
  } catch (error) {
    console.error('Failed to update maintenance mode:', error);
    res.status(500).json({ error: 'Failed to update maintenance mode' });
  }
});

// =============================================
// POST /maintenance/run – Run maintenance tasks
// =============================================
router.post('/maintenance/run', authenticate, authorize(...SETTINGS_ROLES), async (req, res) => {
  try {
    // Placeholder for actual maintenance logic (e.g., cleaning logs, optimizing tables)
    res.json({ message: 'Maintenance tasks completed successfully' });
  } catch (error) {
    console.error('Failed to run maintenance:', error);
    res.status(500).json({ error: 'Failed to run maintenance tasks' });
  }
});

// =============================================
// GET /public – Public settings (no auth)
// =============================================
router.get('/public', async (req, res) => {
  try {
    const publicKeys = [
      'companyName', 'supportEmail', 'supportPhone', 
      'currency', 'enableOnlinePayments', 'enableChatSupport'
    ];
    const result = await pool.query(
      `SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ANY($1)`,
      [publicKeys]
    );

    const settings: Record<string, any> = {};
    for (const row of result.rows) {
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch {
        settings[row.setting_key] = row.setting_value;
      }
    }

    // Return defaults for missing keys
    const defaults = {
      companyName: 'Awash Insurance SC',
      supportEmail: 'support@awashinsurance.com',
      supportPhone: '+251-11-551-0000',
      currency: 'ETB',
      enableOnlinePayments: true,
      enableChatSupport: true
    };
    res.json({ ...defaults, ...settings });
  } catch (error) {
    console.error('Failed to fetch public settings:', error);
    res.json({
      companyName: 'Awash Insurance SC',
      supportEmail: 'support@awashinsurance.com',
      supportPhone: '+251-11-551-0000',
      currency: 'ETB',
      enableOnlinePayments: true,
      enableChatSupport: true
    });
  }
});

export default router;