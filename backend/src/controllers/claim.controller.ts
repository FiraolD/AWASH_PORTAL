// backend/src/controllers/claim.controller.ts
import { Response } from 'express';
import pool from '../lib/db.js';
import { AuthRequest } from '../api/middleware/auth.middleware.js';
import { generateClaimNumber } from '../lib/numbering.js';
import { EmailService } from '../services/email.service.js';
import { findMatchingRule, assignClaimToOfficer } from '../services/claimAssignment.service.js';

export const ClaimController = {
  // Get user's claims (for customers)
  getMyClaims: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const result = await pool.query(
        `SELECT c.id, c."claimNumber", c.status, c."incidentDate", c."incidentDescription",
                c."estimatedAmount", c."submittedDate", p."policyNumber"
         FROM claims c
         JOIN policies p ON p.id = c."policyId"
         WHERE c."userId" = $1
         ORDER BY c."submittedDate" DESC`,
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Failed to fetch claims:', error);
      res.status(500).json({ error: 'Failed to fetch claims' });
    }
  },

  // Get claim queue for admins/managers
  getClaimQueue: async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT c.id, c."claimNumber", c.status, c."submittedDate", c."estimatedAmount",
                p."policyNumber", u."firstName" || ' ' || u."lastName" as customerName
         FROM claims c
         JOIN policies p ON p.id = c."policyId"
         JOIN users u ON u.id = c."userId"
         WHERE c.status IN ('SUBMITTED', 'UNDER_REVIEW')
         ORDER BY c."submittedDate" ASC`
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Failed to fetch claim queue:', error);
      res.status(500).json({ error: 'Failed to fetch claim queue' });
    }
  },

  // Get claims assigned to the current officer
  getMyAssignedClaims: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const result = await pool.query(
        `SELECT c.id, c."claimNumber", c.status, c."incidentDate", c."estimatedAmount",
                c."submittedDate", c."incidentDescription", c."natureOfLoss",
                u."firstName", u."lastName", u.email, u.phone,
                p."policyNumber", p.type as "policyType"
         FROM claims c
         LEFT JOIN users u ON u.id = c."userId"
         LEFT JOIN policies p ON p.id = c."policyId"
         WHERE c."assignedOfficer" = $1
         ORDER BY c."submittedDate" DESC`,
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Failed to fetch assigned claims:', error);
      res.status(500).json({ error: 'Failed to fetch assigned claims' });
    }
  },

  // Get claims pending review (for officers – all unassigned or in review)
  getPendingReview: async (req: AuthRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT c.id, c."claimNumber", c.status, c."incidentDate", c."estimatedAmount",
                c."submittedDate", c."incidentDescription", c."natureOfLoss",
                u."firstName", u."lastName", u.email, u.phone,
                p."policyNumber", p.type as "policyType"
         FROM claims c
         LEFT JOIN users u ON u.id = c."userId"
         LEFT JOIN policies p ON p.id = c."policyId"
         WHERE c.status IN ('SUBMITTED', 'UNDER_REVIEW')
         ORDER BY c."submittedDate" ASC`
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Failed to fetch pending claims:', error);
      res.status(500).json({ error: 'Failed to fetch pending claims' });
    }
  },

  // Create new claim (with auto‑assignment)
  createClaim: async (req: AuthRequest, res: Response) => {
    try {
      const {
        policyId,
        incidentDate,
        incidentDescription,
        location,
        estimatedAmount,
        natureOfLoss,
        riskItem,
        timeOfAccident,
        witnessName,
        witnessPhone,
        witnessStatement,
        driverFullName,
        driverAge,
        driverOccupation,
        driverLicenseNumber,
        driverLicenseIssueDate,
        driverLicenseExpiryDate,
        vehicleDamageDetails,
        injuredPersons,
        roadConditions,
        weatherConditions,
        responsibleParty
      } = req.body;

      const userId = req.user!.id;

      // Validate required fields
      if (!policyId || !incidentDate || !incidentDescription || !natureOfLoss) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Verify policy belongs to the user
      const policyCheck = await pool.query(
        `SELECT id, type, "coverageAmount", "policyNumber"
         FROM policies
         WHERE id = $1 AND "userId" = $2`,
        [policyId, userId]
      );
      if (policyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Policy not found or does not belong to you' });
      }
      const policy = policyCheck.rows[0];

      // Log policy data for debugging
      console.log('[createClaim] Policy data:', {
        id: policy.id,
        type: policy.type,
        coverageAmount: policy.coverageAmount,
        typeofCoverage: typeof policy.coverageAmount
      });

      // Generate claim number
      const claimNumber = await generateClaimNumber(policy.type || 'GEN');

      // Insert claim
      const insertResult = await pool.query(
        `INSERT INTO claims (
          id, "claimNumber", "policyId", "userId", status,
          "incidentDate", "incidentDescription", location, "estimatedAmount",
          "natureOfLoss", "riskItem", "timeOfAccident",
          "witnessName", "witnessPhone", "witnessStatement",
          "driverFullName", "driverAge", "driverOccupation",
          "driverLicenseNumber", "driverLicenseIssueDate", "driverLicenseExpiryDate",
          "vehicleDamageDetails", "injuredPersons",
          "roadConditions", "weatherConditions", "responsibleParty",
          "submittedDate", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, 'SUBMITTED',
          $4::date, $5, $6, $7,
          $8, $9, $10,
          $11, $12, $13,
          $14, $15, $16,
          $17, $18, $19,
          $20, $21,
          $22, $23, $24,
          NOW(), NOW(), NOW()
        ) RETURNING id, "claimNumber"`,
        [
          claimNumber,
          policyId,
          userId,
          incidentDate,
          incidentDescription,
          location || null,
          estimatedAmount || null,
          natureOfLoss,
          riskItem || null,
          timeOfAccident || null,
          witnessName || null,
          witnessPhone || null,
          witnessStatement || null,
          driverFullName || null,
          driverAge ? parseInt(driverAge) : null,
          driverOccupation || null,
          driverLicenseNumber || null,
          driverLicenseIssueDate || null,
          driverLicenseExpiryDate || null,
          vehicleDamageDetails || null,
          injuredPersons ? JSON.stringify(injuredPersons) : null,
          roadConditions || null,
          weatherConditions || null,
          responsibleParty || null
        ]
      );

      const claim = insertResult.rows[0];

      // ---- AUTO‑ASSIGNMENT ----
      console.log('[createClaim] Starting auto‑assignment for claim:', claim.id);
      try {
        const rule = await findMatchingRule(policy.type, policy.coverageAmount);
        console.log('[createClaim] Rule from findMatchingRule:', rule);

        if (rule) {
          const officerId = await assignClaimToOfficer(claim.id, rule.assigned_role);
          console.log('[createClaim] OfficerId from assignClaimToOfficer:', officerId);
          if (officerId) {
            console.log(`✅ Claim ${claim.claimNumber} assigned to officer ${officerId}`);
          } else {
            console.warn(`⚠️ No active officer found for role ${rule.assigned_role} for claim ${claim.claimNumber}`);
          }
        } else {
          console.log(`❌ No assignment rule matched for claim ${claim.claimNumber} (policy type: ${policy.type}, amount: ${policy.coverageAmount})`);
        }
      } catch (assignmentError) {
        console.error('❌ Auto‑assignment failed for claim:', claim.id, assignmentError);
      }

      // Send email notification
      try {
        const userResult = await pool.query(
          `SELECT "firstName", "lastName", email FROM users WHERE id = $1`,
          [userId]
        );
        if (userResult.rows.length > 0) {
          const customer = userResult.rows[0];
          await EmailService.sendClaimSubmittedEmail(
            customer.email,
            `${customer.firstName} ${customer.lastName}`,
            claim.claimNumber
          );
        }
      } catch (emailError) {
        console.error('Failed to send claim email:', emailError);
      }

      res.status(201).json({
        message: 'Claim submitted successfully',
        claimNumber: claim.claimNumber,
        claimId: claim.id
      });

    } catch (error) {
      console.error('Failed to create claim:', error);
      res.status(500).json({ error: 'Failed to create claim', details: (error as any).message });
    }
  },

  // Update claim status (for officers/admins)
  updateClaimStatus: async (req: AuthRequest, res: Response) => {
    try {
      const id = String(req.params.id);
      const { status, notes } = req.body;
      const userId = req.user!.id;

      const claimResult = await pool.query(
        `SELECT "userId", "claimNumber" FROM claims WHERE id = $1`,
        [id]
      );
      if (claimResult.rows.length === 0) {
        return res.status(404).json({ error: 'Claim not found' });
      }

      await pool.query(
        `UPDATE claims SET status = $1, "updatedAt" = NOW() WHERE id = $2`,
        [status, id]
      );

      // Add timeline entry
      if (notes) {
        await pool.query(
          `INSERT INTO claim_timeline (id, "claimId", date, status, note, "createdAt")
           VALUES (gen_random_uuid(), $1, NOW(), $2, $3, NOW())`,
          [id, status, notes]
        );
      }

      // Notify customer
      const userResult = await pool.query(
        `SELECT "firstName", "lastName", email FROM users WHERE id = $1`,
        [claimResult.rows[0].userId]
      );
      if (userResult.rows.length > 0) {
        const customer = userResult.rows[0];
        await EmailService.sendStatusUpdateEmail(
          customer.email,
          `${customer.firstName} ${customer.lastName}`,
          'Claim',
          claimResult.rows[0].claimNumber,
          status
        );
      }

      res.json({ message: `Claim ${status.toLowerCase()} successfully` });
    } catch (error) {
      console.error('Failed to update claim status:', error);
      res.status(500).json({ error: 'Failed to update claim status' });
    }
  },

  // Get claim details by ID
  getClaimDetails: async (req: AuthRequest, res: Response) => {
    try {
      const id = String(req.params.id);
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const claimResult = await pool.query(
        `SELECT c.*, p."policyNumber", u."firstName", u."lastName", u.email, u.phone
         FROM claims c
         JOIN policies p ON p.id = c."policyId"
         JOIN users u ON u.id = c."userId"
         WHERE c.id = $1`,
        [id]
      );
      if (claimResult.rows.length === 0) {
        return res.status(404).json({ error: 'Claim not found' });
      }

      const claim = claimResult.rows[0];

      // Check access: customer can see only their own; others (admins/officers) can see all
      const isCustomer = userRole === 'CUSTOMER';
      if (isCustomer && claim.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const timeline = await pool.query(
        `SELECT * FROM claim_timeline WHERE "claimId" = $1 ORDER BY date ASC`,
        [id]
      );

      res.json({ ...claim, timeline: timeline.rows });
    } catch (error) {
      console.error('Failed to fetch claim details:', error);
      res.status(500).json({ error: 'Failed to fetch claim details' });
    }
  }
};