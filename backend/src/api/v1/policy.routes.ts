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

// Get base rate from database
async function getBaseRate(productType: string, coverageAmount: number): Promise<number> {
  const result = await pool.query(`
    SELECT baseRate 
    FROM premium_rates 
    WHERE product_type = $1 
      AND $2 >= min_coverage 
      AND (max_coverage IS NULL OR $2 <= max_coverage)
      AND is_active = true
    ORDER BY min_coverage ASC
    LIMIT 1
  `, [productType.toUpperCase(), coverageAmount]);
  
  if (result.rows.length > 0) {
    return parseFloat(result.rows[0].baseRate);
  }
  
  console.warn(`No rate found for ${productType} with coverage ${coverageAmount}, using default`);
  return 0.03;
}

// Get peril premium
async function getPerilPremium(perilId: string, coverageAmount: number): Promise<number> {
  const result = await pool.query(`
    SELECT "premiumRate", "calculationType" FROM perils WHERE id = $1 AND "isActive" = true
  `, [perilId]);
  
  if (result.rows.length === 0) return 0;
  
  const peril = result.rows[0];
  if (peril.calculationType === 'PERCENTAGE') {
    return coverageAmount * parseFloat(peril.premiumRate);
  }
  return parseFloat(peril.premiumRate);
}

// Get rider premium
async function getRiderPremium(riderId: string, coverageAmount: number): Promise<number> {
  const result = await pool.query(`
    SELECT "premiumRate", "calculationType" FROM riders WHERE id = $1 AND "isActive" = true
  `, [riderId]);
  
  if (result.rows.length === 0) return 0;
  
  const rider = result.rows[0];
  if (rider.calculationType === 'PERCENTAGE') {
    return coverageAmount * parseFloat(rider.premiumRate);
  }
  return parseFloat(rider.premiumRate);
}

// Get VAT rate
async function getVatRate(): Promise<number> {
  try {
    const result = await pool.query(`
      SELECT setting_value FROM system_settings WHERE setting_key = 'vatRate'
    `);
    if (result.rows.length > 0) {
      const rate = parseFloat(result.rows[0].setting_value);
      return isNaN(rate) ? 0.15 : rate;
    }
    return 0.15;
  } catch (error) {
    console.error('Error fetching VAT rate:', error);
    return 0.15;
  }
}

// Get DRR rate
async function getDrrRate(): Promise<number> {
  try {
    const result = await pool.query(`
      SELECT setting_value FROM system_settings WHERE setting_key = 'drrRate'
    `);
    if (result.rows.length > 0) {
      const rate = parseFloat(result.rows[0].setting_value);
      return isNaN(rate) ? 0.01 : rate;
    }
    return 0.01;
  } catch (error) {
    console.error('Error fetching DRR rate:', error);
    return 0.01;
  }
}

// ==================== POLICY DOCUMENTS ENDPOINT ====================

