import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { generatePolicyNumber } from '../../lib/numbering.js';
import { generatePolicySchedule } from '../../services/PDFGenerator.service.js';
import fs from 'fs';
import path from 'path';
const router = Router();
router.use(authenticate);
// ==================== HELPER FUNCTIONS ====================
const CUSTOMER_DECISION_PENDING_STATUSES = ['AWAITING_CUSTOMER_APPROVAL', 'PENDING'];
function isCustomerDecisionPending(status) {
    return CUSTOMER_DECISION_PENDING_STATUSES.includes((status || '').toUpperCase());
}
async function getBaseRate(productType, coverageAmount) {
    const result = await pool.query(`
    SELECT "baseRate" 
    FROM premium_rates 
    WHERE "productType" = $1 
      AND $2 >= "minCoverage" 
      AND ("maxCoverage" IS NULL OR $2 <= "maxCoverage")
      AND "isActive" = true
    ORDER BY "minCoverage" ASC
    LIMIT 1
  `, [productType.toUpperCase(), coverageAmount]);
    if (result.rows.length > 0) {
        return parseFloat(result.rows[0].baseRate);
    }
    console.warn(`No rate found for ${productType} with coverage ${coverageAmount}, using default`);
    return 0.03;
}
async function getPerilPremium(perilId, coverageAmount) {
    const result = await pool.query(`
    SELECT "premiumRate", "calculationType" FROM perils WHERE id = $1 AND "isActive" = true
  `, [perilId]);
    if (result.rows.length === 0)
        return 0;
    const peril = result.rows[0];
    if (peril.calculationType === 'PERCENTAGE') {
        return coverageAmount * parseFloat(peril.premiumRate);
    }
    return parseFloat(peril.premiumRate);
}
async function getRiderPremium(riderId, coverageAmount) {
    const result = await pool.query(`
    SELECT "premiumRate", "calculationType" FROM riders WHERE id = $1 AND "isActive" = true
  `, [riderId]);
    if (result.rows.length === 0)
        return 0;
    const rider = result.rows[0];
    if (rider.calculationType === 'PERCENTAGE') {
        return coverageAmount * parseFloat(rider.premiumRate);
    }
    return parseFloat(rider.premiumRate);
}
async function getVatRate() {
    try {
        const result = await pool.query(`
      SELECT "settingValue" FROM system_settings WHERE "settingKey" = 'vatRate'
    `);
        if (result.rows.length > 0) {
            const rate = parseFloat(result.rows[0].settingValue);
            return isNaN(rate) ? 0.15 : rate;
        }
        return 0.15;
    }
    catch (error) {
        console.error('Error fetching VAT rate:', error);
        return 0.15;
    }
}
async function getDrrRate() {
    try {
        const result = await pool.query(`
      SELECT "settingValue" FROM system_settings WHERE "settingKey" = 'drrRate'
    `);
        if (result.rows.length > 0) {
            const rate = parseFloat(result.rows[0].settingValue);
            return isNaN(rate) ? 0.01 : rate;
        }
        return 0.01;
    }
    catch (error) {
        console.error('Error fetching DRR rate:', error);
        return 0.01;
    }
}
// ==================== PDF GENERATION ====================
async function generatePolicyDocument(policyId) {
    try {
        console.log(`Starting PDF generation for policy: ${policyId}`);
        const policyResult = await pool.query(`
      SELECT p.*, u."firstName", u."lastName", u.email, u.phone, u.address,
             pr.name as productName
      FROM policies p
      JOIN users u ON u.id = p."userId"
      JOIN products pr ON pr.code = p.type
      WHERE p.id = $1
    `, [policyId]);
        if (policyResult.rows.length === 0) {
            console.log(`Policy ${policyId} not found for PDF generation`);
            return;
        }
        const policy = policyResult.rows[0];
        const perilsResult = await pool.query(`
      SELECT pe."perilName", pe.description, pp."perilPremium"
      FROM policy_perils pp
      JOIN perils pe ON pe.id = pp."perilId"
      WHERE pp."policyId" = $1
    `, [policyId]);
        const ridersResult = await pool.query(`
      SELECT r."riderName", r.description, pr."riderPremium", r."maxLimit"
      FROM policy_riders pr
      JOIN riders r ON r.id = pr."riderId"
      WHERE pr."policyId" = $1
    `, [policyId]);
        let vehicles = [];
        try {
            if (policy.productDetails) {
                vehicles = typeof policy.productDetails === 'string'
                    ? JSON.parse(policy.productDetails).vehicles || []
                    : policy.productDetails.vehicles || [];
            }
        }
        catch (e) {
            vehicles = [];
        }
        const policyData = {
            policyNumber: policy.policyNumber,
            customerName: `${policy.firstName} ${policy.lastName}`,
            customerEmail: policy.email,
            customerPhone: policy.phone || 'N/A',
            customerAddress: policy.address || 'N/A',
            productName: policy.productName || policy.type,
            productType: policy.type,
            coverageAmount: parseFloat(policy.coverageAmount || 0),
            premium: parseFloat(policy.premium || 0),
            totalPremium: parseFloat(policy.totalPremium || policy.premium || 0),
            premiumFrequency: policy.premiumFrequency || 'YEARLY',
            effectiveDate: policy.effectiveDate ? new Date(policy.effectiveDate) : new Date(),
            expirationDate: policy.expirationDate ? new Date(policy.expirationDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            selectedPerils: perilsResult.rows.map(p => ({
                perilName: p.perilName,
                description: p.description,
                premium: parseFloat(p.perilPremium || 0)
            })),
            selectedRiders: ridersResult.rows.map(r => ({
                riderName: r.riderName,
                description: r.description,
                premium: parseFloat(r.riderPremium || 0),
                maxLimit: r.maxLimit ? parseFloat(r.maxLimit) : null
            })),
            vehicles: vehicles
        };
        const uploadsDir = path.join(process.cwd(), 'uploads', 'policies');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const pdfPath = await generatePolicySchedule(policyData);
        if (fs.existsSync(pdfPath)) {
            await pool.query(`
        UPDATE policies 
        SET "policyDocumentPath" = $1, "updatedAt" = NOW() 
        WHERE id = $2
      `, [pdfPath, policyId]);
            const documentTitle = `Policy Schedule - ${policy.policyNumber}`;
            const documentType = 'POLICY_SCHEDULE';
            const existingDoc = await pool.query(`
        SELECT id FROM policy_documents WHERE policy_id = $1 AND document_type = $2
      `, [policyId, documentType]);
            if (existingDoc.rows.length > 0) {
                await pool.query(`
          UPDATE policy_documents 
          SET file_url = $1, generated_at = NOW(), created_at = NOW(), title = $2
          WHERE policy_id = $3 AND document_type = $4
        `, [pdfPath, documentTitle, policyId, documentType]);
            }
            else {
                await pool.query(`
          INSERT INTO policy_documents (id, policy_id, document_type, title, file_url, generated_at, created_at)
          VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW(), NOW())
        `, [policyId, documentType, documentTitle, pdfPath]);
            }
        }
    }
    catch (error) {
        console.error('Failed to generate policy document:', error);
    }
}
// ========================================================================
// ROUTES – ORDER MATTERS! Exact matches first, parameterized routes last
// ========================================================================
// ==================== GET ALL POLICIES ====================
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT * FROM policies ORDER BY "createdAt" DESC LIMIT 100
    `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('[Policies] Fetch all error:', error.message);
        res.status(500).json({ error: 'Failed to fetch policies', detail: error.message });
    }
});
// ==================== GET POLICY STATS ====================
router.get('/stats', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PENDING_UNDERWRITING' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected,
        COALESCE(SUM("coverageAmount"), 0) as total_coverage,
        COALESCE(SUM(premium), 0) as total_premium
      FROM policies
    `);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('[Policies] Stats error:', error.message);
        res.status(500).json({ error: 'Failed to fetch policy stats', detail: error.message });
    }
});
router.get('/my-policies', async (req, res) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(`
      SELECT 
        id,
        "policyNumber",
        type,
        "coverageAmount",
        premium,
        status,
        COALESCE("createdAt", NOW()) as "createdAt",
        COALESCE("updatedAt", NOW()) as "updatedAt",
        COALESCE("effectiveDate", NOW()) as "effectiveDate",
        COALESCE("expirationDate", NOW() + INTERVAL '1 year') as "expirationDate",
        "policyDocumentPath",
        "adjustedPremium",
        "totalPremium",
        "underwriterNotes",
        "premiumFrequency",
        "productDetails",
        "approvalType",
        "userId"
      FROM policies
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
    `, [userId]);
        // Ensure all date fields are valid strings
        const safeRows = result.rows.map(row => ({
            ...row,
            createdAt: row.createdAt || new Date().toISOString(),
            updatedAt: row.updatedAt || new Date().toISOString(),
            effectiveDate: row.effectiveDate || new Date().toISOString(),
            expirationDate: row.expirationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        }));
        res.json(safeRows);
    }
    catch (error) {
        console.error('[Policies] My-policies error:', error.message);
        res.status(500).json({ error: 'Failed to fetch policies', detail: error.message });
    }
});
// ==================== PENDING DECISION ====================
router.get('/pending-decision', async (req, res) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(`
      SELECT 
        p.id, p."policyNumber", p.type, p."coverageAmount",
        p.premium as "originalPremium", p."adjustedPremium",
        p."underwriterNotes", p.status, p."updatedAt"
      FROM policies p
      WHERE p."userId" = $1
        AND p.status IN ('AWAITING_CUSTOMER_APPROVAL', 'PENDING')
      ORDER BY p."updatedAt" DESC
    `, [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch pending decisions:', error);
        res.json([]);
    }
});
// ==================== PREMIUM CALCULATION ====================
router.post('/calculate-premium', async (req, res) => {
    try {
        const { productType, coverageAmount, termMonths = 12, vehicles = [], selectedPerils = [], selectedRiders = [] } = req.body;
        if (!productType || !coverageAmount) {
            return res.status(400).json({ error: 'Product type and coverage amount are required' });
        }
        let baseRate = 0.03;
        try {
            const rateResult = await pool.query(`
        SELECT "baseRate" FROM premium_rates 
        WHERE "productType" = $1 AND $2 >= "minCoverage" 
          AND ("maxCoverage" IS NULL OR $2 <= "maxCoverage") AND "isActive" = true
        ORDER BY "minCoverage" ASC LIMIT 1
      `, [productType.toUpperCase(), coverageAmount]);
            if (rateResult.rows.length > 0)
                baseRate = parseFloat(rateResult.rows[0].baseRate);
        }
        catch (err) {
            console.error('Error fetching base rate:', err);
        }
        let totalVehicleValue = 0;
        for (const vehicle of vehicles)
            totalVehicleValue += vehicle.vehicleValue || 0;
        const actualCoverage = totalVehicleValue > 0 ? totalVehicleValue : coverageAmount;
        let annualPremium = actualCoverage * baseRate;
        let perilPremium = 0;
        const perilBreakdown = [];
        for (const perilId of selectedPerils) {
            try {
                const perilResult = await pool.query(`
          SELECT "premiumRate", "calculationType", "perilName" FROM perils WHERE id = $1 AND "isActive" = true
        `, [perilId]);
                if (perilResult.rows.length > 0) {
                    const peril = perilResult.rows[0];
                    let premium = peril.calculationType === 'PERCENTAGE' ? actualCoverage * parseFloat(peril.premiumRate) : parseFloat(peril.premiumRate);
                    perilPremium += premium;
                    perilBreakdown.push({ id: perilId, name: peril.perilName || 'Unknown', premium });
                }
            }
            catch (err) {
                console.error(`Error fetching peril ${perilId}:`, err);
            }
        }
        annualPremium += perilPremium;
        let riderPremium = 0;
        const riderBreakdown = [];
        for (const riderId of selectedRiders) {
            try {
                const riderResult = await pool.query(`
          SELECT "premiumRate", "calculationType", "riderName" FROM riders WHERE id = $1 AND "isActive" = true
        `, [riderId]);
                if (riderResult.rows.length > 0) {
                    const rider = riderResult.rows[0];
                    let premium = rider.calculationType === 'PERCENTAGE' ? actualCoverage * parseFloat(rider.premiumRate) : parseFloat(rider.premiumRate);
                    riderPremium += premium;
                    riderBreakdown.push({ id: riderId, name: rider.riderName || 'Unknown', premium });
                }
            }
            catch (err) {
                console.error(`Error fetching rider ${riderId}:`, err);
            }
        }
        annualPremium += riderPremium;
        const termDiscount = termMonths === 12 ? 0.9 : 1.0;
        const basicPremium = (annualPremium * termMonths / 12) * termDiscount;
        const vatRate = await getVatRate();
        const drrRate = await getDrrRate();
        const totalBeforeTax = basicPremium + perilPremium + riderPremium;
        const vatAmount = totalBeforeTax * vatRate;
        const drrAmount = totalBeforeTax * drrRate;
        const totalPremium = totalBeforeTax + vatAmount + drrAmount;
        const monthlyPremium = totalPremium / termMonths;
        let coverageTier = 'Basic';
        if (actualCoverage > 1000000)
            coverageTier = 'Premium';
        else if (actualCoverage > 500000)
            coverageTier = 'Standard';
        res.json({
            basicPremium: Math.round(basicPremium * 100) / 100,
            vatAmount: Math.round(vatAmount * 100) / 100,
            drrAmount: Math.round(drrAmount * 100) / 100,
            totalPremium: Math.round(totalPremium * 100) / 100,
            monthlyPremium: Math.round(monthlyPremium * 100) / 100,
            perilPremium: Math.round(perilPremium * 100) / 100,
            riderPremium: Math.round(riderPremium * 100) / 100,
            perilBreakdown, riderBreakdown, coverageTier,
            baseRate: Math.round(baseRate * 100) / 100
        });
    }
    catch (error) {
        console.error('Premium calculation failed:', error);
        res.status(500).json({ error: 'Failed to calculate premium', detail: error.message });
    }
});
// ==================== CREATE POLICY ====================
router.post('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { type, coverageAmount, premiumFrequency, effectiveDate, expirationDate, productDetails, vehicles = [], selectedPerils = [], selectedRiders = [] } = req.body;
        if (!type || !coverageAmount)
            return res.status(400).json({ error: 'Missing required fields' });
        const baseRate = await getBaseRate(type, coverageAmount);
        let totalVehicleValue = 0;
        for (const vehicle of vehicles)
            totalVehicleValue += vehicle.vehicleValue || 0;
        const actualCoverage = totalVehicleValue > 0 ? totalVehicleValue : coverageAmount;
        let annualPremium = actualCoverage * baseRate;
        let perilPremium = 0;
        const perilDetails = [];
        for (const perilId of selectedPerils) {
            const premium = await getPerilPremium(perilId, actualCoverage);
            perilPremium += premium;
            perilDetails.push({ perilId, premium });
        }
        annualPremium += perilPremium;
        let riderPremium = 0;
        const riderDetails = [];
        for (const riderId of selectedRiders) {
            const premium = await getRiderPremium(riderId, actualCoverage);
            riderPremium += premium;
            riderDetails.push({ riderId, premium });
        }
        annualPremium += riderPremium;
        const termMonths = 12;
        const termDiscount = termMonths === 12 ? 0.9 : 1.0;
        const basicPremium = (annualPremium * termMonths / 12) * termDiscount;
        const vatRate = await getVatRate();
        const drrRate = await getDrrRate();
        const vatAmount = basicPremium * vatRate;
        const drrAmount = basicPremium * drrRate;
        const totalPremium = basicPremium + vatAmount + drrAmount;
        const policyNumber = await generatePolicyNumber(type);
        const enhancedProductDetails = { ...productDetails, vehicles: vehicles || [], vehicleCount: vehicles?.length || 0, selectedPerils: perilDetails, selectedRiders: riderDetails };
        const result = await pool.query(`
      INSERT INTO policies (id, "policyNumber", "userId", type, status, "coverageAmount", premium, "premiumFrequency", "effectiveDate", "expirationDate", "productDetails", "approvalType", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::uuid, $1, $2, $3, 'PENDING_UNDERWRITING', $4, $5, $6, $7::date, $8::date, $9::jsonb, 'REVIEW_NEEDED', NOW(), NOW())
      RETURNING id, "policyNumber", status
    `, [policyNumber, userId, type, actualCoverage, basicPremium, premiumFrequency, effectiveDate, expirationDate, JSON.stringify(enhancedProductDetails)]);
        const policyId = result.rows[0].id;
        for (const peril of perilDetails) {
            await pool.query(`INSERT INTO policy_perils ("policyId", "perilId", "perilPremium", "createdAt") VALUES ($1, $2, $3, NOW())`, [policyId, peril.perilId, peril.premium]);
        }
        for (const rider of riderDetails) {
            await pool.query(`INSERT INTO policy_riders ("policyId", "riderId", "riderPremium", "createdAt") VALUES ($1, $2, $3, NOW())`, [policyId, rider.riderId, rider.premium]);
        }
        res.status(201).json({
            message: 'Policy application submitted successfully',
            policyId, policyNumber, status: result.rows[0].status,
            premiumBreakdown: { basePremium: basicPremium, perilPremium, riderPremium, totalPremium, vatAmount, drrAmount, monthlyPremium: totalPremium / termMonths }
        });
        setTimeout(() => { generatePolicyDocument(policyId).catch(err => console.error(`Background PDF generation failed for policy ${policyId}:`, err)); }, 1000);
    }
    catch (error) {
        console.error('Failed to create policy:', error);
        res.status(500).json({ error: 'Failed to submit policy application', detail: error.message });
    }
});
// ==================== RESPOND TO OFFER ====================
router.post('/:id/respond', async (req, res) => {
    try {
        const { decision, notes } = req.body;
        const policyId = req.params.id;
        const userId = req.user?.id;
        const currentPolicy = await pool.query(`SELECT * FROM policies
       WHERE id = $1 AND "userId" = $2
         AND status IN ('AWAITING_CUSTOMER_APPROVAL', 'PENDING')`, [policyId, userId]);
        if (currentPolicy.rows.length === 0)
            return res.status(404).json({ error: 'Policy not found' });
        const policy = currentPolicy.rows[0];
        const finalTotalPremium = policy.totalPremium || policy.premium;
        const finalBasePremium = policy.adjustedPremium || policy.premium;
        let history = [];
        try {
            history = policy.negotiationHistory || [];
            if (typeof history === 'string')
                history = JSON.parse(history);
        }
        catch (e) {
            history = [];
        }
        history.push({ timestamp: new Date(), action: `CUSTOMER_${decision}`, notes, customer: userId, acceptedPremium: finalBasePremium, acceptedTotalPremium: finalTotalPremium });
        const newStatus = decision === 'ACCEPT' ? 'PENDING_FINAL_APPROVAL' : 'REJECTED_BY_CUSTOMER';
        await pool.query(`
      UPDATE policies SET "customerDecision"=$1, "customerDecisionDate"=NOW(), "customerDecisionNotes"=$2, status=$3, premium=$4, "totalPremium"=$5, "negotiationHistory"=$6, "updatedAt"=NOW()
      WHERE id=$7
    `, [decision, notes || null, newStatus, finalBasePremium, finalTotalPremium, JSON.stringify(history), policyId]);
        res.json({ message: decision === 'ACCEPT' ? 'Offer accepted, pending final approval' : 'Offer rejected', status: newStatus });
    }
    catch (error) {
        console.error('Failed to process decision:', error);
        res.status(500).json({ error: 'Failed to process decision' });
    }
});
// ==================== PERILS & RIDERS ====================
router.get('/perils/:productCode', async (req, res) => {
    try {
        const { productCode } = req.params;
        const result = await pool.query(`SELECT p.* FROM perils p JOIN products pr ON pr.id = p."productId" WHERE pr.code = $1 AND p."isActive" = true ORDER BY p."displayOrder" ASC`, [productCode.toUpperCase()]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch perils:', error);
        res.json([]);
    }
});
router.get('/riders/:productCode', async (req, res) => {
    try {
        const { productCode } = req.params;
        const result = await pool.query(`SELECT r.* FROM riders r JOIN products pr ON pr.id = r."productId" WHERE pr.code = $1 AND r."isActive" = true ORDER BY r."displayOrder" ASC`, [productCode.toUpperCase()]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch riders:', error);
        res.json([]);
    }
});
// ==================== DOCUMENT DOWNLOAD ====================
router.get('/documents/:documentId/download', async (req, res) => {
    try {
        const { documentId } = req.params;
        const userId = req.user?.id;
        const docResult = await pool.query(`SELECT pd.*, p."userId" as policy_owner_id FROM policy_documents pd JOIN policies p ON p.id = pd.policy_id WHERE pd.id = $1`, [documentId]);
        if (docResult.rows.length === 0)
            return res.status(404).json({ error: 'Document not found' });
        const document = docResult.rows[0];
        if (document.policy_owner_id !== userId && req.user?.role !== 'MASTER_ADMIN')
            return res.status(403).json({ error: 'Access denied' });
        if (!fs.existsSync(document.file_url))
            return res.status(404).json({ error: 'Document file not found' });
        const ext = path.extname(document.file_url).toLowerCase();
        if (!['.pdf', '.xls', '.xlsx'].includes(ext))
            return res.status(403).json({ error: 'Only PDF and Excel files can be downloaded.' });
        res.download(document.file_url, `${document.title}${ext}`);
    }
    catch (error) {
        console.error('Failed to download document:', error);
        res.status(500).json({ error: 'Failed to download document' });
    }
});
// ==================== PARAMETERIZED ROUTES (must be last) ====================
router.get('/:policyId/documents', async (req, res) => {
    try {
        const { policyId } = req.params;
        const result = await pool.query(`SELECT * FROM policy_documents WHERE policy_id = $1`, [policyId]);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch documents', detail: error.message });
    }
});
router.get('/:policyId/download', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { policyId } = req.params;
        const result = await pool.query(`SELECT "policyDocumentPath" FROM policies WHERE id = $1 AND "userId" = $2`, [policyId, userId]);
        if (result.rows.length === 0 || !result.rows[0].policyDocumentPath)
            return res.status(404).json({ error: 'Policy document not found' });
        const filePath = result.rows[0].policyDocumentPath;
        if (!fs.existsSync(filePath))
            return res.status(404).json({ error: 'Policy document file not found' });
        const ext = path.extname(filePath).toLowerCase();
        if (!['.pdf', '.xls', '.xlsx'].includes(ext))
            return res.status(403).json({ error: 'Only PDF and Excel files can be downloaded.' });
        res.download(filePath, `policy_${policyId}${ext}`);
    }
    catch (error) {
        console.error('Failed to download policy document:', error);
        res.status(500).json({ error: 'Failed to download policy document' });
    }
});
router.get('/:id/details', async (req, res) => {
    try {
        const userId = req.user?.id;
        const id = String(req.params.id);
        const result = await pool.query(`SELECT p.*, u."firstName", u."lastName", u.email, u.phone, pr.name as productName FROM policies p JOIN users u ON u.id = p."userId" LEFT JOIN products pr ON pr.code = p.type WHERE p.id = $1 AND p."userId" = $2`, [id, userId]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Policy not found' });
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Failed to fetch policy details:', error);
        res.status(500).json({ error: 'Failed to fetch policy details' });
    }
});
router.get('/:id/document-status', async (req, res) => {
    try {
        const userId = req.user?.id;
        const id = String(req.params.id);
        const result = await pool.query(`SELECT "policyDocumentPath", status FROM policies WHERE id = $1 AND "userId" = $2`, [id, userId]);
        const hasDocument = result.rows.length > 0 && result.rows[0].policyDocumentPath && result.rows[0].status === 'ACTIVE';
        res.json({ hasDocument, status: result.rows[0]?.status });
    }
    catch (error) {
        console.error('Failed to check document status:', error);
        res.json({ hasDocument: false });
    }
});
export default router;
