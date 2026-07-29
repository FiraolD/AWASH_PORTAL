import pool from '../lib/db.js';
import { generatePolicyNumber } from '../lib/numbering.js';
import { EmailService } from '../services/email.service.js';
import { premiumCalculationService } from '../services/premiumCalculation.service.js';
export const PolicyController = {
    // Get user's policies
    getMyPolicies: async (req, res) => {
        try {
            const userId = req.user.id;
            const result = await pool.query(`
        SELECT id, "policyNumber", type, status, "coverageAmount", 
               premium, "premiumFrequency", "effectiveDate", "expirationDate", "createdAt"
        FROM policies WHERE "userId" = $1 ORDER BY "createdAt" DESC
      `, [userId]);
            res.json(result.rows);
        }
        catch (error) {
            console.error('Failed to fetch policies:', error);
            res.status(500).json({ error: 'Failed to fetch policies' });
        }
    },
    // Get pending policies for underwriting
    getPendingPolicies: async (req, res) => {
        try {
            const result = await pool.query(`
        SELECT p.id, p."policyNumber", p.type, p.status, p."coverageAmount", p.premium,
               p."premiumFrequency", p."effectiveDate", p."expirationDate", p."createdAt",
               u.id as "userId", u."firstName" as customerFirstName, u."lastName" as customerLastName,
               u.email as customerEmail, u.phone as customerPhone
        FROM policies p JOIN users u ON u.id = p."userId"
        WHERE p.status = 'PENDING' ORDER BY p."createdAt" DESC
      `);
            res.json(result.rows);
        }
        catch (error) {
            console.error('Failed to fetch pending policies:', error);
            res.status(500).json({ error: 'Failed to fetch pending policies' });
        }
    },
    // Get policy by ID for review
    getPolicyForReview: async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query(`
        SELECT p.*, u.id as "userId", u."firstName" as customerFirstName, u."lastName" as customerLastName,
               u.email as customerEmail, u.phone as customerPhone,
               u."addressStreet", u."addressCity", u."addressState", u."addressCountry"
        FROM policies p LEFT JOIN users u ON u.id = p."userId"
        WHERE p.id = $1 LIMIT 1
      `, [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Policy not found' });
            }
            res.json(result.rows[0]);
        }
        catch (error) {
            console.error('Failed to fetch policy:', error);
            res.status(500).json({ error: 'Failed to fetch policy' });
        }
    },
    // Create new policy
    createPolicy: async (req, res) => {
        try {
            const { type, coverageAmount, premium, premiumFrequency, effectiveDate, expirationDate, productDetails } = req.body;
            const userId = req.user.id;
            if (!type || !coverageAmount || !premium || !premiumFrequency || !effectiveDate || !expirationDate) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            const policyNumber = await generatePolicyNumber(type);
            const riskScore = Math.min(100, Math.max(0, 50 + (coverageAmount > 1000000 ? 25 : coverageAmount < 250000 ? -20 : 0)));
            const result = await pool.query(`
        INSERT INTO policies (id, "policyNumber", "userId", type, status, "coverageAmount", premium,
          "premiumFrequency", "effectiveDate", "expirationDate", "insuredItems", "riskScore", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, 'PENDING', $4, $5, $6, $7::date, $8::date, $9::jsonb, $10, NOW(), NOW())
        RETURNING id, "policyNumber"
      `, [policyNumber, userId, type, coverageAmount, premium, premiumFrequency, effectiveDate, expirationDate, JSON.stringify(productDetails || {}), riskScore]);
            const userResult = await pool.query('SELECT "firstName", "lastName", email FROM users WHERE id = $1', [userId]);
            await EmailService.sendPolicyCreatedEmail(userResult.rows[0].email, `${userResult.rows[0].firstName} ${userResult.rows[0].lastName}`, policyNumber);
            res.status(201).json({ message: 'Policy application submitted successfully', policyNumber, requiresApproval: true });
        }
        catch (error) {
            console.error('Failed to create policy:', error);
            res.status(500).json({ error: 'Failed to create policy' });
        }
    },
    // Approve policy
    approvePolicy: async (req, res) => {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const policyResult = await pool.query('SELECT "userId", "policyNumber" FROM policies WHERE id = $1', [id]);
            if (policyResult.rows.length === 0)
                return res.status(404).json({ error: 'Policy not found' });
            await pool.query('UPDATE policies SET status = $1, "updatedAt" = NOW() WHERE id = $2', ['ACTIVE', id]);
            const userResult = await pool.query('SELECT "firstName", "lastName", email FROM users WHERE id = $1', [policyResult.rows[0].userId]);
            await EmailService.sendStatusUpdateEmail(userResult.rows[0].email, `${userResult.rows[0].firstName} ${userResult.rows[0].lastName}`, 'Policy', policyResult.rows[0].policyNumber, 'ACTIVE');
            res.json({ message: 'Policy approved successfully' });
        }
        catch (error) {
            console.error('Failed to approve policy:', error);
            res.status(500).json({ error: 'Failed to approve policy' });
        }
    },
    // Reject policy
    rejectPolicy: async (req, res) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const policyResult = await pool.query('SELECT "userId", "policyNumber" FROM policies WHERE id = $1', [id]);
            if (policyResult.rows.length === 0)
                return res.status(404).json({ error: 'Policy not found' });
            await pool.query('UPDATE policies SET status = $1, "updatedAt" = NOW() WHERE id = $2', ['REJECTED', id]);
            res.json({ message: 'Policy rejected successfully' });
        }
        catch (error) {
            console.error('Failed to reject policy:', error);
            res.status(500).json({ error: 'Failed to reject policy' });
        }
    },
    // Calculate premium
    calculatePremium: async (req, res) => {
        try {
            const { productType, coverageAmount, termMonths = 12, riskScore = 50 } = req.body;
            const result = premiumCalculationService.calculatePremium({ productType, coverageAmount, termMonths, riskScore });
            res.json(result);
        }
        catch (error) {
            console.error('Premium calculation failed:', error);
            res.status(500).json({ error: 'Failed to calculate premium' });
        }
    },
};
