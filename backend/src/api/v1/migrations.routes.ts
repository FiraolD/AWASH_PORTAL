import { Router, Response } from 'express';
iimport { AuthRequest, authenticate, authorizeExecutives } from '../../middleware/auth.middleware';
import pool from '../../lib/db';

const router = Router();

// ---------------------------------------------------------------------------
// Get all migrations
// ---------------------------------------------------------------------------
router.get('/', authenticate, authorizeExecutives, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          id,
          "migrationName",
          "executedAt"
       FROM migrations
       ORDER BY "executedAt" DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[Migrations] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch migrations' });
  }
});

// ---------------------------------------------------------------------------
// Get latest migration
// ---------------------------------------------------------------------------
router.get('/latest', authenticate, authorizeExecutives, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          id,
          "migrationName",
          "executedAt"
       FROM migrations
       ORDER BY "executedAt" DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({ message: 'No migrations found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Migrations] Fetch latest error:', error);
    res.status(500).json({ error: 'Failed to fetch latest migration' });
  }
});

// ---------------------------------------------------------------------------
// Record a migration (internal use)
// ---------------------------------------------------------------------------
export async function recordMigration(migrationName: string) {
  try {
    await pool.query(
      `INSERT INTO migrations ("migrationName", "executedAt")
       VALUES ($1, NOW())
       ON CONFLICT ("migrationName") DO NOTHING`,
      [migrationName]
    );
    console.log(`[Migrations] Recorded: ${migrationName}`);
  } catch (error) {
    console.error(`[Migrations] Failed to record ${migrationName}:`, error);
  }
}

// ---------------------------------------------------------------------------
// Check if migration exists
// ---------------------------------------------------------------------------
export async function hasMigration(migrationName: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT id FROM migrations WHERE "migrationName" = $1`,
      [migrationName]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error(`[Migrations] Check error for ${migrationName}:`, error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Get migration status (admin)
// ---------------------------------------------------------------------------
router.get('/status', authenticate, authorizeExecutives, async (req, res) => {
  try {
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM migrations');
    const latestResult = await pool.query(
      'SELECT "migrationName", "executedAt" FROM migrations ORDER BY "executedAt" DESC LIMIT 1'
    );

    res.json({
      total: parseInt(totalResult.rows[0].total),
      latest: latestResult.rows[0] || null,
    });
  } catch (error) {
    console.error('[Migrations] Status error:', error);
    res.status(500).json({ error: 'Failed to fetch migration status' });
  }
});

export default router;