import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
const router = Router();
router.use(authenticate);
// Define all underwriting roles
const UNDERWRITING_ROLES = [
    'UNDERWRITING_ADMIN',
    'MANAGER_UNDERWRITING',
    'HEAD_UNDERWRITING',
    'UNDERWRITING_OFFICER',
    'UNDERWRITING_OFFICER_I',
    'UNDERWRITING_OFFICER_II',
    'SENIOR_UNDERWRITING_OFFICER',
    'MASTER_ADMIN'
];
// In backend/src/routes/underwriting.ts
// Direct approve policy (without premium adjustment)
router.post('/policies/:id/direct-approve', authenticate, authorize('SUPERVISOR_UNDERWRITING', 'MANAGER_UNDERWRITING', 'HEAD_UNDERWRITING'), async (req, res) => {
    try {
        const id = String(req.params.id);
        const { comments } = req.body;
        const approverId = req.user?.id;
        const approverRole = req.user?.role;
        console.log('=== DIRECT APPROVAL ATTEMPT ===');
        console.log('Policy ID:', id);
        console.log('Approver ID:', approverId);
        console.log('Approver Role:', approverRole);
        // Get current policy
        const policyResult = await pool.query('SELECT * FROM policies WHERE id = $1', [id]);
        if (policyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        const policy = policyResult.rows[0];
        console.log('Current policy status:', policy.status);
        // Check if policy is in pending state
        if (policy.status !== 'PENDING_UNDERWRITING' && policy.status !== 'SUBMITTED') {
            return res.status(400).json({
                error: `Cannot approve policy in ${policy.status} status. Only PENDING_UNDERWRITING or SUBMITTED policies can be directly approved.`
            });
        }
        // Update policy status to ACTIVE
        const updateResult = await pool.query(`
        UPDATE policies 
        SET 
          status = 'ACTIVE',
          "approvedBy" = $1,
          "approvedAt" = NOW(),
          "underwriterNotes" = COALESCE($2, "underwriterNotes"),
          "updatedAt" = NOW()
        WHERE id = $3
        RETURNING id, status, "policyNumber"
      `, [approverId, comments, id]);
        console.log('Update result:', updateResult.rows[0]);
        // Try to record approval in policy_approvals table (if it exists)
        try {
            // Check if table exists first
            const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'policy_approvals'
          )
        `);
            if (tableCheck.rows[0].exists) {
                await pool.query(`
            INSERT INTO policy_approvals (
              id, "policyId", "approverId", "approverRole", "decision", 
              "approvalLevel", comments, "createdAt", "directApprovedAt"
            ) VALUES (
              gen_random_uuid()::text, $1, $2, $3, 'DIRECT_APPROVED', 1, $4, NOW(), NOW()
            )
          `, [id, approverId, approverRole, comments || `Directly approved by ${approverRole}`]);
                console.log('Approval recorded in policy_approvals');
            }
        }
        catch (err) {
            console.log('Could not record in policy_approvals (table may not exist):', err.message);
            // Don't fail the request if this fails
        }
        console.log('=== DIRECT APPROVAL SUCCESS ===');
        res.json({
            success: true,
            message: 'Policy approved directly',
            policyId: id,
            policyNumber: policy.policyNumber,
            status: 'ACTIVE',
            approvedBy: approverRole,
            approvedAt: new Date(),
            // directApprovedAt: new Date()
        });
    }
    catch (error) {
        console.error('=== DIRECT APPROVAL ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Failed to approve policy',
            details: error.message
        });
    }
});
// ==================== REJECT POLICY ====================
// Reject policy (without premium adjustment)
router.post('/policies/:id/reject', authenticate, authorize('SUPERVISOR_UNDERWRITING', 'MANAGER_UNDERWRITING', 'UNDERWRITING_ADMIN', 'HEAD_UNDERWRITING', 'SENIOR_UNDERWRITING_OFFICER', 'CUSTOMER_ADMIN', 'MASTER_ADMIN'), async (req, res) => {
    try {
        const id = String(req.params.id);
        const { reason, comments } = req.body;
        const rejectorId = req.user?.id;
        const rejectorRole = req.user?.role;
        console.log('=== POLICY REJECTION ATTEMPT ===');
        console.log('Policy ID:', id);
        console.log('Rejector ID:', rejectorId);
        console.log('Rejector Role:', rejectorRole);
        console.log('Reason:', reason);
        // Get current policy
        const policyResult = await pool.query('SELECT * FROM policies WHERE id = $1', [id]);
        if (policyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        const policy = policyResult.rows[0];
        // Check if policy is in pending state
        if (policy.status !== 'PENDING_UNDERWRITING' && policy.status !== 'SUBMITTED') {
            return res.status(400).json({
                error: `Cannot reject policy in ${policy.status} status.`
            });
        }
        // Update policy status to REJECTED
        await pool.query(`
        UPDATE policies 
        SET 
          status = 'REJECTED',
          "rejectedBy" = $1,
          "rejectedAt" = NOW(),
          "rejectionReason" = $2,
          "underwriterNotes" = COALESCE($3, $2),
          "updatedAt" = NOW()
        WHERE id = $4
      `, [rejectorId, reason, comments, id]);
        // Record the rejection in policy_approvals table
        try {
            const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'policy_approvals'
          )
        `);
            if (tableCheck.rows[0].exists) {
                await pool.query(`
            INSERT INTO policy_approvals (
              id, "policyId", "approverId", "approverRole", "decision", 
              "approvalLevel", comments, "createdAt"
            ) VALUES (
              gen_random_uuid()::text, $1, $2, $3, 'REJECTED', 1, $4, NOW()
            )
          `, [id, rejectorId, rejectorRole, reason]);
            }
        }
        catch (err) {
            console.log('Could not record in policy_approvals:', err.message);
        }
        console.log('=== POLICY REJECTION SUCCESS ===');
        res.json({
            success: true,
            message: 'Policy rejected successfully',
            policyId: id,
            policyNumber: policy.policyNumber,
            status: 'REJECTED',
            rejectedBy: rejectorRole,
            rejectedAt: new Date()
        });
    }
    catch (error) {
        console.error('=== POLICY REJECTION ERROR ===');
        console.error('Error message:', error.message);
        res.status(500).json({
            error: 'Failed to reject policy',
            details: error.message
        });
    }
});
// ==================== POLICY REVIEW & ADJUSTMENT ====================
// Get policies pending underwriting review (PENDING_UNDERWRITING or SUBMITTED)
router.get('/pending-review', authorize(...UNDERWRITING_ROLES), async (req, res) => {
    try {
        const result = await pool.query(`
        SELECT 
          p.id,
          p."policyNumber",
          p.type,
          p."coverageAmount",
          p.premium,
          p.status,
          p."createdAt",
          u."firstName", 
          u."lastName", 
          u.email, 
          u.phone
        FROM policies p
        JOIN users u ON u.id = p."userId"
        WHERE p.status IN ('PENDING_UNDERWRITING', 'SUBMITTED')
        ORDER BY p."createdAt" ASC
      `);
        const formattedPolicies = result.rows.map(policy => ({
            id: policy.id,
            policyNumber: policy.policyNumber,
            type: policy.type,
            coverageAmount: policy.coverageAmount,
            premium: policy.premium,
            customerName: `${policy.firstName || ''} ${policy.lastName || ''}`.trim() || 'Unknown',
            customerEmail: policy.email,
            customerPhone: policy.phone,
            status: policy.status,
            createdAt: policy.createdAt
        }));
        res.json(formattedPolicies);
    }
    catch (error) {
        console.error('Failed to fetch pending reviews:', error);
        res.status(500).json({ error: 'Failed to fetch pending reviews', details: error.message });
    }
});
// Get single policy details for review - ROBUST VERSION
router.get('/policies/:id', authenticate, authorize(...UNDERWRITING_ROLES), async (req, res) => {
    try {
        const id = String(req.params.id);
        console.log('=== FETCHING POLICY DETAILS ===');
        console.log('Policy ID:', id);
        // Step 1: Get basic policy info
        const policyQuery = `
        SELECT 
          p.id,
          p."policyNumber",
          p.type,
          p."coverageAmount",
          p.premium,
          p."adjustedPremium",
          p."totalPremium",
          p.status,
          p."createdAt",
          p."updatedAt",
          p."effectiveDate",
          p."expirationDate",
          p."premiumFrequency",
          p."productDetails",
          p."underwriterNotes",
          p."userId"
        FROM policies p
        WHERE p.id = $1
      `;
        const policyResult = await pool.query(policyQuery, [id]);
        if (policyResult.rows.length === 0) {
            console.log('Policy not found');
            return res.status(404).json({ error: 'Policy not found' });
        }
        const policy = policyResult.rows[0];
        console.log('Policy found:', policy.policyNumber);
        // Step 2: Get customer info
        let customer = {
            id: policy.userId,
            firstName: 'N/A',
            lastName: 'N/A',
            email: 'N/A',
            phone: 'N/A',
            address: 'N/A'
        };
        try {
            const userResult = await pool.query(`
          SELECT 
            id,
            "firstName",
            "lastName",
            email,
            phone,
            address
          FROM users 
          WHERE id = $1
        `, [policy.userId]);
            if (userResult.rows.length > 0) {
                customer = {
                    id: userResult.rows[0].id,
                    firstName: userResult.rows[0].firstName || 'N/A',
                    lastName: userResult.rows[0].lastName || 'N/A',
                    email: userResult.rows[0].email || 'N/A',
                    phone: userResult.rows[0].phone || 'N/A',
                    address: userResult.rows[0].address || 'N/A'
                };
            }
        }
        catch (userErr) {
            console.error('Error fetching user:', userErr);
        }
        // Step 3: Parse product details safely
        let productDetails = {};
        try {
            if (policy.productDetails) {
                productDetails = typeof policy.productDetails === 'string'
                    ? JSON.parse(policy.productDetails)
                    : policy.productDetails;
            }
        }
        catch (e) {
            console.error('Error parsing productDetails:', e);
            productDetails = {};
        }
        // Step 4: Get perils (try-catch to prevent failure)
        let selectedPerils = [];
        try {
            const perilsResult = await pool.query(`
          SELECT 
            pe.id,
            pe."perilName",
            pe.description,
            COALESCE(pp."perilPremium", 0) as premium
          FROM policy_perils pp
          INNER JOIN perils pe ON pe.id = pp."perilId"
          WHERE pp."policyId" = $1
        `, [id]);
            selectedPerils = perilsResult.rows.map(p => ({
                id: p.id,
                perilName: p.perilName || 'Unknown',
                description: p.description || '',
                premium: parseFloat(p.premium) || 0
            }));
        }
        catch (perilErr) {
            console.log('No perils found or table missing:', perilErr.message);
        }
        // Step 5: Get riders
        let selectedRiders = [];
        try {
            const ridersResult = await pool.query(`
          SELECT 
            r.id,
            r."riderName",
            r.description,
            COALESCE(pr."riderPremium", 0) as premium
          FROM policy_riders pr
          INNER JOIN riders r ON r.id = pr."riderId"
          WHERE pr."policyId" = $1
        `, [id]);
            selectedRiders = ridersResult.rows.map(r => ({
                id: r.id,
                riderName: r.riderName || 'Unknown',
                description: r.description || '',
                premium: parseFloat(r.premium) || 0
            }));
        }
        catch (riderErr) {
            console.log('No riders found or table missing:', riderErr.message);
        }
        // Step 6: Build the response
        const formattedPolicy = {
            id: policy.id,
            policyNumber: policy.policyNumber,
            type: policy.type || 'N/A',
            coverageAmount: parseFloat(policy.coverageAmount) || 0,
            premium: parseFloat(policy.premium) || 0,
            adjustedPremium: policy.adjustedPremium ? parseFloat(policy.adjustedPremium) : null,
            totalPremium: policy.totalPremium ? parseFloat(policy.totalPremium) : null,
            status: policy.status || 'PENDING_UNDERWRITING',
            createdAt: policy.createdAt,
            updatedAt: policy.updatedAt,
            effectiveDate: policy.effectiveDate,
            expirationDate: policy.expirationDate,
            premiumFrequency: policy.premiumFrequency || 'ANNUALLY',
            customer: customer,
            productDetails: productDetails,
            selectedPerils: selectedPerils,
            selectedRiders: selectedRiders,
            underwriterNotes: policy.underwriterNotes || ''
        };
        console.log('Policy details fetched successfully');
        res.json(formattedPolicy);
    }
    catch (error) {
        console.error('=== ERROR FETCHING POLICY DETAILS ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        // Return a basic response instead of failing
        res.status(500).json({
            error: 'Failed to fetch policy details',
            message: error.message,
            // Return basic policy info if available
            policyId: req.params.id
        });
    }
});
// Submit premium adjustment - RECALCULATES ALL COMPONENTS
router.post('/policies/:id/adjust', authorize(...UNDERWRITING_ROLES), async (req, res) => {
    try {
        const { adjusted_premium, underwriter_notes } = req.body;
        const policyId = req.params.id;
        const userId = req.user?.id;
        const userName = `${req.user?.firstName} ${req.user?.lastName}`;
        // Get current policy
        const currentPolicy = await pool.query('SELECT * FROM policies WHERE id = $1', [policyId]);
        if (currentPolicy.rows.length === 0) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        const policy = currentPolicy.rows[0];
        // Get perils for this policy
        const perilsResult = await pool.query(`
        SELECT pp.*, pe."premiumRate", pe."calculationType"
        FROM policy_perils pp
        JOIN perils pe ON pe.id = pp."perilId"
        WHERE pp."policyId" = $1
      `, [policyId]);
        // Get riders for this policy
        const ridersResult = await pool.query(`
        SELECT pr.*, r."premiumRate", r."calculationType"
        FROM policy_riders pr
        JOIN riders r ON r.id = pr."riderId"
        WHERE pr."policyId" = $1
      `, [policyId]);
        // Recalculate perils premium based on adjusted premium
        let totalPerilPremium = 0;
        for (const peril of perilsResult.rows) {
            let perilPremium = 0;
            if (peril.calculationType === 'PERCENTAGE') {
                perilPremium = adjusted_premium * peril.premiumRate;
            }
            else {
                perilPremium = peril.premiumRate;
            }
            totalPerilPremium += perilPremium;
            // Update policy_perils with new premium
            await pool.query(`
          UPDATE policy_perils SET "perilPremium" = $1 WHERE id = $2
        `, [perilPremium, peril.id]);
        }
        // Recalculate riders premium based on adjusted premium
        let totalRiderPremium = 0;
        for (const rider of ridersResult.rows) {
            let riderPremium = 0;
            if (rider.calculationType === 'PERCENTAGE') {
                riderPremium = adjusted_premium * rider.premiumRate;
            }
            else {
                riderPremium = rider.premiumRate;
            }
            totalRiderPremium += riderPremium;
            // Update policy_riders with new premium
            await pool.query(`
          UPDATE policy_riders SET "riderPremium" = $1 WHERE id = $2
        `, [riderPremium, rider.id]);
        }
        // Get VAT and DRR rates
        const vatResult = await pool.query(`
        SELECT setting_value FROM system_settings WHERE setting_key = 'vatRate'
      `);
        const drrResult = await pool.query(`
        SELECT setting_value FROM system_settings WHERE setting_key = 'drrRate'
      `);
        const vatRate = vatResult.rows.length > 0 ? parseFloat(vatResult.rows[0].setting_value) : 0.15;
        const drrRate = drrResult.rows.length > 0 ? parseFloat(drrResult.rows[0].setting_value) : 0.01;
        // Calculate total premium with all components
        const basePremium = adjusted_premium;
        const totalBeforeVat = basePremium + totalPerilPremium + totalRiderPremium;
        const vatAmount = totalBeforeVat * vatRate;
        const drrAmount = totalBeforeVat * drrRate;
        const totalPremium = totalBeforeVat + vatAmount + drrAmount;
        // Update negotiation history
        let history = policy.negotiationHistory || [];
        if (typeof history === 'string')
            history = JSON.parse(history);
        history.push({
            timestamp: new Date(),
            action: 'PREMIUM_ADJUSTMENT',
            from: policy.premium,
            to: adjusted_premium,
            perilPremium: totalPerilPremium,
            riderPremium: totalRiderPremium,
            vatAmount: vatAmount,
            drrAmount: drrAmount,
            totalPremium: totalPremium,
            notes: underwriter_notes,
            underwriter: userId,
            underwriterName: userName
        });
        // Update policy with new premium amounts
        await pool.query(`
        UPDATE policies 
        SET "adjustedPremium" = $1,
            "underwriterNotes" = $2,
            status = 'AWAITING_CUSTOMER_APPROVAL',
            "negotiationHistory" = $3,
            "totalPremium" = $4,
            "updatedAt" = NOW()
        WHERE id = $5
      `, [adjusted_premium, underwriter_notes, JSON.stringify(history), totalPremium, policyId]);
        res.json({
            message: 'Premium adjustment submitted. Waiting for customer approval.',
            status: 'AWAITING_CUSTOMER_APPROVAL',
            breakdown: {
                basePremium: adjusted_premium,
                perilPremium: totalPerilPremium,
                riderPremium: totalRiderPremium,
                vatAmount: vatAmount,
                drrAmount: drrAmount,
                totalPremium: totalPremium
            }
        });
    }
    catch (error) {
        console.error('Failed to adjust premium:', error);
        res.status(500).json({ error: 'Failed to adjust premium' });
    }
});
// ==================== FINAL APPROVAL ====================
// Final approval of policy (moves to ACTIVE)
router.post('/policies/:id/final-approve', authorize('UNDERWRITING_ADMIN', 'MANAGER_UNDERWRITING', 'HEAD_UNDERWRITING', 'SENIOR_UNDERWRITING_OFFICER', 'MASTER_ADMIN'), async (req, res) => {
    try {
        const { notes } = req.body;
        const policyId = req.params.id;
        const userId = req.user?.id;
        const userName = `${req.user?.firstName} ${req.user?.lastName}`;
        console.log('=== FINAL APPROVAL START ===');
        console.log('Policy ID:', policyId);
        console.log('User ID:', userId);
        console.log('User Name:', userName);
        console.log('Notes:', notes);
        // Get current policy
        const currentPolicy = await pool.query('SELECT * FROM policies WHERE id = $1', [policyId]);
        if (currentPolicy.rows.length === 0) {
            console.log('Policy not found');
            return res.status(404).json({ error: 'Policy not found' });
        }
        const policy = currentPolicy.rows[0];
        console.log('Policy found:', policy.policyNumber);
        // Get user details
        const userResult = await pool.query('SELECT "firstName", "lastName", email, phone, address FROM users WHERE id = $1', [policy.userId]);
        const customer = userResult.rows[0] || {};
        console.log('Customer found:', customer.firstName, customer.lastName);
        // Get product name
        const productResult = await pool.query('SELECT name FROM products WHERE code = $1', [policy.type]);
        const productName = productResult.rows[0]?.name || policy.type;
        console.log('Product:', productName);
        // Get perils
        const perilsResult = await pool.query(`
        SELECT pe."perilName", pe.description, pp."perilPremium"
        FROM policy_perils pp
        JOIN perils pe ON pe.id = pp."perilId"
        WHERE pp."policyId" = $1
      `, [policyId]);
        console.log('Perils count:', perilsResult.rows.length);
        // Get riders
        const ridersResult = await pool.query(`
        SELECT r."riderName", r.description, pr."riderPremium", r."maxLimit"
        FROM policy_riders pr
        JOIN riders r ON r.id = pr."riderId"
        WHERE pr."policyId" = $1
      `, [policyId]);
        console.log('Riders count:', ridersResult.rows.length);
        // Get vehicles from productDetails
        let vehicles = [];
        try {
            if (policy.productDetails) {
                const details = typeof policy.productDetails === 'string'
                    ? JSON.parse(policy.productDetails)
                    : policy.productDetails;
                vehicles = details.vehicles || [];
            }
        }
        catch (e) {
            console.error('Error parsing product details:', e);
        }
        console.log('Vehicles count:', vehicles.length);
        // Get underwriter info from negotiation history
        let underwriterName = null;
        let underwriterNotes = null;
        let history = [];
        try {
            history = policy.negotiationHistory || [];
            if (typeof history === 'string') {
                history = JSON.parse(history);
            }
            const lastAdjustment = history.find((h) => h.action === 'PREMIUM_ADJUSTMENT');
            if (lastAdjustment) {
                underwriterName = lastAdjustment.underwriterName;
                underwriterNotes = lastAdjustment.notes;
            }
        }
        catch (e) {
            console.error('Error parsing negotiation history:', e);
            history = [];
        }
        console.log('Underwriter:', underwriterName);
        // Calculate final premiums
        const finalBasePremium = parseFloat(policy.adjustedPremium || policy.premium || 0);
        console.log('Final base premium:', finalBasePremium);
        const totalPerilPremium = perilsResult.rows.reduce((sum, p) => sum + parseFloat(p.perilPremium || 0), 0);
        const totalRiderPremium = ridersResult.rows.reduce((sum, r) => sum + parseFloat(r.riderPremium || 0), 0);
        const totalBeforeVat = finalBasePremium + totalPerilPremium + totalRiderPremium;
        console.log('Total before VAT:', totalBeforeVat);
        // Get VAT and DRR rates
        const vatResult = await pool.query(`SELECT setting_value FROM system_settings WHERE setting_key = 'vatRate'`);
        const drrResult = await pool.query(`SELECT setting_value FROM system_settings WHERE setting_key = 'drrRate'`);
        const vatRate = vatResult.rows.length > 0 ? parseFloat(vatResult.rows[0].setting_value) : 0.15;
        const drrRate = drrResult.rows.length > 0 ? parseFloat(drrResult.rows[0].setting_value) : 0.01;
        const vatAmount = totalBeforeVat * vatRate;
        const drrAmount = totalBeforeVat * drrRate;
        const finalTotalPremium = totalBeforeVat + vatAmount + drrAmount;
        console.log('Final total premium:', finalTotalPremium);
        // Update negotiation history
        history.push({
            timestamp: new Date(),
            action: 'FINAL_APPROVAL',
            notes: notes,
            underwriter: userId,
            underwriterName: userName,
            finalBasePremium: finalBasePremium,
            finalTotalPremium: finalTotalPremium
        });
        // Update policy status
        const updateResult = await pool.query(`
        UPDATE policies 
        SET status = 'ACTIVE',
            premium = $1,
            "totalPremium" = $2,
            "approvedBy" = $3,
            "approvedAt" = NOW(),
            "effectiveDate" = COALESCE("effectiveDate", NOW()),
            "expirationDate" = COALESCE("expirationDate", NOW() + INTERVAL '1 year'),
            "negotiationHistory" = $4,
            "updatedAt" = NOW()
        WHERE id = $5
        RETURNING id
      `, [finalBasePremium, finalTotalPremium, userId, JSON.stringify(history), policyId]);
        console.log('Policy updated, rows affected:', updateResult.rowCount);
        // Try to generate PDF, but don't fail if it doesn't work
        try {
            const { generatePolicySchedule } = await import('../../services/PDFGenerator.service.js');
            const policyData = {
                policyNumber: policy.policyNumber,
                customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer',
                customerEmail: customer.email || 'N/A',
                customerPhone: customer.phone || 'N/A',
                customerAddress: customer.address || 'N/A',
                productName: productName,
                productType: policy.type,
                coverageAmount: parseFloat(policy.coverageAmount || 0),
                premium: finalBasePremium,
                totalPremium: finalTotalPremium,
                perilPremium: totalPerilPremium,
                riderPremium: totalRiderPremium,
                premiumFrequency: policy.premiumFrequency || 'ANNUALLY',
                effectiveDate: new Date(policy.effectiveDate || new Date()),
                expirationDate: new Date(policy.expirationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
                coverageTier: policy.coverageTier || 'Standard',
                selectedPerils: perilsResult.rows,
                selectedRiders: ridersResult.rows,
                vehicles: vehicles,
                underwriterName: underwriterName,
                underwriterNotes: underwriterNotes,
                approverName: userName,
                approvedDate: new Date(),
                customerDecisionDate: policy.customerDecisionDate
            };
            const pdfPath = await generatePolicySchedule(policyData);
            await pool.query(`
          UPDATE policies SET "policyDocumentPath" = $1 WHERE id = $2
        `, [pdfPath, policyId]);
            console.log('Policy document generated at:', pdfPath);
        }
        catch (pdfError) {
            console.error('Failed to generate policy document:', pdfError.message);
            // Don't fail the approval if PDF generation fails
        }
        console.log('=== FINAL APPROVAL SUCCESS ===');
        res.json({
            message: 'Policy fully approved and activated',
            status: 'ACTIVE',
            finalBasePremium: finalBasePremium,
            finalTotalPremium: finalTotalPremium
        });
    }
    catch (error) {
        console.error('=== FINAL APPROVAL ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Failed to final approve policy',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// ==================== FINAL APPROVAL QUEUE ====================
// Get policies pending final approval
router.get('/pending-final-approval', authorize('UNDERWRITING_ADMIN', 'MANAGER_UNDERWRITING', 'HEAD_UNDERWRITING', 'SENIOR_UNDERWRITING_OFFICER', 'MASTER_ADMIN'), async (req, res) => {
    try {
        console.log('Fetching pending final approval policies');
        const result = await pool.query(`
        SELECT 
          p.id,
          p."policyNumber",
          p.type,
          p."coverageAmount",
          p."adjustedPremium",
          p.premium as "originalPremium",
          p.status,
          p."customerDecision",
          p."customerDecisionNotes",
          p."underwriterNotes",
          p."createdAt",
          p."customerDecisionDate",
          u."firstName", 
          u."lastName", 
          u.email, 
          u.phone
        FROM policies p
        JOIN users u ON u.id = p."userId"
        WHERE p.status = 'PENDING_FINAL_APPROVAL'
        ORDER BY p."customerDecisionDate" ASC
      `);
        const formattedResults = result.rows.map(row => ({
            id: row.id,
            policyNumber: row.policyNumber,
            type: row.type,
            coverageAmount: parseFloat(row.coverageAmount || 0),
            adjustedPremium: parseFloat(row.adjustedPremium || 0),
            originalPremium: parseFloat(row.originalPremium || 0),
            status: row.status,
            customerDecision: row.customerDecision,
            customerDecisionNotes: row.customerDecisionNotes,
            underwriterNotes: row.underwriterNotes,
            createdAt: row.createdAt,
            customerDecisionDate: row.customerDecisionDate,
            customerName: `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Unknown',
            customerEmail: row.email,
            customerPhone: row.phone
        }));
        res.json(formattedResults);
    }
    catch (error) {
        console.error('Failed to fetch pending final approvals:', error);
        res.status(500).json({ error: 'Failed to fetch pending final approvals' });
    }
});
// Final approval - SIMPLIFIED VERSION
router.post('/policies/:id/final-approve', authorize('UNDERWRITING_ADMIN', 'MANAGER_UNDERWRITING', 'HEAD_UNDERWRITING', 'SENIOR_UNDERWRITING_OFFICER', 'MASTER_ADMIN'), async (req, res) => {
    try {
        const { notes } = req.body;
        const policyId = req.params.id;
        const userId = req.user?.id;
        const userName = `${req.user?.firstName} ${req.user?.lastName}`;
        console.log('=== FINAL APPROVAL ATTEMPT ===');
        console.log('Policy ID:', policyId);
        console.log('User ID:', userId);
        // First, check if policy exists
        const checkPolicy = await pool.query('SELECT id, status, "policyNumber" FROM policies WHERE id = $1', [policyId]);
        if (checkPolicy.rows.length === 0) {
            console.log('Policy not found');
            return res.status(404).json({ error: 'Policy not found' });
        }
        const policy = checkPolicy.rows[0];
        console.log('Current policy status:', policy.status);
        // Update policy status to ACTIVE
        const updateResult = await pool.query(`
        UPDATE policies 
        SET status = 'ACTIVE',
            "approvedBy" = $1,
            "approvedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE id = $2
        RETURNING id, status
      `, [userId, policyId]);
        console.log('Update result:', updateResult.rows[0]);
        res.json({
            success: true,
            message: 'Policy approved successfully',
            status: 'ACTIVE'
        });
    }
    catch (error) {
        console.error('Final approval error:', error.message);
        res.status(500).json({
            error: 'Failed to approve policy',
            message: error.message
        });
    }
});
// ==================== RISK ASSESSMENT ====================
// Get policies for risk assessment (PENDING_UNDERWRITING or SUBMITTED)
router.get('/risk-assessments', authorize(...UNDERWRITING_ROLES), async (req, res) => {
    try {
        const result = await pool.query(`
        SELECT 
          p.id,
          p."policyNumber",
          p.type,
          p."coverageAmount",
          p.premium,
          p.status,
          u."firstName", 
          u."lastName", 
          u.email
        FROM policies p
        JOIN users u ON u.id = p."userId"
        WHERE p.status IN ('PENDING_UNDERWRITING', 'SUBMITTED')
        ORDER BY p."coverageAmount" DESC
      `);
        const assessments = result.rows.map(policy => {
            let riskScore = 25;
            let riskLevel = 'LOW';
            const riskFactors = [];
            if (policy.coverageAmount > 1000000) {
                riskScore = 75;
                riskLevel = 'HIGH';
                riskFactors.push('High coverage amount');
            }
            else if (policy.coverageAmount > 500000) {
                riskScore = 50;
                riskLevel = 'MEDIUM';
                riskFactors.push('Medium coverage amount');
            }
            if (policy.type === 'AUTO') {
                riskFactors.push('Auto insurance - standard risk');
            }
            else if (policy.type === 'HEALTH') {
                riskFactors.push('Health insurance - medical risk factors apply');
            }
            else if (policy.type === 'LIFE') {
                riskFactors.push('Life insurance - longevity risk');
            }
            else if (policy.type === 'HOME') {
                riskFactors.push('Home insurance - property risk');
            }
            return {
                id: policy.id,
                policyNumber: policy.policyNumber,
                type: policy.type,
                coverageAmount: policy.coverageAmount,
                premium: policy.premium,
                customerName: `${policy.firstName || ''} ${policy.lastName || ''}`.trim() || 'Unknown',
                customerEmail: policy.email,
                riskScore: riskScore,
                riskLevel: riskLevel,
                riskFactors: riskFactors,
                recommendation: riskLevel === 'HIGH'
                    ? 'Requires senior underwriter review and additional documentation'
                    : 'Standard review process'
            };
        });
        res.json(assessments);
    }
    catch (error) {
        console.error('Failed to fetch risk assessments:', error);
        res.json([]);
    }
});
// ==================== MANAGER ENDPOINTS ====================
// ==================== MANAGER ENDPOINTS ====================
// Get team performance - Update to include all underwriting roles
// ==================== MANAGER DASHBOARD ENDPOINTS ====================
// Get team performance - WITH ALL UNDERWRITING ROLES
router.get('/manager/team-performance', authenticate, authorize('MANAGER_CLAIMS', 'HEAD_CLAIMS', 'CLAIMS_ADMIN', 'CUSTOMER_ADMIN', 'MASTER_ADMIN', 'MANAGER_UNDERWRITING', 'HEAD_UNDERWRITING', 'SUPERVISOR_UNDERWRITING'), async (req, res) => {
    try {
        console.log('Fetching team performance...');
        // Get all underwriters 
        const result = await pool.query(`
        SELECT 
          u.id,
          u."firstName",
          u."lastName",
          u.email,
          u.role,
          COUNT(p.id) as "totalPolicies",
          COUNT(CASE WHEN p.status = 'ACTIVE' THEN 1 END) as "approvedPolicies",
          COUNT(CASE WHEN p.status = 'REJECTED' THEN 1 END) as "rejectedPolicies",
          COUNT(CASE WHEN p.status = 'PENDING_UNDERWRITING' THEN 1 END) as "pendingPolicies"
        FROM users u
        LEFT JOIN policies p ON p."userId" = u.id
        WHERE u.role IN (
          'UNDERWRITING_OFFICER', 'UNDERWRITING_OFFICER_I',
          'UNDERWRITING_OFFICER_II', 'SENIOR_UNDERWRITING_OFFICER', 'SUPERVISOR_UNDERWRITING'
        )
        GROUP BY u.id, u."firstName", u."lastName", u.email, u.role
        ORDER BY u.role ASC
      `);
        console.log(`Found ${result.rows.length} team members`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch team performance:', error);
        res.status(500).json({ error: 'Failed to fetch team performance', details: error.message });
    }
});
// Get manager stats - WITH ALL UNDERWRITING ROLES
router.get('/manager/stats', authenticate, authorize('MANAGER_CLAIMS', 'HEAD_CLAIMS', 'CLAIMS_ADMIN', 'CUSTOMER_ADMIN', 'MASTER_ADMIN', 'MANAGER_UNDERWRITING', 'HEAD_UNDERWRITING', 'SUPERVISOR_UNDERWRITING'), async (req, res) => {
    try {
        console.log('Fetching manager stats...');
        // Team members count (all underwriting and claims roles)
        const teamCount = await pool.query(`
        SELECT COUNT(*) as count FROM users 
        WHERE role IN ( 'UNDERWRITING_OFFICER_I', 'UNDERWRITING_OFFICER_II', 'SENIOR_UNDERWRITING_OFFICER', 'SUPERVISOR_UNDERWRITING'
        )
      `);
        // Pending reviews
        const pendingReviews = await pool.query(`
        SELECT COUNT(*) as count FROM policies 
        WHERE status IN ('PENDING_UNDERWRITING', 'SUBMITTED')
      `);
        // Approved this week
        const approvedThisWeek = await pool.query(`
        SELECT COUNT(*) as count FROM policies 
        WHERE status = 'ACTIVE' 
        AND "approvedAt" >= NOW() - INTERVAL '7 days'
      `);
        // Rejected this week
        const rejectedThisWeek = await pool.query(`
        SELECT COUNT(*) as count FROM policies 
        WHERE status = 'REJECTED' 
        AND "rejectedAt" >= NOW() - INTERVAL '7 days'
      `);
        // Average processing time
        const avgProcessing = await pool.query(`
        SELECT AVG(EXTRACT(DAY FROM ("approvedAt" - "createdAt"))) as avg
        FROM policies 
        WHERE status = 'ACTIVE' AND "approvedAt" IS NOT NULL
      `);
        // Total exposure (active policies coverage)
        const totalExposure = await pool.query(`
        SELECT COALESCE(SUM("coverageAmount"), 0) as total 
        FROM policies 
        WHERE status = 'ACTIVE'
      `);
        const approved = parseInt(approvedThisWeek.rows[0]?.count || 0);
        const rejected = parseInt(rejectedThisWeek.rows[0]?.count || 0);
        const total = approved + rejected;
        const efficiency = total > 0 ? Math.round((approved / total) * 100) : 0;
        const stats = {
            teamMembers: parseInt(teamCount.rows[0]?.count || 0),
            pendingReviews: parseInt(pendingReviews.rows[0]?.count || 0),
            approvedThisWeek: approved,
            rejectedThisWeek: rejected,
            averageProcessingTime: parseFloat(avgProcessing.rows[0]?.avg || 0).toFixed(1),
            totalExposure: parseFloat(totalExposure.rows[0]?.total || 0),
            departmentEfficiency: efficiency
        };
        console.log('Stats calculated:', stats);
        res.json(stats);
    }
    catch (error) {
        console.error('Failed to fetch manager stats:', error);
        res.status(500).json({ error: 'Failed to fetch manager stats', details: error.message });
    }
});
// Get recent activities - WITH ALL UNDERWRITING ROLES
router.get('/manager/recent-activities', authenticate, authorize('MANAGER_CLAIMS', 'HEAD_CLAIMS', 'CLAIMS_ADMIN', 'CUSTOMER_ADMIN', 'MASTER_ADMIN', 'MANAGER_UNDERWRITING', 'HEAD_UNDERWRITING', 'SUPERVISOR_UNDERWRITING'), async (req, res) => {
    try {
        console.log('Fetching recent activities...');
        const result = await pool.query(`
        SELECT 
          p.id,
          p."policyNumber",
          p."coverageAmount",
          p.status,
          p."createdAt",
          p."updatedAt",
          p."approvedAt",
          p."approvedBy",
          u."firstName" || ' ' || u."lastName" as officer_name
        FROM policies p
        LEFT JOIN users u ON u.id = p."approvedBy"
        ORDER BY p."updatedAt" DESC
        LIMIT 15
      `);
        const activities = result.rows.map(row => {
            let action = '';
            let type = '';
            switch (row.status) {
                case 'ACTIVE':
                    action = 'Approved policy';
                    type = 'approval';
                    break;
                case 'REJECTED':
                    action = 'Rejected policy';
                    type = 'rejection';
                    break;
                case 'AWAITING_CUSTOMER_APPROVAL':
                    action = 'Sent for customer approval';
                    type = 'pending';
                    break;
                case 'PENDING_UNDERWRITING':
                    action = 'Pending underwriting review';
                    type = 'review';
                    break;
                default:
                    action = `Policy ${row.status?.toLowerCase() || 'updated'}`;
                    type = 'review';
            }
            return {
                id: row.id,
                policyNumber: row.policyNumber,
                amount: parseFloat(row.coverageAmount) || 0,
                action: action,
                officer: row.officer_name || 'System',
                type: type,
                time: new Date(row.updatedAt || row.createdAt).toLocaleDateString()
            };
        });
        console.log(`Found ${activities.length} recent activities`);
        res.json(activities);
    }
    catch (error) {
        console.error('Failed to fetch recent activities:', error);
        res.status(500).json({ error: 'Failed to fetch recent activities', details: error.message });
    }
});
// Simple dashboard summary endpoint - WITH ALL UNDERWRITING ROLES
router.get('/manager/summary', authenticate, authorize('MANAGER_CLAIMS', 'HEAD_CLAIMS', 'CLAIMS_ADMIN', 'CUSTOMER_ADMIN', 'MASTER_ADMIN', 'MANAGER_UNDERWRITING', 'HEAD_UNDERWRITING', 'SUPERVISOR_UNDERWRITING'), async (req, res) => {
    try {
        // Get all counts in one query
        const result = await pool.query(`
        SELECT 
          COUNT(CASE WHEN status = 'PENDING_UNDERWRITING' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected,
          COUNT(CASE WHEN status = 'AWAITING_CUSTOMER_APPROVAL' THEN 1 END) as awaiting,
          COUNT(*) as total
        FROM policies
      `);
        res.json({
            pending: parseInt(result.rows[0]?.pending || 0),
            active: parseInt(result.rows[0]?.active || 0),
            rejected: parseInt(result.rows[0]?.rejected || 0),
            awaiting: parseInt(result.rows[0]?.awaiting || 0),
            total: parseInt(result.rows[0]?.total || 0)
        });
    }
    catch (error) {
        console.error('Failed to fetch summary:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});
// ==================== HEAD ENDPOINTS ====================
// Get head stats
router.get('/head/stats', authorize('HEAD_UNDERWRITING', 'UNDERWRITING_ADMIN', 'MASTER_ADMIN'), async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        const totalPolicies = await pool.query(`
        SELECT COUNT(*) FROM policies WHERE EXTRACT(YEAR FROM "createdAt") = $1
      `, [year]);
        const totalPremium = await pool.query(`
        SELECT COALESCE(SUM(premium), 0) FROM policies 
        WHERE EXTRACT(YEAR FROM "createdAt") = $1 AND status = 'ACTIVE'
      `, [year]);
        const departmentCount = await pool.query(`
        SELECT COUNT(*) FROM users WHERE role LIKE '%UNDERWRITING%'
      `);
        const officerCount = await pool.query(`
        SELECT COUNT(*) FROM users WHERE role IN ('UNDERWRITING_OFFICER', 'UNDERWRITING_OFFICER_I', 'UNDERWRITING_OFFICER_II')
      `);
        const managerCount = await pool.query(`
        SELECT COUNT(*) FROM users WHERE role IN ('UNDERWRITING_MANAGER', 'UNDERWRITING_HEAD', 'UNDERWRITING_ADMIN')
      `);
        const acceptanceRate = await pool.query(`
        SELECT 
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as approved,
          COUNT(*) as total
        FROM policies WHERE EXTRACT(YEAR FROM "createdAt") = $1
      `, [year]);
        const renewalRate = await pool.query(`
        SELECT COALESCE(
          (SELECT COUNT(*) FROM policies WHERE status = 'ACTIVE' AND EXTRACT(YEAR FROM "createdAt") < $1) * 1.0 /
          NULLIF((SELECT COUNT(*) FROM policies WHERE EXTRACT(YEAR FROM "createdAt") < $1), 0), 0
        ) * 100 as rate
      `, [year]);
        res.json({
            totalPoliciesYTD: parseInt(totalPolicies.rows[0].count),
            totalPremiumYTD: parseFloat(totalPremium.rows[0].coalesce),
            lossRatio: 62.3,
            averagePremium: totalPremium.rows[0].coalesce / Math.max(totalPolicies.rows[0].count, 1),
            acceptanceRate: Math.round((acceptanceRate.rows[0].approved / Math.max(acceptanceRate.rows[0].total, 1)) * 100),
            rejectionRate: 12.3,
            pendingRate: 9.2,
            newBusinessGrowth: 15.8,
            renewalRate: Math.round(renewalRate.rows[0].rate),
            departmentSize: parseInt(departmentCount.rows[0].count),
            activeOfficers: parseInt(officerCount.rows[0].count),
            activeManagers: parseInt(managerCount.rows[0].count)
        });
    }
    catch (error) {
        console.error('Failed to fetch head stats:', error);
        res.json({});
    }
});
// Get risk metrics
router.get('/head/risk-metrics', authorize('HEAD_UNDERWRITING', 'UNDERWRITING_ADMIN', 'MASTER_ADMIN'), async (req, res) => {
    try {
        const result = await pool.query(`
        SELECT 
          CASE 
            WHEN type = 'AUTO' THEN 'Motor'
            WHEN type = 'HOME' THEN 'Property'
            WHEN type = 'LIFE' THEN 'Life'
            WHEN type = 'HEALTH' THEN 'Health'
            ELSE 'Other'
          END as category,
          COALESCE(SUM("coverageAmount"), 0) as exposure,
          COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN premium ELSE 0 END), 0) as claims,
          CASE 
            WHEN SUM("coverageAmount") > 0 
            THEN ROUND((COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN premium ELSE 0 END), 0) / SUM("coverageAmount")) * 100, 1)
            ELSE 0
          END as lossRatio
        FROM policies
        GROUP BY category
      `);
        const riskMetrics = result.rows.map(row => ({
            category: row.category,
            exposure: parseFloat(row.exposure),
            claims: parseFloat(row.claims),
            lossRatio: row.lossRatio,
            riskLevel: row.lossRatio > 25 ? 'High' : row.lossRatio > 15 ? 'Medium' : 'Low'
        }));
        res.json(riskMetrics);
    }
    catch (error) {
        console.error('Failed to fetch risk metrics:', error);
        res.json([]);
    }
});
// Get monthly trends
router.get('/head/monthly-trends', authorize('HEAD_UNDERWRITING', 'UNDERWRITING_ADMIN', 'MASTER_ADMIN'), async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        const result = await pool.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
          COUNT(*) as applications,
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as approvals,
          COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejections,
          COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN premium ELSE 0 END), 0) as premium
        FROM policies
        WHERE EXTRACT(YEAR FROM "createdAt") = $1
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt")
      `, [year]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch monthly trends:', error);
        res.json([]);
    }
});
// ==================== ENDORSEMENTS ====================
// Get pending endorsements
router.get('/endorsements', authorize(...UNDERWRITING_ROLES), async (req, res) => {
    try {
        // Create endorsements table if not exists
        await pool.query(`
        CREATE TABLE IF NOT EXISTS endorsements (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "policyId" VARCHAR(255) NOT NULL,
          "endorsementNumber" VARCHAR(100) UNIQUE,
          type VARCHAR(100) NOT NULL,
          changes JSONB,
          reason TEXT,
          status VARCHAR(50) DEFAULT 'PENDING',
          "requestedBy" VARCHAR(255),
          "requestedAt" TIMESTAMP DEFAULT NOW(),
          "reviewedBy" VARCHAR(255),
          "reviewedAt" TIMESTAMP,
          "approvedBy" VARCHAR(255),
          "approvedAt" TIMESTAMP,
          notes TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )
      `);
        const result = await pool.query(`
        SELECT 
          e.*,
          p."policyNumber",
          u."firstName", 
          u."lastName", 
          u.email
        FROM endorsements e
        JOIN policies p ON p.id = e."policyId"
        JOIN users u ON u.id = p."userId"
        WHERE e.status = 'PENDING'
        ORDER BY e."createdAt" ASC
      `);
        const formattedEndorsements = result.rows.map(e => ({
            id: e.id,
            policyNumber: e.policyNumber,
            customerName: `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown',
            customerEmail: e.email,
            type: e.type,
            changes: e.changes,
            reason: e.reason,
            status: e.status,
            submittedDate: e.requestedAt
        }));
        res.json(formattedEndorsements);
    }
    catch (error) {
        console.error('Failed to fetch endorsements:', error);
        res.json([]);
    }
});
// Approve endorsement (only senior roles)
router.post('/endorsements/:id/approve', authorize('UNDERWRITING_ADMIN', 'MANAGER_UNDERWRITING', 'HEAD_UNDERWRITING', 'SENIOR_UNDERWRITING_OFFICER', 'MASTER_ADMIN'), async (req, res) => {
    try {
        const { notes } = req.body;
        const userId = req.user?.id;
        await pool.query(`
        UPDATE endorsements 
        SET status = 'APPROVED',
            "reviewedBy" = $1,
            "reviewedAt" = NOW(),
            "approvedBy" = $1,
            "approvedAt" = NOW(),
            notes = $2,
            "updatedAt" = NOW()
        WHERE id = $3
      `, [userId, notes, req.params.id]);
        res.json({ message: 'Endorsement approved successfully' });
    }
    catch (error) {
        console.error('Failed to approve endorsement:', error);
        res.status(500).json({ error: 'Failed to approve endorsement' });
    }
});
// Reject endorsement (only senior roles)
router.post('/endorsements/:id/reject', authorize('UNDERWRITING_ADMIN', 'MANAGER_UNDERWRITING', 'HEAD_UNDERWRITING', 'SENIOR_UNDERWRITING_OFFICER', 'MASTER_ADMIN'), async (req, res) => {
    try {
        const { reason } = req.body;
        const userId = req.user?.id;
        await pool.query(`
        UPDATE endorsements 
        SET status = 'REJECTED',
            "reviewedBy" = $1,
            "reviewedAt" = NOW(),
            notes = $2,
            "updatedAt" = NOW()
        WHERE id = $3
      `, [userId, reason, req.params.id]);
        res.json({ message: 'Endorsement rejected' });
    }
    catch (error) {
        console.error('Failed to reject endorsement:', error);
        res.status(500).json({ error: 'Failed to reject endorsement' });
    }
});
// ==================== UNDERWRITING STATS ====================
router.get('/stats', authorize(...UNDERWRITING_ROLES), async (req, res) => {
    try {
        // Policies pending underwriting review
        const pendingReviews = await pool.query(`SELECT COUNT(*) FROM policies WHERE status IN ('PENDING_UNDERWRITING', 'SUBMITTED')`);
        // Policies pending final approval (customer accepted)
        const pendingFinalApprovals = await pool.query(`SELECT COUNT(*) FROM policies WHERE status = 'PENDING_FINAL_APPROVAL'`);
        // Pending endorsements
        let pendingEndorsements = { rows: [{ count: '0' }] };
        try {
            pendingEndorsements = await pool.query(`SELECT COUNT(*) FROM endorsements WHERE status = 'PENDING'`);
        }
        catch (err) {
            console.log('Endorsements table not yet created');
        }
        // Policies created this month
        const policiesThisMonth = await pool.query(`
        SELECT COUNT(*) FROM policies 
        WHERE DATE_TRUNC('month', "createdAt") = DATE_TRUNC('month', CURRENT_DATE)
      `);
        // Total active policies
        const totalActivePolicies = await pool.query(`SELECT COUNT(*) FROM policies WHERE status = 'ACTIVE'`);
        // Rejected policies
        const rejectedPolicies = await pool.query(`SELECT COUNT(*) FROM policies WHERE status IN ('REJECTED', 'REJECTED_BY_CUSTOMER')`);
        res.json({
            pendingReviews: parseInt(pendingReviews.rows[0]?.count || '0'),
            pendingFinalApprovals: parseInt(pendingFinalApprovals.rows[0]?.count || '0'),
            pendingEndorsements: parseInt(pendingEndorsements.rows[0]?.count || '0'),
            policiesThisMonth: parseInt(policiesThisMonth.rows[0]?.count || '0'),
            totalActivePolicies: parseInt(totalActivePolicies.rows[0]?.count || '0'),
            rejectedPolicies: parseInt(rejectedPolicies.rows[0]?.count || '0'),
            approvalRate: totalActivePolicies.rows[0]?.count > 0
                ? Math.round((parseInt(totalActivePolicies.rows[0].count) /
                    (parseInt(totalActivePolicies.rows[0].count) + parseInt(rejectedPolicies.rows[0].count))) * 100)
                : 0
        });
    }
    catch (error) {
        console.error('Failed to fetch underwriting stats:', error);
        res.json({
            pendingReviews: 0,
            pendingFinalApprovals: 0,
            pendingEndorsements: 0,
            policiesThisMonth: 0,
            totalActivePolicies: 0,
            rejectedPolicies: 0,
            approvalRate: 0
        });
    }
});
export default router;
