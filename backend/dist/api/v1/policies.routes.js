import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { generatePolicyNumber } from '../../lib/numbering.js';
const router = Router();
router.use(authenticate);
// ==================== HELPER FUNCTIONS ====================
// Get product by code from database
async function getProductByCode(code) {
    try {
        const result = await pool.query(`SELECT id, code, name, description, "customFields", "isActive" 
       FROM products WHERE code = $1`, [code.toUpperCase()]);
        return result.rows[0] || null;
    }
    catch (error) {
        console.warn(`Product lookup failed for ${code}:`, error);
        return null;
    }
}
// Get product custom fields
async function getProductCustomFields(productCode) {
    const product = await getProductByCode(productCode);
    if (!product)
        return [];
    try {
        const fields = typeof product.customFields === 'string'
            ? JSON.parse(product.customFields)
            : product.customFields;
        return Array.isArray(fields) ? fields : [];
    }
    catch {
        return [];
    }
}
// Build risk objects based on product type and custom fields
function buildRiskObjects(type, productDetails, vehicles) {
    const upperType = type?.toUpperCase() || 'GENERIC';
    switch (upperType) {
        case 'MOTOR':
        case 'MTCM':
        case 'AUTO':
            return (vehicles && vehicles.length > 0 ? vehicles : []).map(v => ({
                riskType: 'VEHICLE',
                make: v.make || '',
                model: v.model || '',
                yearOfMake: v.yearOfMake || v.year || '',
                plateNumber: v.plateNumber || v.registrationNumber || '',
                engineNumber: v.engineNumber || '',
                chassisNumber: v.chassisNumber || '',
                vehicleType: v.vehicleType || '',
                usage: v.usage || '',
                vehicleValue: v.vehicleValue || 0,
            }));
        case 'HEALTH':
            if (productDetails?.insuredPersons && Array.isArray(productDetails.insuredPersons)) {
                return productDetails.insuredPersons.map(p => ({
                    riskType: 'PERSON',
                    fullName: p.fullName || p.name || '',
                    dateOfBirth: p.dateOfBirth || '',
                    gender: p.gender || '',
                    age: p.age || '',
                    relationship: p.relationship || 'Self',
                    medicalConditions: p.medicalConditions || p.preExistingConditions || '',
                }));
            }
            return [{
                    riskType: 'PERSON',
                    fullName: productDetails?.policyHolderName || '',
                    age: productDetails?.patientAge || '',
                    gender: productDetails?.patientGender || '',
                    relationship: 'Self',
                }];
        case 'LIFE':
            return [{
                    riskType: 'PERSON',
                    fullName: productDetails?.insuredName || productDetails?.policyHolderName || '',
                    dateOfBirth: productDetails?.insuredDob || '',
                    gender: productDetails?.insuredGender || '',
                    beneficiaryName: productDetails?.beneficiaryName || '',
                    beneficiaryRelationship: productDetails?.beneficiaryRelationship || '',
                    beneficiaryPhone: productDetails?.beneficiaryPhone || '',
                }];
        case 'FIRE':
        case 'PROPERTY':
        case 'HOME':
            if (productDetails?.properties && Array.isArray(productDetails.properties)) {
                return productDetails.properties.map(p => ({
                    riskType: 'PROPERTY',
                    propertyAddress: p.propertyAddress || p.address || '',
                    propertyType: p.propertyType || '',
                    constructionType: p.constructionType || '',
                    yearBuilt: p.yearBuilt || '',
                    numberOfFloors: p.numberOfFloors || '',
                    propertyValue: p.propertyValue || p.estimatedValue || 0,
                }));
            }
            return [{
                    riskType: 'PROPERTY',
                    propertyAddress: productDetails?.propertyAddress || '',
                    propertyType: productDetails?.propertyType || '',
                    propertyValue: productDetails?.propertyValue || 0,
                }];
        case 'TRAVEL':
            if (productDetails?.trips && Array.isArray(productDetails.trips)) {
                return productDetails.trips.map(t => ({
                    riskType: 'TRIP',
                    destination: t.destination || '',
                    departureDate: t.departureDate || t.travelDate || '',
                    returnDate: t.returnDate || '',
                    tripDuration: t.tripDuration || '',
                    numberOfTravelers: t.numberOfTravelers || 1,
                    travelPurpose: t.travelPurpose || '',
                }));
            }
            return [{
                    riskType: 'TRIP',
                    destination: productDetails?.destination || '',
                    travelDate: productDetails?.travelDate || '',
                    returnDate: productDetails?.returnDate || '',
                }];
        case 'MARINE':
            if (productDetails?.cargo && Array.isArray(productDetails.cargo)) {
                return productDetails.cargo.map(c => ({
                    riskType: 'CARGO',
                    cargoType: c.cargoType || '',
                    cargoDescription: c.description || '',
                    cargoValue: c.cargoValue || c.value || 0,
                    origin: c.origin || '',
                    destination: c.destination || '',
                    vesselName: c.vesselName || '',
                }));
            }
            return [{
                    riskType: 'CARGO',
                    cargoType: productDetails?.cargoType || '',
                    cargoValue: productDetails?.cargoValue || 0,
                }];
        default:
            // Generic: try to extract any risk objects from productDetails
            return productDetails?.riskObjects || [];
    }
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
    catch {
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
    catch {
        return 0.01;
    }
}
// ========================================================================
// ROUTES
// ========================================================================
// GET all policies
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        p.*,
        pr.name as "productName"
      FROM policies p
      LEFT JOIN products pr ON pr.code = p.type
      ORDER BY p."createdAt" DESC LIMIT 100
    `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('[Policies] Fetch all error:', error.message);
        res.status(500).json({ error: 'Failed to fetch policies', detail: error.message });
    }
});
// GET policy stats
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
// GET my policies
router.get('/my-policies', async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(`
      SELECT 
        p.id, p."policyNumber", p.type, p."coverageAmount", p.premium,
        p.status, p."createdAt", p."effectiveDate", p."expirationDate",
        p."policyDocumentPath", p."adjustedPremium", p."totalPremium",
        pr.name as "productName"
      FROM policies p
      LEFT JOIN products pr ON pr.code = p.type
      WHERE p."userId" = $1
      ORDER BY p."createdAt" DESC
    `, [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('[Policies] My-policies error:', error.message);
        res.status(500).json({ error: 'Failed to fetch policies', detail: error.message });
    }
});
// GET pending decision (for customer)
router.get('/pending-decision', async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(`
      SELECT 
        p.id, p."policyNumber", p.type, p."coverageAmount",
        p.premium as "originalPremium", p."adjustedPremium",
        p."underwriterNotes", p.status, p."updatedAt",
        pr.name as "productName"
      FROM policies p
      LEFT JOIN products pr ON pr.code = p.type
      WHERE p."userId" = $1 AND p.status = 'AWAITING_CUSTOMER_APPROVAL'
      ORDER BY p."updatedAt" DESC
    `, [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Failed to fetch pending decisions:', error);
        res.json([]);
    }
});
// GET perils for product
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
    }
    catch (error) {
        console.error('Failed to fetch perils:', error);
        res.json([]);
    }
});
// GET riders for product
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
    }
    catch (error) {
        console.error('Failed to fetch riders:', error);
        res.json([]);
    }
});
// GET product custom fields (for dynamic forms)
router.get('/product-fields/:productCode', async (req, res) => {
    try {
        const { productCode } = req.params;
        const fields = await getProductCustomFields(productCode);
        res.json(fields);
    }
    catch (error) {
        console.error('Failed to fetch product fields:', error.message);
        res.status(500).json({ error: 'Failed to fetch product fields' });
    }
});
// POST calculate premium
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
                    const premium = peril.calculationType === 'PERCENTAGE' ? actualCoverage * parseFloat(peril.premiumRate) : parseFloat(peril.premiumRate);
                    perilPremium += premium;
                    perilBreakdown.push({ id: perilId, name: peril.perilName || 'Unknown', premium });
                }
            }
            catch { /* ignore */ }
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
                    const premium = rider.calculationType === 'PERCENTAGE' ? actualCoverage * parseFloat(rider.premiumRate) : parseFloat(rider.premiumRate);
                    riderPremium += premium;
                    riderBreakdown.push({ id: riderId, name: rider.riderName || 'Unknown', premium });
                }
            }
            catch { /* ignore */ }
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
        console.error('Premium calculation failed:', error.message);
        res.status(500).json({ error: 'Failed to calculate premium', detail: error.message });
    }
});
// POST create policy
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, coverageAmount, premiumFrequency, effectiveDate, expirationDate, productDetails, vehicles = [], selectedPerils = [], selectedRiders = [] } = req.body;
        if (!type || !coverageAmount) {
            return res.status(400).json({ error: 'Missing required fields: type and coverageAmount' });
        }
        // Get product from database
        const product = await getProductByCode(type);
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
        // Build risk objects
        const riskObjects = buildRiskObjects(type, productDetails, vehicles);
        // Enhanced product details with risk objects and product name
        const enhancedProductDetails = {
            ...productDetails,
            riskObjects,
            productName: product?.name || type,
            productCode: product?.code || type,
            selectedPerils: perilDetails,
            selectedRiders: riderDetails,
        };
        const result = await pool.query(`
      INSERT INTO policies (
        id, "policyNumber", "userId", type, status, "coverageAmount", premium,
        "premiumFrequency", "effectiveDate", "expirationDate", "productDetails",
        "approvalType", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'PENDING_UNDERWRITING', $4, $5, $6, 
        $7::date, $8::date, $9::jsonb, 'REVIEW_NEEDED', NOW(), NOW()
      ) RETURNING id, "policyNumber", status
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
    }
    catch (error) {
        console.error('Failed to create policy:', error.message);
        res.status(500).json({ error: 'Failed to submit policy application', detail: error.message });
    }
});
// GET policy details with risk objects
router.get('/:id/details', async (req, res) => {
    try {
        const userId = req.user.id;
        const id = String(req.params.id);
        const result = await pool.query(`
      SELECT p.*, u."firstName", u."lastName", u.email, u.phone,
             pr.name as "productName", pr."customFields"
      FROM policies p
      JOIN users u ON u.id = p."userId"
      LEFT JOIN products pr ON pr.code = p.type
      WHERE p.id = $1 AND p."userId" = $2
    `, [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        const policy = result.rows[0];
        // Parse productDetails
        let productDetails = {};
        try {
            productDetails = typeof policy.productDetails === 'string' ? JSON.parse(policy.productDetails) : policy.productDetails;
        }
        catch { }
        // Parse custom fields
        let customFields = [];
        try {
            customFields = typeof policy.customFields === 'string' ? JSON.parse(policy.customFields) : policy.customFields;
        }
        catch { }
        // Get perils
        let selectedPerils = [];
        try {
            const perilsResult = await pool.query(`
        SELECT pe.id, pe."perilName", pe.description, pp."perilPremium" as premium
        FROM policy_perils pp
        JOIN perils pe ON pe.id = pp."perilId"
        WHERE pp."policyId" = $1
      `, [id]);
            selectedPerils = perilsResult.rows;
        }
        catch { }
        // Get riders
        let selectedRiders = [];
        try {
            const ridersResult = await pool.query(`
        SELECT r.id, r."riderName", r.description, pr."riderPremium" as premium
        FROM policy_riders pr
        JOIN riders r ON r.id = pr."riderId"
        WHERE pr."policyId" = $1
      `, [id]);
            selectedRiders = ridersResult.rows;
        }
        catch { }
        // Extract risk objects
        const riskObjects = productDetails.riskObjects || [];
        res.json({
            ...policy,
            productDetails,
            selectedPerils,
            selectedRiders,
            riskObjects,
            customFields,
        });
    }
    catch (error) {
        console.error('Failed to fetch policy details:', error.message);
        res.status(500).json({ error: 'Failed to fetch policy details', detail: error.message });
    }
});
// POST respond to offer
router.post('/:id/respond', async (req, res) => {
    try {
        const { decision, notes } = req.body;
        const policyId = req.params.id;
        const userId = req.user.id;
        const currentPolicy = await pool.query('SELECT * FROM policies WHERE id = $1 AND "userId" = $2', [policyId, userId]);
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
        catch {
            history = [];
        }
        history.push({ timestamp: new Date(), action: `CUSTOMER_${decision}`, notes, customer: userId });
        const newStatus = decision === 'ACCEPT' ? 'PENDING_FINAL_APPROVAL' : 'REJECTED_BY_CUSTOMER';
        await pool.query(`
      UPDATE policies SET "customerDecision"=$1, "customerDecisionDate"=NOW(), "customerDecisionNotes"=$2, 
      status=$3, premium=$4, "totalPremium"=$5, "negotiationHistory"=$6, "updatedAt"=NOW()
      WHERE id=$7
    `, [decision, notes || null, newStatus, finalBasePremium, finalTotalPremium, JSON.stringify(history), policyId]);
        res.json({ message: decision === 'ACCEPT' ? 'Offer accepted' : 'Offer rejected', status: newStatus });
    }
    catch (error) {
        console.error('Failed to process decision:', error);
        res.status(500).json({ error: 'Failed to process decision' });
    }
});
export default router;