// Get all documents for a policy
router.get('/:policyId/documents', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { policyId } = req.params;
    
    // Verify policy belongs to user
    const policyCheck = await pool.query(`
      SELECT id, "policyNumber" FROM policies 
      WHERE id = $1 AND "userId" = $2
    `, [policyId, userId]);
    
    if (policyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    const policy = policyCheck.rows[0];
    
    // Get documents from policy_documents table
    const documentsResult = await pool.query(`
      SELECT 
        id,
        document_type as "documentType",
        title,
        file_url as "fileUrl",
        generated_at as "generatedAt",
        created_at as "createdAt"
      FROM policy_documents
      WHERE policy_id = $1
      ORDER BY created_at DESC
    `, [policyId]);
    
    // Format documents for frontend
    const documents = documentsResult.rows.map(doc => ({
      id: doc.id,
      fileName: `${doc.title}.pdf`,
      filePath: doc.fileUrl,
      documentType: doc.documentType,
      title: doc.title,
      uploadedAt: doc.createdAt,
      mimeType: 'application/pdf'
    }));
    
    // Also check if there's a policy document path in policies table (for backward compatibility)
    const policyDocPath = await pool.query(`
      SELECT "policyDocumentPath" FROM policies WHERE id = $1
    `, [policyId]);
    
    if (policyDocPath.rows[0]?.policyDocumentPath && 
        fs.existsSync(policyDocPath.rows[0].policyDocumentPath) &&
        documents.length === 0) {
      // Add the legacy document if no documents in policy_documents
      documents.push({
        id: policyId,
        fileName: `Policy_${policy.policyNumber}.pdf`,
        filePath: policyDocPath.rows[0].policyDocumentPath,
        documentType: 'POLICY_SCHEDULE',
        title: `Policy Schedule - ${policy.policyNumber}`,
        uploadedAt: new Date(),
        mimeType: 'application/pdf'
      });
    }
    
    res.json(documents);
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// ==================== CUSTOMER POLICY ROUTES ====================

// Get my policies (customer)
router.get('/my-policies', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const result = await pool.query(`
      SELECT 
        p.id,
        p."policyNumber",
        p.type,
        p."coverageAmount",
        p.premium,
        p.status,
        p."createdAt",
        p."effectiveDate",
        p."expirationDate",
        p."policyDocumentPath"
      FROM policies p
      WHERE p."userId" = $1
      AND p.status IN ('PENDING_UNDERWRITING', 'AWAITING_CUSTOMER_APPROVAL', 'PENDING_FINAL_APPROVAL', 'ACTIVE')
      ORDER BY p."createdAt" DESC
    `, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// Get policies awaiting customer decision
router.get('/pending-decision', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const result = await pool.query(`
      SELECT 
        p.id,
        p."policyNumber",
        p.type,
        p."coverageAmount",
        p.premium as "originalPremium",
        p."adjustedPremium",
        p."underwriterNotes",
        p.status,
        p."updatedAt"
      FROM policies p
      WHERE p."userId" = $1 AND p.status = 'AWAITING_CUSTOMER_APPROVAL'
      ORDER BY p."updatedAt" DESC
    `, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch pending decisions:', error);
    res.json([]);
  }
});

// Customer responds to offer (accept/reject)
router.post('/:id/respond', async (req, res) => {
  try {
    const { decision, notes } = req.body;
    const policyId = req.params.id;
    const userId = req.user?.id;
    
    const currentPolicy = await pool.query(
      'SELECT * FROM policies WHERE id = $1 AND "userId" = $2',
      [policyId, userId]
    );
    
    if (currentPolicy.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    const policy = currentPolicy.rows[0];
    const finalTotalPremium = policy.totalPremium || policy.premium;
    const finalBasePremium = policy.adjustedPremium || policy.premium;
    
    const perilsResult = await pool.query(`
      SELECT pe."perilName", pp."perilPremium"
      FROM policy_perils pp
      JOIN perils pe ON pe.id = pp."perilId"
      WHERE pp."policyId" = $1
    `, [policyId]);
    
    const ridersResult = await pool.query(`
      SELECT r."riderName", pr."riderPremium"
      FROM policy_riders pr
      JOIN riders r ON r.id = pr."riderId"
      WHERE pr."policyId" = $1
    `, [policyId]);
    
    let history = [];
    try {
      history = policy.negotiationHistory || [];
      if (typeof history === 'string') history = JSON.parse(history);
    } catch (e) {
      history = [];
    }
    
    history.push({
      timestamp: new Date(),
      action: `CUSTOMER_${decision}`,
      notes: notes,
      customer: userId,
      acceptedPremium: finalBasePremium,
      acceptedTotalPremium: finalTotalPremium,
      perils: perilsResult.rows,
      riders: ridersResult.rows
    });
    
    let newStatus = decision === 'ACCEPT' ? 'PENDING_FINAL_APPROVAL' : 'REJECTED_BY_CUSTOMER';
    
    await pool.query(`
      UPDATE policies 
      SET "customerDecision" = $1,
          "customerDecisionDate" = NOW(),
          "customerDecisionNotes" = $2,
          status = $3,
          premium = $4,
          "totalPremium" = $5,
          "negotiationHistory" = $6,
          "updatedAt" = NOW()
      WHERE id = $7
    `, [decision, notes || null, newStatus, finalBasePremium, finalTotalPremium, JSON.stringify(history), policyId]);
    
    res.json({
      message: decision === 'ACCEPT' ? 'Offer accepted, pending final approval' : 'Offer rejected',
      status: newStatus,
      breakdown: {
        basePremium: finalBasePremium,
        totalPremium: finalTotalPremium,
        perils: perilsResult.rows,
        riders: ridersResult.rows
      }
    });
  } catch (error) {
    console.error('Failed to process decision:', error);
    res.status(500).json({ error: 'Failed to process decision' });
  }
});

// ==================== CREATE POLICY ====================

// Create new policy
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const {
      type,
      coverageAmount,
      premiumFrequency,
      effectiveDate,
      expirationDate,
      productDetails,
      vehicles = [],
      selectedPerils = [],
      selectedRiders = []
    } = req.body;
    
    if (!type || !coverageAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log('Starting policy creation for user:', userId);
    
    const baseRate = await getBaseRate(type, coverageAmount);
    
    let totalVehicleValue = 0;
    for (const vehicle of vehicles) {
      totalVehicleValue += vehicle.vehicleValue || 0;
    }
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
    
    const enhancedProductDetails = {
      ...productDetails,
      vehicles: vehicles || [],
      vehicleCount: vehicles?.length || 0,
      selectedPerils: perilDetails,
      selectedRiders: riderDetails
    };
    
    console.log('Inserting policy into database...');
    
    const result = await pool.query(`
      INSERT INTO policies (
        id, "policyNumber", "userId", type, status, "coverageAmount", premium,
        "premiumFrequency", "effectiveDate", "expirationDate", "productDetails",
        "approvalType", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::uuid, $1, $2, $3, 'PENDING_UNDERWRITING', 
        $4, $5, $6, $7::date, $8::date, $9::jsonb,
        'REVIEW_NEEDED', NOW(), NOW()
      ) RETURNING id, "policyNumber", status
    `, [policyNumber, userId, type, actualCoverage, basicPremium, 
        premiumFrequency, effectiveDate, expirationDate, JSON.stringify(enhancedProductDetails)]);
    
    const policyId = result.rows[0].id;
    console.log('Policy created with ID:', policyId);
    
    for (const peril of perilDetails) {
      await pool.query(`
        INSERT INTO policy_perils ("policyId", "perilId", "perilPremium", "createdAt")
        VALUES ($1, $2, $3, NOW())
      `, [policyId, peril.perilId, peril.premium]);
    }
    
    for (const rider of riderDetails) {
      await pool.query(`
        INSERT INTO policy_riders ("policyId", "riderId", "riderPremium", "createdAt")
        VALUES ($1, $2, $3, NOW())
      `, [policyId, rider.riderId, rider.premium]);
    }
    
    res.status(201).json({
      message: 'Policy application submitted successfully',
      policyId: policyId,
      policyNumber: policyNumber,
      status: result.rows[0].status,
      premiumBreakdown: {
        basePremium: basicPremium,
        perilPremium: perilPremium,
        riderPremium: riderPremium,
        totalPremium: totalPremium,
        vatAmount: vatAmount,
        drrAmount: drrAmount,
        monthlyPremium: totalPremium / termMonths
      }
    });
    
    // Generate PDF in background
    setTimeout(() => {
      generatePolicyDocument(policyId).catch(err => {
        console.error(`Background PDF generation failed for policy ${policyId}:`, err);
      });
    }, 1000);
    
  } catch (error) {
    console.error('Failed to create policy:', error);
    res.status(500).json({ error: 'Failed to submit policy application', details: error.message });
  }
});

// ==================== PDF GENERATION FUNCTION ====================

async function generatePolicyDocument(policyId: string) {
  try {
    console.log(`Starting PDF generation for policy: ${policyId}`);
    
    // Get policy details with customer info
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
    console.log(`Generating PDF for policy: ${policy.policyNumber}`);
    
    // Get perils for this policy
    const perilsResult = await pool.query(`
      SELECT pe."perilName", pe.description, pp."perilPremium"
      FROM policy_perils pp
      JOIN perils pe ON pe.id = pp."perilId"
      WHERE pp."policyId" = $1
    `, [policyId]);
    
    // Get riders for this policy
    const ridersResult = await pool.query(`
      SELECT r."riderName", r.description, pr."riderPremium", r."maxLimit"
      FROM policy_riders pr
      JOIN riders r ON r.id = pr."riderId"
      WHERE pr."policyId" = $1
    `, [policyId]);
    
    // Get vehicles if any
    let vehicles = [];
    try {
      if (policy.productDetails) {
        vehicles = typeof policy.productDetails === 'string' 
          ? JSON.parse(policy.productDetails).vehicles || [] 
          : policy.productDetails.vehicles || [];
      }
    } catch (e) {
      vehicles = [];
    }
    
    // Calculate totals
    const totalPerilPremium = perilsResult.rows.reduce((sum, p) => sum + parseFloat(p.perilPremium || 0), 0);
    const totalRiderPremium = ridersResult.rows.reduce((sum, r) => sum + parseFloat(r.riderPremium || 0), 0);
    const basePremium = parseFloat(policy.premium || 0);
    const totalPremium = parseFloat(policy.totalPremium || basePremium);
    
    const policyData = {
      policyNumber: policy.policyNumber,
      customerName: `${policy.firstName} ${policy.lastName}`,
      customerEmail: policy.email,
      customerPhone: policy.phone || 'N/A',
      customerAddress: policy.address || 'N/A',
      productName: policy.productName || policy.type,
      productType: policy.type,
      coverageAmount: parseFloat(policy.coverageAmount || 0),
      premium: basePremium,
      totalPremium: totalPremium,
      perilPremium: totalPerilPremium,
      riderPremium: totalRiderPremium,
      premiumFrequency: policy.premiumFrequency || 'YEARLY',
      effectiveDate: policy.effectiveDate ? new Date(policy.effectiveDate) : new Date(),
      expirationDate: policy.expirationDate ? new Date(policy.expirationDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      coverageTier: policy.coverageTier || 'Standard',
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
    
    // Create uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads', 'policies');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Generate PDF using the service
    const pdfPath = await generatePolicySchedule(policyData);
    console.log(`PDF generated at: ${pdfPath}`);
    
    // Verify file was created
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      console.log(`PDF file size: ${stats.size} bytes`);
      
      // Save PDF path to policy table
      await pool.query(`
        UPDATE policies 
        SET "policyDocumentPath" = $1, "updatedAt" = NOW() 
        WHERE id = $2
      `, [pdfPath, policyId]);
      
      // ========== INSERT INTO policy_documents TABLE ==========
      const documentTitle = `Policy Schedule - ${policy.policyNumber}`;
      const documentType = 'POLICY_SCHEDULE';
      
      // Check if document already exists for this policy
      const existingDoc = await pool.query(`
        SELECT id FROM policy_documents WHERE policy_id = $1 AND document_type = $2
      `, [policyId, documentType]);
      
      if (existingDoc.rows.length > 0) {
        // Update existing document
        await pool.query(`
          UPDATE policy_documents 
          SET file_url = $1, 
              generated_at = NOW(), 
              created_at = NOW(),
              title = $2,
              content = $3
          WHERE policy_id = $4 AND document_type = $5
        `, [pdfPath, documentTitle, JSON.stringify(policyData, null, 2), policyId, documentType]);
        console.log(`Updated policy_documents record for policy ${policy.policyNumber}`);
      } else {
        // Insert new document
        await pool.query(`
          INSERT INTO policy_documents (
            id, policy_id, document_type, title, content, file_url, generated_at, created_at
          ) VALUES (
            gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW()
          )
        `, [policyId, documentType, documentTitle, JSON.stringify(policyData, null, 2), pdfPath]);
        console.log(`Inserted policy_documents record for policy ${policy.policyNumber}`);
      }
      
      console.log(`Policy document path saved for policy ${policy.policyNumber}`);
    } else {
      console.error(`PDF file was not created at ${pdfPath}`);
    }
    
  } catch (error) {
    console.error('Failed to generate policy document:', error);
    // Don't throw, just log the error - policy creation shouldn't fail because of PDF
  }
}

// ==================== APPROVAL ENDPOINTS ====================

// Get all pending policies for underwriting roles
router.get('/pending-underwriting', async (req, res) => {
  try {
    const userRole = req.user?.role;
    
    const underwritingRoles = [
      'UNDERWRITER', 'SENIOR_UNDERWRITER', 'UNDERWRITING_MANAGER',
      'CLAIM_OFFICER', 'CLAIM_OFFICER_I', 'CLAIM_OFFICER_II',
      'SENIOR_CLAIM_OFFICER', 'SUPERVISOR_CLAIMS', 'MANAGER_CLAIMS', 'HEAD_CLAIMS'
    ];
    
    const directApprovalRoles = [
      'MANAGER_CLAIMS', 'HEAD_CLAIMS', 'CLAIMS_ADMIN', 'CUSTOMER_ADMIN', 'MASTER_ADMIN'
    ];
    
    let whereClause = '';
    let params: any[] = [];
    
    if (underwritingRoles.includes(userRole)) {
      whereClause = `WHERE p.status = 'PENDING_UNDERWRITING' AND (p."approvalType" = 'REVIEW_NEEDED' OR p."approvalType" IS NULL)`;
    } else if (directApprovalRoles.includes(userRole)) {
      whereClause = `WHERE p.status = 'PENDING_UNDERWRITING' AND p."approvalType" = 'DIRECT_APPROVAL'`;
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const query = `
      SELECT 
        p.id, p."policyNumber", p.type, p."coverageAmount", p.premium,
        p.status, p."approvalType", p."createdAt",
        u."firstName" || ' ' || u."lastName" as "customerName",
        u.email as "customerEmail", u.phone as "customerPhone"
      FROM policies p
      JOIN users u ON u.id = p."userId"
      ${whereClause}
      ORDER BY p."createdAt" ASC
    `;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch pending policies:', error);
    res.status(500).json({ error: 'Failed to fetch pending policies' });
  }
});

// Direct approve policy
router.post('/:id/direct-approve', async (req, res) => {
  try {
    const { id } = req.params;
    const approverId = req.user?.id;
    const approverRole = req.user?.role;
    const { comments } = req.body;
    
    const directApprovalRoles = [
      'MANAGER_CLAIMS', 'HEAD_CLAIMS', 'CLAIMS_ADMIN', 'CUSTOMER_ADMIN', 'MASTER_ADMIN'
    ];
    
    if (!directApprovalRoles.includes(approverRole)) {
      return res.status(403).json({ error: 'You do not have permission to directly approve policies' });
    }
    
    const policyResult = await pool.query(`SELECT * FROM policies WHERE id = $1`, [id]);
    if (policyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    const policy = policyResult.rows[0];
    
    await pool.query('BEGIN');
    
    await pool.query(`
      UPDATE policies 
      SET status = 'ACTIVE', "approvalType" = 'DIRECT_APPROVAL',
          "directApprovedBy" = $1, "directApprovedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = $2
    `, [approverId, id]);
    
    await pool.query('COMMIT');
    
    res.json({
      message: 'Policy approved successfully',
      policyId: id,
      policyNumber: policy.policyNumber,
      status: 'ACTIVE'
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Failed to approve policy:', error);
    res.status(500).json({ error: 'Failed to approve policy' });
  }
});

// Review and adjust policy
router.post('/:id/review-adjust', async (req, res) => {
  try {
    const { id } = req.params;
    const underwriterId = req.user?.id;
    const underwriterRole = req.user?.role;
    const { adjustedPremium, underwriterNotes, decision, sendToCustomer } = req.body;
    
    const underwritingRoles = [
      'UNDERWRITER', 'SENIOR_UNDERWRITER', 'UNDERWRITING_MANAGER',
      'CLAIM_OFFICER', 'CLAIM_OFFICER_I', 'CLAIM_OFFICER_II', 'SENIOR_CLAIM_OFFICER'
    ];
    
    if (!underwritingRoles.includes(underwriterRole)) {
      return res.status(403).json({ error: 'You do not have permission to review policies' });
    }
    
    const policyResult = await pool.query(`SELECT * FROM policies WHERE id = $1`, [id]);
    if (policyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    const policy = policyResult.rows[0];
    
    await pool.query('BEGIN');
    
    let newStatus = '';
    if (decision === 'APPROVE') {
      newStatus = sendToCustomer ? 'AWAITING_CUSTOMER_APPROVAL' : 'ACTIVE';
      await pool.query(`
        UPDATE policies 
        SET "adjustedPremium" = $1, "underwriterNotes" = $2, status = $3,
            "underwriterId" = $4, "underwriterReviewedAt" = NOW(), "updatedAt" = NOW()
        WHERE id = $5
      `, [adjustedPremium || null, underwriterNotes, newStatus, underwriterId, id]);
    } else if (decision === 'REJECT') {
      newStatus = 'REJECTED_BY_UNDERWRITER';
      await pool.query(`
        UPDATE policies 
        SET status = $1, "underwriterNotes" = $2, "underwriterId" = $3,
            "underwriterReviewedAt" = NOW(), "updatedAt" = NOW()
        WHERE id = $4
      `, [newStatus, underwriterNotes, underwriterId, id]);
    }
    
    await pool.query('COMMIT');
    
    if (newStatus === 'ACTIVE') {
      generatePolicyDocument(id).catch(err => console.error('Failed to generate policy document:', err));
    }
    
    res.json({
      message: `Policy ${decision.toLowerCase()}d successfully`,
      policyId: id,
      policyNumber: policy.policyNumber,
      status: newStatus
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Failed to review policy:', error);
    res.status(500).json({ error: 'Failed to review policy' });
  }
});

// ==================== PREMIUM CALCULATION ====================

router.post('/calculate-premium', async (req, res) => {
  try {
    const { productType, coverageAmount, termMonths = 12, vehicles = [], selectedPerils = [], selectedRiders = [] } = req.body;
    
    console.log('=== PREMIUM CALCULATION REQUEST ===');
    console.log('Product Type:', productType);
    console.log('Coverage Amount:', coverageAmount);
    
    if (!productType || !coverageAmount) {
      return res.status(400).json({ error: 'Product type and coverage amount are required' });
    }
    
    if (coverageAmount < 100000) {
      return res.status(400).json({ error: 'Coverage amount must be at least ETB 100,000' });
    }
    
    let baseRate = 0.03;
    try {
      const rateResult = await pool.query(`
        SELECT baseRate FROM premium_rates 
        WHERE product_type = $1 AND $2 >= min_coverage 
          AND (max_coverage IS NULL OR $2 <= max_coverage) AND is_active = true
        ORDER BY min_coverage ASC LIMIT 1
      `, [productType.toUpperCase(), coverageAmount]);
      
      if (rateResult.rows.length > 0) {
        baseRate = parseFloat(rateResult.rows[0].baseRate);
      }
    } catch (err) {
      console.error('Error fetching base rate:', err);
    }
    
    let totalVehicleValue = 0;
    for (const vehicle of vehicles) {
      totalVehicleValue += vehicle.vehicleValue || 0;
    }
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
          let premium = peril.calculationType === 'PERCENTAGE' 
            ? actualCoverage * parseFloat(peril.premiumRate)
            : parseFloat(peril.premiumRate);
          perilPremium += premium;
          perilBreakdown.push({
            id: perilId,
            name: peril.perilName || 'Unknown',
            premium: premium
          });
        }
      } catch (err) {
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
          let premium = rider.calculationType === 'PERCENTAGE'
            ? actualCoverage * parseFloat(rider.premiumRate)
            : parseFloat(rider.premiumRate);
          riderPremium += premium;
          riderBreakdown.push({
            id: riderId,
            name: rider.riderName || 'Unknown',
            premium: premium
          });
        }
      } catch (err) {
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
    if (actualCoverage > 1000000) coverageTier = 'Premium';
    else if (actualCoverage > 500000) coverageTier = 'Standard';
    
    res.json({
      basicPremium: Math.round(basicPremium * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      drrAmount: Math.round(drrAmount * 100) / 100,
      totalPremium: Math.round(totalPremium * 100) / 100,
      monthlyPremium: Math.round(monthlyPremium * 100) / 100,
      perilPremium: Math.round(perilPremium * 100) / 100,
      riderPremium: Math.round(riderPremium * 100) / 100,
      perilBreakdown,
      riderBreakdown,
      riskModifier: 1.0,
      coverageTier,
      baseRate: Math.round(baseRate * 100) / 100
    });
    
  } catch (error: any) {
    console.error('Premium calculation failed:', error);
    res.status(500).json({ error: 'Failed to calculate premium', details: error.message });
  }
});

// ==================== DOWNLOAD POLICY DOCUMENT ====================

router.get('/:policyId/download', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { policyId } = req.params;
    
    const result = await pool.query(`
      SELECT "policyDocumentPath" FROM policies 
      WHERE id = $1 AND "userId" = $2
    `, [policyId, userId]);
    
    if (result.rows.length === 0 || !result.rows[0].policyDocumentPath) {
      return res.status(404).json({ error: 'Policy document not found' });
    }
    
    const filePath = result.rows[0].policyDocumentPath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Policy document file not found' });
    }
    
    // Restrict to only PDF and Excel files
    const allowedExtensions = ['.pdf', '.xls', '.xlsx'];
    const ext = path.extname(filePath).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return res.status(403).json({ error: 'Only PDF and Excel files can be downloaded.' });
    }
    res.download(filePath, `policy_${policyId}${ext}`);
  } catch (error) {
    console.error('Failed to download policy document:', error);
    res.status(500).json({ error: 'Failed to download policy document' });
  }
});

// Download policy document
router.get('/documents/:documentId/download', async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user?.id;
    
    // Get document from policy_documents table with policy ownership check
    const docResult = await pool.query(`
      SELECT pd.*, p."userId" as policy_owner_id, p."policyNumber"
      FROM policy_documents pd
      JOIN policies p ON p.id = pd.policy_id
      WHERE pd.id = $1
    `, [documentId]);
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = docResult.rows[0];
    
    // Check if user owns the policy
    if (document.policy_owner_id !== userId && req.user?.role !== 'MASTER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if file exists
    if (!fs.existsSync(document.file_url)) {
      return res.status(404).json({ error: 'Document file not found' });
    }
    
    // Restrict to only PDF and Excel files
    const allowedExtensions = ['.pdf', '.xls', '.xlsx'];
    const ext = path.extname(document.file_url).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return res.status(403).json({ error: 'Only PDF and Excel files can be downloaded.' });
    }
    // Send file
    res.download(document.file_url, `${document.title}${ext}`);
  } catch (error) {
    console.error('Failed to download document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});
// ==================== PERILS & RIDERS ====================

router.get('/perils/:productCode', async (req, res) => {
  try {
    const { productCode } = req.params;
    const result = await pool.query(`
      SELECT p.* FROM perils p
      JOIN products pr ON pr.id = p."productId"
      WHERE pr.code = $1 AND p."isActive" = true
      ORDER BY p."displayOrder" ASC
    `, [productCode.toUpperCase()]);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch perils:', error);
    res.json([]);
  }
});

router.get('/riders/:productCode', async (req, res) => {
  try {
    const { productCode } = req.params;
    const result = await pool.query(`
      SELECT r.* FROM riders r
      JOIN products pr ON pr.id = r."productId"
      WHERE pr.code = $1 AND r."isActive" = true
      ORDER BY r."displayOrder" ASC
    `, [productCode.toUpperCase()]);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch riders:', error);
    res.json([]);
  }
});

// ==================== POLICY DETAILS ====================

router.get('/:id/details', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT p.*, u."firstName", u."lastName", u.email, u.phone, pr.name as productName
      FROM policies p
      JOIN users u ON u.id = p."userId"
      LEFT JOIN products pr ON pr.code = p.type
      WHERE p.id = $1 AND p."userId" = $2
    `, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch policy details:', error);
    res.status(500).json({ error: 'Failed to fetch policy details' });
  }
});

router.get('/:id/document-status', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT "policyDocumentPath", status FROM policies 
      WHERE id = $1 AND "userId" = $2
    `, [id, userId]);
    
    const hasDocument = result.rows.length > 0 && 
                        result.rows[0].policyDocumentPath && 
                        result.rows[0].status === 'ACTIVE';
    
    res.json({ hasDocument, status: result.rows[0]?.status });
  } catch (error) {
    console.error('Failed to check document status:', error);
    res.json({ hasDocument: false });
  }
});

export default router;