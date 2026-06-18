import { Response } from 'express';
import pool from '../lib/db.js';
import { AuthRequest } from '../api/middleware/auth.middleware.js';
import { generateClaimNumber } from '../lib/numbering.js';
import { EmailService } from '../services/email.service.js';

export const ClaimController = {
  // Get user's claims
  getMyClaims: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const result = await pool.query(`
        SELECT c.id, c."claimNumber", c.status, c."incidentDate", c."incidentDescription",
               c."estimatedAmount", c."submittedDate", p."policyNumber"
        FROM claims c JOIN policies p ON p.id = c."policyId"
        WHERE c."userId" = $1 ORDER BY c."submittedDate" DESC
      `, [userId]);
      res.json(result.rows);
    } catch (error) {
      console.error('Failed to fetch claims:', error);
      res.status(500).json({ error: 'Failed to fetch claims' });
    }
  },

  // Get claim queue for admin
  getClaimQueue: async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT c.id, c."claimNumber", c.status, c."submittedDate", c."estimatedAmount",
               p."policyNumber", u."firstName" || ' ' || u."lastName" as customerName
        FROM claims c
        JOIN policies p ON p.id = c."policyId"
        JOIN users u ON u.id = c."userId"
        WHERE c.status IN ('SUBMITTED', 'UNDER_REVIEW')
        ORDER BY c."submittedDate" ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Failed to fetch claim queue:', error);
      res.status(500).json({ error: 'Failed to fetch claim queue' });
    }
  },

  // Create new claim
  createClaim: async (req: AuthRequest, res: Response) => {
    try {
      const { policyId, incidentDate, incidentDescription, location, estimatedAmount, natureOfLoss } = req.body;
      const userId = req.user!.id;

      const policyCheck = await pool.query('SELECT id, "policyNumber" FROM policies WHERE id = $1 AND "userId" = $2', [policyId, userId]);
      if (policyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      const claimNumber = await generateClaimNumber('GEN');

      const result = await pool.query(`
        INSERT INTO claims (id, "claimNumber", "policyId", "userId", status, "incidentDate",
          "incidentDescription", location, "estimatedAmount", "submittedDate", nature_of_loss, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, 'SUBMITTED', $4::date, $5, $6, $7::decimal, NOW(), $8, NOW(), NOW())
        RETURNING id, "claimNumber"
      `, [claimNumber, policyId, userId, incidentDate, incidentDescription, location, estimatedAmount || 0, natureOfLoss || 'Not specified']);

      const userResult = await pool.query('SELECT "firstName", "lastName", email FROM users WHERE id = $1', [userId]);
      await EmailService.sendClaimSubmittedEmail(userResult.rows[0].email, `${userResult.rows[0].firstName} ${userResult.rows[0].lastName}`, claimNumber);

      res.status(201).json({ message: 'Claim submitted successfully', claimNumber, claimId: result.rows[0].id });
    } catch (error) {
      console.error('Failed to create claim:', error);
      res.status(500).json({ error: 'Failed to create claim' });
    }
  },

  // Update claim status
  updateClaimStatus: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const claimResult = await pool.query('SELECT "userId", "claimNumber" FROM claims WHERE id = $1', [id]);
      if (claimResult.rows.length === 0) return res.status(404).json({ error: 'Claim not found' });

      await pool.query('UPDATE claims SET status = $1, "updatedAt" = NOW() WHERE id = $2', [status, id]);
      await pool.query(`INSERT INTO claim_timeline (id, "claimId", date, status, note, "createdAt")
        VALUES (gen_random_uuid()::text, $1, NOW(), $2, $3, NOW())`, [id, status, notes || null]);

      const userResult = await pool.query('SELECT "firstName", "lastName", email FROM users WHERE id = $1', [claimResult.rows[0].userId]);
      await EmailService.sendStatusUpdateEmail(userResult.rows[0].email, `${userResult.rows[0].firstName} ${userResult.rows[0].lastName}`, 'Claim', claimResult.rows[0].claimNumber, status);

      res.json({ message: `Claim ${status.toLowerCase()} successfully` });
    } catch (error) {
      console.error('Failed to update claim status:', error);
      res.status(500).json({ error: 'Failed to update claim status' });
    }
  },

  // Get claim details
  getClaimDetails: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const claim = await pool.query(`
        SELECT c.*, p."policyNumber", u."firstName" || ' ' || u."lastName" as customerName, u.email as customerEmail
        FROM claims c
        JOIN policies p ON p.id = c."policyId"
        JOIN users u ON u.id = c."userId"
        WHERE c.id = $1
      `, [id]);

      if (claim.rows.length === 0) return res.status(404).json({ error: 'Claim not found' });

      const timeline = await pool.query('SELECT * FROM claim_timeline WHERE "claimId" = $1 ORDER BY date ASC', [id]);

      res.json({ ...claim.rows[0], timeline: timeline.rows });
    } catch (error) {
      console.error('Failed to fetch claim details:', error);
      res.status(500).json({ error: 'Failed to fetch claim details' });
    }
  },
};