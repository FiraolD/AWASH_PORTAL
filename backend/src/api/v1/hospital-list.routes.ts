import { Router, Response } from 'express';
import { authenticate, authorizeExecutives } from '../../middleware/auth.middleware';
import { AuthRequest } from '../..';
import pool from '../../lib/db';

const router = Router();

// ---------------------------------------------------------------------------
// Get all active hospitals (public - no auth required for claim form)
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          id,
          "hospitalName",
          "isActive",
          "createdAt",
          "updatedAt"
       FROM hospital_list 
       WHERE "isActive" = true 
       ORDER BY "hospitalName" ASC`
    );

    // Return just the names for the dropdown
    res.json(result.rows.map((row: any) => row.hospitalName));
  } catch (error) {
    console.error('[HospitalList] Fetch error:', error);
    // Fallback list
    res.json([
      'Tikur Anbessa Specialized Hospital',
      "St. Paul's Hospital Millennium Medical College",
      'Yekatit 12 Hospital Medical College',
      'Zewditu Memorial Hospital',
      'Alert Hospital',
      'Menelik II Referral Hospital',
      'Gandhi Memorial Hospital',
      'Betezata General Hospital',
      'Hayat Hospital',
      'Korean Hospital',
    ]);
  }
});

// ---------------------------------------------------------------------------
// Get all hospitals (including inactive - admin only)
// ---------------------------------------------------------------------------
router.get('/all', authenticate, authorizeExecutives, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          id,
          "hospitalName",
          "isActive",
          "createdAt",
          "updatedAt"
       FROM hospital_list 
       ORDER BY "hospitalName" ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[HospitalList] Fetch all error:', error);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});

// ---------------------------------------------------------------------------
// Get single hospital
// ---------------------------------------------------------------------------
router.get('/:id', authenticate, authorizeExecutives, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM hospital_list WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[HospitalList] Fetch single error:', error);
    res.status(500).json({ error: 'Failed to fetch hospital' });
  }
});

// ---------------------------------------------------------------------------
// Add new hospital (admin only)
// ---------------------------------------------------------------------------
router.post('/', authenticate, authorizeExecutives, async (req, res) => {
  try {
    const { hospitalName } = req.body;
    const userId = req.user!.id;

    if (!hospitalName || hospitalName.trim().length === 0) {
      return res.status(400).json({ error: 'Hospital name is required' });
    }

    // Check for duplicate
    const existingResult = await pool.query(
      'SELECT id FROM hospital_list WHERE "hospitalName" = $1',
      [hospitalName.trim()]
    );

    if (existingResult.rows.length > 0) {
      // Reactivate if inactive
      await pool.query(
        `UPDATE hospital_list SET "isActive" = true, "updatedAt" = NOW() WHERE "hospitalName" = $1`,
        [hospitalName.trim()]
      );
      return res.json({ message: 'Hospital already exists – reactivated' });
    }

    const result = await pool.query(
      `INSERT INTO hospital_list ("hospitalName", "isActive", "createdAt", "updatedAt")
       VALUES ($1, true, NOW(), NOW())
       RETURNING *`,
      [hospitalName.trim()]
    );

    // Log audit
    const { createAuditLog } = await import('./auditLogs.routes');
    createAuditLog(
      userId,
      req.user!.email,
      req.user!.role,
      'CREATE',
      'HOSPITAL',
      result.rows[0].id,
      null,
      result.rows[0],
      req.ip || '0.0.0.0',
      req.headers['user-agent'] || 'system'
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[HospitalList] Create error:', error);
    res.status(500).json({ error: 'Failed to add hospital' });
  }
});

// ---------------------------------------------------------------------------
// Update hospital name (admin only)
// ---------------------------------------------------------------------------
router.put('/:id', authenticate, authorizeExecutives, async (req, res) => {
  try {
    const { id } = req.params;
    const { hospitalName } = req.body;
    const userId = req.user!.id;

    if (!hospitalName || hospitalName.trim().length === 0) {
      return res.status(400).json({ error: 'Hospital name is required' });
    }

    // Check exists
    const oldResult = await pool.query('SELECT * FROM hospital_list WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    await pool.query(
      `UPDATE hospital_list SET "hospitalName" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [hospitalName.trim(), id]
    );

    // Fetch updated
    const updated = await pool.query('SELECT * FROM hospital_list WHERE id = $1', [id]);

    // Log audit
    const { createAuditLog } = await import('./auditLogs.routes');
    createAuditLog(
      userId,
      req.user!.email,
      req.user!.role,
      'UPDATE',
      'HOSPITAL',
      id,
      oldResult.rows[0],
      updated.rows[0],
      req.ip || '0.0.0.0',
      req.headers['user-agent'] || 'system'
    );

    res.json(updated.rows[0]);
  } catch (error) {
    console.error('[HospitalList] Update error:', error);
    res.status(500).json({ error: 'Failed to update hospital' });
  }
});

// ---------------------------------------------------------------------------
// Delete hospital (soft delete - deactivate)
// ---------------------------------------------------------------------------
router.delete('/:id', authenticate, authorizeExecutives, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const oldResult = await pool.query('SELECT * FROM hospital_list WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    // Soft delete – just deactivate
    await pool.query(
      `UPDATE hospital_list SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1`,
      [id]
    );

    // Log audit
    const { createAuditLog } = await import('./auditLogs.routes');
    createAuditLog(
      userId,
      req.user!.email,
      req.user!.role,
      'DEACTIVATE',
      'HOSPITAL',
      id,
      oldResult.rows[0],
      { isActive: false },
      req.ip || '0.0.0.0',
      req.headers['user-agent'] || 'system'
    );

    res.json({ message: 'Hospital deactivated' });
  } catch (error) {
    console.error('[HospitalList] Delete error:', error);
    res.status(500).json({ error: 'Failed to deactivate hospital' });
  }
});

// ---------------------------------------------------------------------------
// Bulk import hospitals
// ---------------------------------------------------------------------------
router.post('/bulk', authenticate, authorizeExecutives, async (req, res) => {
  const client = await pool.connect();
  try {
    const { hospitals } = req.body; // Array of hospital names
    const userId = req.user!.id;

    if (!Array.isArray(hospitals) || hospitals.length === 0) {
      return res.status(400).json({ error: 'Hospitals array is required' });
    }

    await client.query('BEGIN');

    let added = 0;
    let skipped = 0;

    for (const name of hospitals) {
      const trimmed = name.trim();
      if (!trimmed) continue;

      const existingResult = await client.query(
        'SELECT id FROM hospital_list WHERE "hospitalName" = $1',
        [trimmed]
      );

      if (existingResult.rows.length > 0) {
        skipped++;
        continue;
      }

      await client.query(
        `INSERT INTO hospital_list ("hospitalName", "isActive", "createdAt", "updatedAt")
         VALUES ($1, true, NOW(), NOW())`,
        [trimmed]
      );
      added++;
    }

    await client.query('COMMIT');

    // Log audit
    const { createAuditLog } = await import('./auditLogs.routes');
    createAuditLog(
      userId,
      req.user!.email,
      req.user!.role,
      'BULK_IMPORT',
      'HOSPITAL',
      'bulk',
      null,
      { added, skipped, total: hospitals.length },
      req.ip || '0.0.0.0',
      req.headers['user-agent'] || 'system'
    );

    res.json({ message: `${added} hospitals added, ${skipped} skipped` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[HospitalList] Bulk import error:', error);
    res.status(500).json({ error: 'Failed to import hospitals' });
  } finally {
    client.release();
  }
});

export default router;