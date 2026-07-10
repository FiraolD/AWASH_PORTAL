import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
});

const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

async function runMigrations() {
  console.log('=========================================');
  console.log('🚀 Starting Database Migrations');
  console.log('=========================================');

  try {
    await query('SELECT NOW()');
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }

  // Create migrations table if it doesn't exist
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  const executedResult = await query('SELECT name FROM migrations');
  const executed = new Set(executedResult.rows.map(row => row.name));

  // List of migrations – we'll run them in order
  const migrations = [
    {
      name: '001_fix_settings_table.sql',
      sql: `
        -- Drop the existing system_settings table to fix column names
        DROP TABLE IF EXISTS system_settings CASCADE;
        
        -- Create system_settings table with snake_case columns (matches backend)
        CREATE TABLE system_settings (
          setting_key TEXT PRIMARY KEY,
          setting_value JSONB NOT NULL,
          description TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_by UUID
        );

        -- Insert default settings
        INSERT INTO system_settings (setting_key, setting_value, description) VALUES
          ('companyName', '"Awash Insurance SC"', 'Company display name'),
          ('companyEmail', '"info@awashinsurance.com"', 'Company contact email'),
          ('supportEmail', '"support@awashinsurance.com"', 'Customer support email address'),
          ('supportPhone', '"+251-11-551-0000"', 'Customer support phone number'),
          ('claimsEmail', '"claims@awashinsurance.com"', 'Claims department email'),
          ('vatRate', '0.15', 'Value Added Tax rate'),
          ('drrRate', '0.01', 'Disability and Rehabilitation Rate'),
          ('currency', '"ETB"', 'System currency'),
          ('dateFormat', '"DD/MM/YYYY"', 'Date display format'),
          ('timezone', '"Africa/Addis_Ababa"', 'System timezone'),
          ('enableOnlinePayments', 'true', 'Enable online payment processing'),
          ('enableChatSupport', 'true', 'Enable live chat support'),
          ('maintenanceMode', 'false', 'Put system in maintenance mode'),
          ('emailNotifications', 'true', 'Enable email notifications'),
          ('smsAlerts', 'false', 'Enable SMS alerts'),
          ('claimUpdates', 'true', 'Send claim status updates'),
          ('twoFactorAuth', 'false', 'Require two-factor authentication'),
          ('sessionTimeout', '30', 'Session timeout in minutes'),
          ('passwordExpiry', '90', 'Password expiry in days'),
          ('maxLoginAttempts', '5', 'Maximum login attempts before lockout')
        ON CONFLICT (setting_key) DO NOTHING;
      `
    },
    {
      name: '002_audit_logs_fix.sql',
      sql: `
        -- Drop existing audit_logs if it has wrong columns
        DROP TABLE IF EXISTS audit_logs CASCADE;
        
        CREATE TABLE audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          action TEXT NOT NULL,
          entity_type TEXT,
          entity_id TEXT,
          old_values JSONB,
          new_values JSONB,
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      `
    }
    // Add other migrations if needed, but these two are the most critical
  ];

  let executedCount = 0;

  for (const migration of migrations) {
    // Skip if already executed
    if (executed.has(migration.name)) {
      console.log(`⏭️ Skipping ${migration.name} (already executed)`);
      continue;
    }

    console.log(`🔄 Running migration: ${migration.name}`);
    
    try {
      await query(migration.sql);
      await query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
      console.log(`✅ ${migration.name} completed successfully`);
      executedCount++;
    } catch (error) {
      console.error(`❌ Failed to run ${migration.name}:`, error.message);
      console.error('   SQL Error:', error.message);
      console.log('   ❌ Migration failed. Please fix the error and try again.');
      process.exit(1);
    }
  }

  console.log('=========================================');
  console.log(`✅ Migration completed: ${executedCount} new migrations executed`);
  console.log('=========================================');

  await pool.end();
}

runMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});