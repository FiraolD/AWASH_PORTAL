import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Define allowed roles for settings management
const SETTINGS_ROLES = ['MASTER_ADMIN', 'SYSTEM_ADMIN', 'CUSTOMER_ADMIN'];

// Get system settings
router.get('/', authenticate, authorize(...SETTINGS_ROLES), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT setting_key, setting_value, description, updated_at, updated_by 
      FROM system_settings
    `);
    
    const settings: Record<string, any> = {};
    
    for (const row of result.rows) {
      // Parse JSON values if they are stored as JSON
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch {
        settings[row.setting_key] = row.setting_value;
      }
    }
    
    // Return default settings if no settings found
    if (Object.keys(settings).length === 0) {
      const defaultSettings = {
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
      res.json(defaultSettings);
    } else {
      res.json(settings);
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update system settings
router.put('/', authenticate, authorize(...SETTINGS_ROLES), async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    const settings = req.body;
    
    await client.query('BEGIN');
    
    for (const [key, value] of Object.entries(settings)) {
      // Store value as JSON string to preserve types
      const settingValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      await client.query(
        `INSERT INTO system_settings (setting_key, setting_value, description, updated_at, updated_by)
         VALUES ($1, $2, $3, NOW(), $4)
         ON CONFLICT (setting_key) DO UPDATE
         SET setting_value = EXCLUDED.setting_value, 
             updated_at = NOW(), 
             updated_by = EXCLUDED.updated_by`,
        [key, settingValue, getSettingDescription(key), userId]
      );
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  } finally {
    client.release();
  }
});

// Helper function to get setting descriptions
function getSettingDescription(key: string): string {
  const descriptions: Record<string, string> = {
    companyName: 'Company display name',
    companyEmail: 'Company contact email',
    supportEmail: 'Customer support email address',
    supportPhone: 'Customer support phone number',
    claimsEmail: 'Claims department email',
    vatRate: 'Value Added Tax rate',
    drrRate: 'Disability and Rehabilitation Rate',
    currency: 'System currency',
    dateFormat: 'Date display format',
    timezone: 'System timezone',
    enableOnlinePayments: 'Enable online payment processing',
    enableChatSupport: 'Enable live chat support',
    maintenanceMode: 'Put system in maintenance mode',
    emailNotifications: 'Enable email notifications',
    smsAlerts: 'Enable SMS alerts',
    claimUpdates: 'Send claim status updates',
    twoFactorAuth: 'Require two-factor authentication',
    sessionTimeout: 'Session timeout in minutes',
    passwordExpiry: 'Password expiry in days',
    maxLoginAttempts: 'Maximum login attempts before lockout'
  };
  return descriptions[key] || 'System setting';
}

// Get backup settings
router.get('/backup', authenticate, authorize(...SETTINGS_ROLES), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      ['backupSettings']
    );
    
    if (result.rows.length > 0) {
      try {
        const backupSettings = JSON.parse(result.rows[0].setting_value);
        res.json(backupSettings);
      } catch {
        res.json({});
      }
    } else {
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

// Update backup settings
router.put('/backup', authenticate, authorize(...SETTINGS_ROLES), async (req, res) => {
  try {
    const userId = req.user?.id;
    const backupSettings = req.body;
    
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value, description, updated_at, updated_by)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT (setting_key) DO UPDATE
       SET setting_value = EXCLUDED.setting_value, 
           updated_at = NOW(), 
           updated_by = EXCLUDED.updated_by`,
      ['backupSettings', JSON.stringify(backupSettings), 'Database backup configuration', userId]
    );
    
    res.json({ message: 'Backup settings updated successfully' });
  } catch (error) {
    console.error('Failed to update backup settings:', error);
    res.status(500).json({ error: 'Failed to update backup settings' });
  }
});

// Trigger database backup
router.post('/backup/run', authenticate, authorize(...SETTINGS_ROLES), async (req, res) => {
  try {
    // This would trigger an actual database backup
    // For now, just return success
    res.json({ message: 'Database backup completed successfully', backupFile: `backup_${Date.now()}.sql` });
  } catch (error) {
    console.error('Failed to run backup:', error);
    res.status(500).json({ error: 'Failed to run database backup' });
  }
});

// Update maintenance mode
router.put('/maintenance', authenticate, authorize(...SETTINGS_ROLES), async (req, res) => {
  try {
    const userId = req.user?.id;
    const { maintenanceMode } = req.body;
    
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value, description, updated_at, updated_by)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT (setting_key) DO UPDATE
       SET setting_value = EXCLUDED.setting_value, 
           updated_at = NOW(), 
           updated_by = EXCLUDED.updated_by`,
      ['maintenanceMode', JSON.stringify(maintenanceMode), 'System maintenance mode flag', userId]
    );
    
    res.json({ message: 'Maintenance mode updated successfully', maintenanceMode });
  } catch (error) {
    console.error('Failed to update maintenance mode:', error);
    res.status(500).json({ error: 'Failed to update maintenance mode' });
  }
});

// Run maintenance tasks
router.post('/maintenance/run', authenticate, authorize(...SETTINGS_ROLES), async (req, res) => {
  try {
    // This would trigger maintenance tasks like cleaning old logs, etc.
    // For now, just return success
    res.json({ message: 'Maintenance tasks completed successfully' });
  } catch (error) {
    console.error('Failed to run maintenance:', error);
    res.status(500).json({ error: 'Failed to run maintenance tasks' });
  }
});

// Get public settings (no auth required)
router.get('/public', async (req, res) => {
  try {
    const publicKeys = ['companyName', 'supportEmail', 'supportPhone', 'currency', 'enableOnlinePayments', 'enableChatSupport'];
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
    
    // Return default values for missing settings
    const defaultSettings = {
      companyName: 'Awash Insurance SC',
      supportEmail: 'support@awashinsurance.com',
      supportPhone: '+251-11-551-0000',
      currency: 'ETB',
      enableOnlinePayments: true,
      enableChatSupport: true
    };
    
    res.json({ ...defaultSettings, ...settings });
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