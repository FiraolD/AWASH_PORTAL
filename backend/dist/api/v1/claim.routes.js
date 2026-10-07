import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { validateBody } from '../middleware/validation.middleware.js';
// ---------------------------------------------------------------------------
// Zod schema for review request (updated with all decision types)
// ---------------------------------------------------------------------------
const reviewSchema = z.object({
    decision: z.enum(['APPROVE', 'REJECT', 'REVIEWED', 'REQUIRES_MODIFICATION', 'UNDER_REVIEW']),
    approvedAmount: z.number().positive().optional(),
    notes: z.string().max(2000).optional(),
});
const router = Router();
// ---------------------------------------------------------------------------
// Multer configuration
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'claims');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `claim-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------
const CLAIM_ROLES = [
    'CLAIMS_ADMIN', 'CUSTOMER_ADMIN', 'MASTER_ADMIN',
    'CLAIM_OFFICER', 'CLAIM_OFFICER_I', 'CLAIM_OFFICER_II',
    'SENIOR_CLAIM_OFFICER', 'SUPERVISOR_CLAIMS', 'MANAGER_CLAIMS', 'HEAD_CLAIMS'
];
const APPROVER_ROLES = [
    'MANAGER_CLAIMS', 'HEAD_CLAIMS', 'CLAIMS_ADMIN',
    'MASTER_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'CEO', 'COO', 'CFO', 'ADMIN'
];
const REVIEWER_ROLES = [
    'CLAIM_OFFICER', 'CLAIM_OFFICER_I', 'CLAIM_OFFICER_II', 'SENIOR_CLAIM_OFFICER'
];
const ALL_CLAIMS_ACCESS = [...CLAIM_ROLES, 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'CEO', 'COO', 'CFO', 'ADMIN'];
// ---------------------------------------------------------------------------
// Helper: Generate claim number
// ---------------------------------------------------------------------------
async function generateClaimNumber(productCode) {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `CLND/AHO/${productCode || 'GEN'}/`;
    try {
        const result = await pool.query(`SELECT "claimNumber" FROM claims 
       WHERE "claimNumber" LIKE $1 
       ORDER BY "createdAt" DESC LIMIT 1`, [prefix + '%']);
        let nextNumber = 1;
        if (result.rows.length > 0) {
            const lastNumber = result.rows[0].claimNumber;
            const parts = lastNumber.split('/');
            const numPart = parts[parts.length - 2];
            if (numPart)
                nextNumber = parseInt(numPart) + 1;
        }
        return `${prefix}${nextNumber.toString().padStart(6, '0')}/${year}`;
    }
    catch (error) {
        console.error('Error generating claim number:', error);
        return `CLND/AHO/${productCode || 'GEN'}/${Date.now()}/${year}`;
    }
}
// =============================================
// STAFF ENDPOINTS (specific routes before /:id)
// =============================================
// GET /my-assigned – Claims assigned to current officer
router.get('/my-assigned', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(`SELECT 
        c.id, c."claimNumber", c.status, c."incidentDate", c."estimatedAmount",
        c."approvedAmount", c."submittedDate", c."natureOfLoss", c."riskItem",
        c.location, c."incidentDescription",
        u."firstName", u."lastName", u.email, u.phone,
        p."policyNumber", p.type as "policyType"
       FROM claims c
       LEFT JOIN users u ON u.id = c."userId"
       LEFT JOIN policies p ON p.id = c."policyId"
       WHERE c."assignedOfficer" = $1
       ORDER BY c."submittedDate" DESC`, [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch assigned claims:', error);
        res.json([]);
    }
});
// GET /queue – Claim queue
router.get('/queue', authenticate, authorize(...CLAIM_ROLES), async (req, res) => {
    try {
        const result = await pool.query(`SELECT 
        c.id, c."claimNumber", c.status, c."incidentDate", c."estimatedAmount",
        c."submittedDate", c."natureOfLoss",
        u."firstName", u."lastName", u.email, u.phone,
        p."policyNumber", p.type
       FROM claims c
       LEFT JOIN users u ON u.id = c."userId"
       LEFT JOIN policies p ON p.id = c."policyId"
       WHERE c.status IN ('SUBMITTED', 'UNDER_REVIEW')
       ORDER BY c."submittedDate" ASC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch claim queue:', error);
        res.status(500).json({ error: 'Failed to fetch claim queue' });
    }
});
// GET /queue/stats – Queue statistics
router.get('/queue/stats', authenticate, authorize(...CLAIM_ROLES), async (req, res) => {
    try {
        const result = await pool.query(`SELECT 
        COUNT(*) FILTER (WHERE status = 'SUBMITTED') as pending,
        COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') as "underReview",
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
        COUNT(*) FILTER (WHERE status = 'PAID') as paid,
        COUNT(*) as total
       FROM claims`);
        const stats = result.rows[0];
        Object.keys(stats).forEach(key => { stats[key] = parseInt(stats[key]) || 0; });
        res.json(stats);
    }
    catch (error) {
        console.error('Failed to fetch queue stats:', error);
        res.status(500).json({ error: 'Failed to fetch queue statistics' });
    }
});
// GET /active – Active claims
router.get('/active', authenticate, authorize(...CLAIM_ROLES), async (req, res) => {
    try {
        const result = await pool.query(`SELECT 
        c.id, c."claimNumber", c.status, c."incidentDate", c."estimatedAmount",
        c."approvedAmount", c."submittedDate",
        u."firstName", u."lastName", u.email,
        p."policyNumber", p.type
       FROM claims c
       LEFT JOIN users u ON u.id = c."userId"
       LEFT JOIN policies p ON p.id = c."policyId"
       WHERE c.status IN ('APPROVED', 'UNDER_REVIEW', 'PAID')
       ORDER BY c."updatedAt" DESC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch active claims:', error);
        res.status(500).json({ error: 'Failed to fetch active claims' });
    }
});
// GET /pending-review – Claims pending officer review
router.get('/pending-review', authenticate, authorize(...CLAIM_ROLES), async (req, res) => {
    try {
        const result = await pool.query(`SELECT 
        c.id, c."claimNumber", c.status, c."incidentDate", c."estimatedAmount",
        c."submittedDate", c."natureOfLoss", c."riskItem", c.location, c."incidentDescription",
        u."firstName", u."lastName", u.email, u.phone,
        p."policyNumber", p.type
       FROM claims c
       LEFT JOIN users u ON u.id = c."userId"
       LEFT JOIN policies p ON p.id = c."policyId"
       WHERE c.status = 'SUBMITTED'
       ORDER BY c."submittedDate" ASC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch pending claims:', error);
        res.status(500).json({ error: 'Failed to fetch pending claims' });
    }
});
// GET /stats/summary – Summary statistics (all claims staff + admins)
router.get('/stats/summary', authenticate, authorize(...ALL_CLAIMS_ACCESS), async (req, res) => {
    try {
        const result = await pool.query(`SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'SUBMITTED') as pending,
        COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') as "underReview",
        COUNT(*) FILTER (WHERE status = 'REVIEWED') as reviewed,
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
        COUNT(*) FILTER (WHERE status = 'PAID') as paid,
        COALESCE(AVG(CASE WHEN status IN ('APPROVED', 'PAID') 
          THEN EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))/86400 END), 0) as "avgProcessingDays"
       FROM claims`);
        const stats = result.rows[0];
        Object.keys(stats).forEach(key => { stats[key] = parseFloat(stats[key]) || 0; });
        res.json(stats);
    }
    catch (error) {
        console.error('Failed to fetch stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});
// GET /team-performance – Team performance (managers+)
router.get('/team-performance', authenticate, authorize('MANAGER_CLAIMS', 'HEAD_CLAIMS', 'CLAIMS_ADMIN', 'MASTER_ADMIN'), async (req, res) => {
    try {
        const result = await pool.query(`SELECT 
        u.id, u."firstName", u."lastName", u.email, u.role,
        COUNT(c.id) as assigned,
        COUNT(CASE WHEN c.status = 'APPROVED' THEN 1 END) as approved,
        COUNT(CASE WHEN c.status = 'REJECTED' THEN 1 END) as rejected,
        COALESCE(AVG(CASE WHEN c.status IN ('APPROVED', 'REJECTED') 
          THEN EXTRACT(DAY FROM (c."reviewedAt" - c."submittedDate")) END), 0)::integer as "avgTime"
       FROM users u
       LEFT JOIN claims c ON c."assignedOfficer" = u.id
       WHERE u.role LIKE '%CLAIM%'
       GROUP BY u.id, u."firstName", u."lastName", u.email, u.role
       ORDER BY assigned DESC`);
        const formatted = result.rows.map(row => ({
            id: row.id,
            firstName: row.firstName || 'N/A',
            lastName: row.lastName || 'N/A',
            email: row.email,
            role: row.role,
            assigned: parseInt(row.assigned) || 0,
            approved: parseInt(row.approved) || 0,
            rejected: parseInt(row.rejected) || 0,
            avgTime: Math.round(parseFloat(row.avgTime) || 0)
        }));
        res.json(formatted);
    }
    catch (error) {
        console.error('Failed to fetch team performance:', error);
        res.json([]);
    }
});
// GET /recent-activities – Recent activities (managers+)
router.get('/recent-activities', authenticate, authorize('MANAGER_CLAIMS', 'HEAD_CLAIMS', 'CLAIMS_ADMIN', 'MASTER_ADMIN'), async (req, res) => {
    try {
        const result = await pool.query(`SELECT 
        c."claimNumber", c.status, c."updatedAt" as timestamp,
        COALESCE(u."firstName" || ' ' || u."lastName", 'System') as "user",
        CASE 
          WHEN c.status = 'APPROVED' THEN 'Claim Approved'
          WHEN c.status = 'REJECTED' THEN 'Claim Rejected'
          WHEN c.status = 'PAID' THEN 'Claim Paid'
          WHEN c.status = 'REVIEWED' THEN 'Claim Reviewed'
          WHEN c.status = 'UNDER_REVIEW' THEN 'Claim Under Review'
          ELSE 'Claim Updated'
        END as action
       FROM claims c
       LEFT JOIN users u ON u.id = c."assignedOfficer"
       ORDER BY c."updatedAt" DESC
       LIMIT 20`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch recent activities:', error);
        res.json([]);
    }
});
// GET /search – Search claims (all claims staff)
router.get('/search', authenticate, authorize(...ALL_CLAIMS_ACCESS), async (req, res) => {
    try {
        const query = String(req.query.query || '');
        if (query.trim().length < 3) {
            return res.status(400).json({ error: 'Search query must be at least 3 characters' });
        }
        const searchTerm = `%${query.trim()}%`;
        const result = await pool.query(`SELECT 
        c.id, c."claimNumber", c.status, c."incidentDate", c."estimatedAmount",
        c."natureOfLoss", c."submittedDate", c."incidentDescription", c."location",
        c."approvedAmount", c."assignedOfficer", c."officerRemarks",
        p."policyNumber",
        CONCAT(u."firstName", ' ', u."lastName") AS "customerName"
       FROM claims c
       JOIN policies p ON p.id = c."policyId"
       JOIN users u ON u.id = c."userId"
       WHERE c."claimNumber" ILIKE $1
          OR p."policyNumber" ILIKE $1
          OR u."firstName" ILIKE $1
          OR u."lastName" ILIKE $1
          OR c."natureOfLoss" ILIKE $1
       ORDER BY c."submittedDate" DESC
       LIMIT 50`, [searchTerm]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Claim search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});
// =============================================
// CUSTOMER ENDPOINTS
// =============================================
// GET /my-claims – Customer's own claims
router.get('/my-claims', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(`SELECT 
        c.id, c."claimNumber", c.status, c."incidentDate", c."estimatedAmount",
        c."approvedAmount", c."natureOfLoss", c."submittedDate", c."incidentDescription",
        c."location", p."policyNumber", p."type" as "productType"
       FROM claims c
       JOIN policies p ON p.id = c."policyId"
       WHERE p."userId" = $1
       ORDER BY c."submittedDate" DESC`, [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Fetch my claims error:', error);
        res.status(500).json({ error: 'Failed to fetch claims' });
    }
});
// GET / – Get all claims (admin) or user's claims (customer)
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const isAdmin = CLAIM_ROLES.includes(userRole) || userRole === 'MASTER_ADMIN';
        let query = `
      SELECT 
        c.id, c."claimNumber", c.status, c."incidentDate", c."incidentDescription",
        c."estimatedAmount", c."submittedDate", c."natureOfLoss", c."createdAt", c."updatedAt",
        c.location, c."riskItem", c."vehicleDamageDetails", c."witnessName", c."witnessPhone",
        c."driverFullName", c."driverLicenseNumber", c."roadConditions", c."weatherConditions",
        p."policyNumber", p.type as "policyType", p."productDetails"
      FROM claims c
      LEFT JOIN policies p ON p.id = c."policyId"
    `;
        const params = [];
        if (!isAdmin) {
            query += ` WHERE c."userId" = $1`;
            params.push(userId);
        }
        query += ` ORDER BY c."submittedDate" DESC`;
        const result = await pool.query(query, params);
        const claimsWithDetails = result.rows.map(claim => {
            let vehicleDetails = null;
            let vehicles = [];
            if (claim.productDetails) {
                try {
                    const productDetails = typeof claim.productDetails === 'string'
                        ? JSON.parse(claim.productDetails) : claim.productDetails;
                    if (productDetails.vehicles && Array.isArray(productDetails.vehicles)) {
                        vehicles = productDetails.vehicles.map((v) => ({
                            make: v.make || null,
                            model: v.model || null,
                            year: v.year || v.yearOfMake || null,
                            plateNumber: v.plateNumber || v.registrationNumber || null,
                            engineNumber: v.engineNumber || null,
                            chassisNumber: v.chassisNumber || null,
                            vehicleType: v.vehicleType || null,
                            vehicleValue: v.vehicleValue || null
                        }));
                        if (vehicles.length > 0) {
                            const firstVehicle = vehicles[0];
                            vehicleDetails = {
                                plateNumber: firstVehicle.plateNumber,
                                engineNumber: firstVehicle.engineNumber,
                                chassisNumber: firstVehicle.chassisNumber,
                                make: firstVehicle.make,
                                model: firstVehicle.model,
                                year: firstVehicle.year,
                                vehicleType: firstVehicle.vehicleType
                            };
                        }
                    }
                }
                catch (e) {
                    console.error('Error parsing productDetails for claim:', claim.id, e);
                }
            }
            delete claim.productDetails;
            return { ...claim, vehicleDetails, vehicles: vehicles.length > 0 ? vehicles : undefined };
        });
        res.json(claimsWithDetails);
    }
    catch (error) {
        console.error('Failed to fetch claims:', error);
        res.status(500).json({ error: 'Failed to fetch claims', details: error.message });
    }
});
// POST / – Create new claim
router.post('/', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { policyId, productCode = 'GEN', riskItem, incidentDate, timeOfAccident, incidentDescription, location, estimatedAmount, natureOfLoss, witnessName, witnessPhone, witnessStatement, driverFullName, driverAge, driverOccupation, driverLicenseNumber, driverLicenseIssueDate, driverLicenseExpiryDate, vehicleDamageDetails, injuredPersons, roadConditions, weatherConditions, responsibleParty } = req.body;
        if (!policyId)
            return res.status(400).json({ error: 'Policy ID is required' });
        if (!incidentDate)
            return res.status(400).json({ error: 'Incident date is required' });
        if (!incidentDescription)
            return res.status(400).json({ error: 'Incident description is required' });
        if (!natureOfLoss)
            return res.status(400).json({ error: 'Nature of loss is required' });
        const policyCheck = await pool.query('SELECT id, "policyNumber", type FROM policies WHERE id = $1 AND "userId" = $2', [policyId, userId]);
        if (policyCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Policy not found or does not belong to you' });
        }
        const claimNumber = await generateClaimNumber(productCode);
        let injuredPersonsJson = null;
        if (injuredPersons) {
            if (typeof injuredPersons === 'string') {
                try {
                    JSON.parse(injuredPersons);
                    injuredPersonsJson = injuredPersons;
                }
                catch (e) {
                    injuredPersonsJson = JSON.stringify([{ name: injuredPersons }]);
                }
            }
            else if (Array.isArray(injuredPersons) && injuredPersons.length > 0) {
                injuredPersonsJson = JSON.stringify(injuredPersons);
            }
        }
        const result = await pool.query(`INSERT INTO claims (
        id, "claimNumber", "policyId", "userId", status, "riskItem",
        "incidentDate", "timeOfAccident", "incidentDescription", location,
        "natureOfLoss", "estimatedAmount", "witnessName", "witnessPhone",
        "witnessStatement", "driverFullName", "driverAge", "driverOccupation",
        "driverLicenseNumber", "driverLicenseIssueDate", "driverLicenseExpiryDate",
        "vehicleDamageDetails", "injuredPersons", "roadConditions",
        "weatherConditions", "responsibleParty", "submittedDate", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'SUBMITTED',
        $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24,
        NOW(), NOW(), NOW()
      ) RETURNING id, "claimNumber"`, [
            claimNumber, policyId, userId,
            riskItem || null, incidentDate, timeOfAccident || null, incidentDescription,
            location || null, natureOfLoss, estimatedAmount ? parseFloat(estimatedAmount) : null,
            witnessName || null, witnessPhone || null, witnessStatement || null,
            driverFullName || null, driverAge ? parseInt(driverAge) : null, driverOccupation || null,
            driverLicenseNumber || null, driverLicenseIssueDate || null, driverLicenseExpiryDate || null,
            vehicleDamageDetails || null, injuredPersonsJson,
            roadConditions || null, weatherConditions || null, responsibleParty || null
        ]);
        res.status(201).json({
            message: 'Claim submitted successfully',
            claimNumber: result.rows[0].claimNumber,
            claimId: result.rows[0].id
        });
    }
    catch (error) {
        console.error('Failed to create claim:', error);
        res.status(500).json({ error: 'Failed to create claim', details: error.message });
    }
});
// =============================================
// CLAIM REVIEW / APPROVAL
// =============================================
// POST /:id/review – Review/Approve/Reject a claim
router.post('/:id/review', authenticate, authorize(...CLAIM_ROLES), validateBody(reviewSchema), async (req, res) => {
    const client = await pool.connect();
    try {
        const id = String(req.params.id);
        const userId = req.user.id;
        const userRole = req.user.role;
        const { decision, approvedAmount, notes } = req.body;
        // Validate decision
        const validDecisions = ['APPROVE', 'REJECT', 'REVIEWED', 'REQUIRES_MODIFICATION', 'UNDER_REVIEW'];
        if (!validDecisions.includes(decision)) {
            return res.status(400).json({ error: `Invalid decision. Must be one of: ${validDecisions.join(', ')}` });
        }
        // Role-based permissions
        if (['APPROVE', 'REJECT'].includes(decision) && !APPROVER_ROLES.includes(userRole)) {
            return res.status(403).json({ error: 'Only approvers can approve or reject claims' });
        }
        // Check claim exists
        const claimCheck = await client.query('SELECT * FROM claims WHERE id = $1', [id]);
        if (claimCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Claim not found' });
        }
        const claim = claimCheck.rows[0];
        // Prevent double processing
        if (['APPROVED', 'REJECTED', 'PAID'].includes(claim.status)) {
            return res.status(400).json({ error: `Claim is already ${claim.status.toLowerCase()}` });
        }
        const statusMap = {
            APPROVE: 'APPROVED',
            REJECT: 'REJECTED',
            REVIEWED: 'REVIEWED',
            REQUIRES_MODIFICATION: 'REQUIRES_MODIFICATION',
            UNDER_REVIEW: 'UNDER_REVIEW',
        };
        const newStatus = statusMap[decision];
        await client.query('BEGIN');
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;
        updateFields.push(`status = $${paramCount++}`);
        updateValues.push(newStatus);
        if (decision === 'APPROVE' && approvedAmount) {
            updateFields.push(`"approvedAmount" = $${paramCount++}`);
            updateValues.push(parseFloat(approvedAmount));
        }
        updateFields.push(`"officerRemarks" = $${paramCount++}`);
        updateValues.push(notes || '');
        updateFields.push(`"reviewedBy" = $${paramCount++}`);
        updateValues.push(userId);
        updateFields.push(`"reviewedAt" = NOW()`);
        updateFields.push(`"updatedAt" = NOW()`);
        updateValues.push(id);
        await client.query(`UPDATE claims SET ${updateFields.join(', ')} WHERE id = $${paramCount}`, updateValues);
        // Add timeline entry
        const timelineNote = notes ? `${decision}: ${notes}` : `Claim ${decision.toLowerCase()}d by ${userRole}`;
        await client.query(`INSERT INTO claim_timeline ("claimId", status, note, "changedBy", "createdAt")
       VALUES ($1, $2, $3, $4, NOW())`, [id, newStatus, timelineNote, userId]);
        await client.query('COMMIT');
        res.json({ message: `Claim ${decision.toLowerCase()}d successfully`, status: newStatus, claimId: id });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to review claim:', error);
        res.status(500).json({ error: 'Failed to review claim' });
    }
    finally {
        client.release();
    }
});
// PATCH /:id/status – Quick status update (approvers only)
router.patch('/:id/status', authenticate, authorize(...APPROVER_ROLES), async (req, res) => {
    try {
        const id = String(req.params.id);
        const { status, notes } = req.body;
        const validStatuses = ['UNDER_REVIEW', 'REVIEWED', 'APPROVED', 'REJECTED', 'PAID'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        await pool.query(`UPDATE claims SET status = $1, "updatedAt" = NOW() WHERE id = $2`, [status, id]);
        if (notes) {
            await pool.query(`INSERT INTO claim_timeline (id, "claimId", status, note, "changedBy", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`, [id, status, notes, req.user?.id]);
        }
        res.json({ message: `Claim ${status.toLowerCase()} successfully` });
    }
    catch (error) {
        console.error('Failed to update claim status:', error);
        res.status(500).json({ error: 'Failed to update claim status' });
    }
});
// =============================================
// DOCUMENT ENDPOINTS
// =============================================
// POST /:id/documents – Upload documents
router.post('/:id/documents', authenticate, upload.array('documents', 10), async (req, res) => {
    try {
        const id = String(req.params.id);
        const files = req.files;
        const userId = req.user?.id;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        const documents = [];
        for (const file of files) {
            const result = await pool.query(`INSERT INTO claim_documents (
          id, "claimId", "documentName", "documentUrl", "documentType", "uploadedBy", "fileSize", "uploadedAt", "createdAt"
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`, [id, file.originalname, file.path, file.mimetype || 'application/octet-stream', userId, file.size]);
            documents.push(result.rows[0]);
        }
        res.status(201).json({
            message: 'Documents uploaded successfully',
            documents: documents.map(doc => ({
                id: doc.id, documentName: doc.documentName, documentType: doc.documentType,
                fileSize: doc.fileSize, uploadedAt: doc.uploadedAt
            }))
        });
    }
    catch (error) {
        console.error('Failed to upload documents:', error);
        res.status(500).json({ error: 'Failed to upload documents', details: error.message });
    }
});
// GET /:id/documents – Get claim documents
router.get('/:id/documents', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { id: claimId } = req.params;
        const claimResult = await pool.query('SELECT "userId" FROM claims WHERE id = $1', [claimId]);
        if (claimResult.rows.length === 0)
            return res.status(404).json({ error: 'Claim not found' });
        const claim = claimResult.rows[0];
        const isAdmin = CLAIM_ROLES.includes(userRole) || userRole === 'MASTER_ADMIN';
        if (!isAdmin && claim.userId !== userId)
            return res.status(403).json({ error: 'Access denied' });
        const result = await pool.query(`SELECT id, "documentName", "documentUrl", "documentType", "fileSize", "uploadedAt", "createdAt"
       FROM claim_documents WHERE "claimId" = $1 ORDER BY "createdAt" DESC`, [claimId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch documents:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});
// GET /:id/documents/:documentId/download – Download document
router.get('/:id/documents/:documentId/download', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { id: claimId, documentId } = req.params;
        const claimResult = await pool.query('SELECT "userId" FROM claims WHERE id = $1', [claimId]);
        if (claimResult.rows.length === 0)
            return res.status(404).json({ error: 'Claim not found' });
        const claim = claimResult.rows[0];
        const isAdmin = CLAIM_ROLES.includes(userRole) || userRole === 'MASTER_ADMIN';
        if (!isAdmin && claim.userId !== userId)
            return res.status(403).json({ error: 'Access denied' });
        const documentResult = await pool.query('SELECT * FROM claim_documents WHERE id = $1 AND "claimId" = $2', [documentId, claimId]);
        if (documentResult.rows.length === 0)
            return res.status(404).json({ error: 'Document not found' });
        const document = documentResult.rows[0];
        const filePath = document.documentUrl;
        if (!fs.existsSync(filePath))
            return res.status(404).json({ error: 'File not found on server' });
        const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif'];
        const ext = path.extname(filePath).toLowerCase();
        if (!allowedExtensions.includes(ext))
            return res.status(403).json({ error: 'File type not allowed for download' });
        res.download(filePath, document.documentName);
    }
    catch (error) {
        console.error('Failed to download document:', error);
        res.status(500).json({ error: 'Failed to download document' });
    }
});
// =============================================
// GET CLAIM BY ID (must be last)
// =============================================
router.get('/:id', authenticate, async (req, res) => {
    try {
        const id = String(req.params.id);
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const isAdmin = CLAIM_ROLES.includes(userRole) || userRole === 'MASTER_ADMIN';
        const claimCheck = await pool.query('SELECT "userId" FROM claims WHERE id = $1', [id]);
        if (claimCheck.rows.length === 0)
            return res.status(404).json({ error: 'Claim not found' });
        const claim = claimCheck.rows[0];
        if (!isAdmin && claim.userId !== userId)
            return res.status(403).json({ error: 'Access denied' });
        const result = await pool.query(`SELECT 
        c.*, u."firstName", u."lastName", u.email, u.phone, u.address,
        p."policyNumber", p.type as "policyType", p."coverageAmount", p.premium,
        p."effectiveDate", p."expirationDate", p."productDetails"
       FROM claims c
       LEFT JOIN users u ON u.id = c."userId"
       LEFT JOIN policies p ON p.id = c."policyId"
       WHERE c.id = $1`, [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Claim not found' });
        const claimData = result.rows[0];
        let injuredPersons = [];
        if (claimData.injuredPersons) {
            try {
                injuredPersons = typeof claimData.injuredPersons === 'string'
                    ? JSON.parse(claimData.injuredPersons) : claimData.injuredPersons;
            }
            catch (e) {
                injuredPersons = [];
            }
        }
        let vehicleDetails = null;
        let vehicles = [];
        if (claimData.productDetails) {
            try {
                const productDetails = typeof claimData.productDetails === 'string'
                    ? JSON.parse(claimData.productDetails) : claimData.productDetails;
                if (productDetails.vehicles && productDetails.vehicles.length > 0) {
                    vehicles = productDetails.vehicles;
                    const firstVehicle = vehicles[0];
                    vehicleDetails = {
                        make: firstVehicle.make, model: firstVehicle.model,
                        year: firstVehicle.year || firstVehicle.yearOfMake,
                        plateNumber: firstVehicle.plateNumber || firstVehicle.registrationNumber,
                        engineNumber: firstVehicle.engineNumber, chassisNumber: firstVehicle.chassisNumber,
                        vehicleType: firstVehicle.vehicleType, vehicleValue: firstVehicle.vehicleValue
                    };
                }
            }
            catch (e) {
                console.error('Error parsing productDetails:', e);
            }
        }
        delete claimData.productDetails;
        delete claimData.injuredPersons;
        res.json({
            ...claimData,
            vehicleDetails,
            vehicles: vehicles.length > 0 ? vehicles : undefined,
            injuredPersons: injuredPersons.length > 0 ? injuredPersons : undefined
        });
    }
    catch (error) {
        console.error('Failed to fetch claim details:', error);
        res.status(500).json({ error: 'Failed to fetch claim details', details: error.message });
    }
});
export default router;
