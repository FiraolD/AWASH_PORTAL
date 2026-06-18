import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
router.use(authenticate);

// Configure multer for file uploads
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

// Define claim officer roles
const CLAIM_ROLES = [
  'CLAIMS_ADMIN', 'CUSTOMER_ADMIN', 'MASTER_ADMIN',
  'CLAIM_OFFICER', 'CLAIM_OFFICER_I', 'CLAIM_OFFICER_II',
  'SENIOR_CLAIM_OFFICER', 'SUPERVISOR_CLAIMS', 'MANAGER_CLAIMS', 'HEAD_CLAIMS'
];

// Helper function to generate claim number
async function generateClaimNumber(productCode: string): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `CLND/AHO/${productCode || 'GEN'}/`;
  
  try {
    const result = await pool.query(`
      SELECT "claimNumber" FROM claims 
      WHERE "claimNumber" LIKE $1 
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `, [prefix + '%']);
    
    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0].claimNumber;
      const parts = lastNumber.split('/');
      const numPart = parts[parts.length - 2];
      if (numPart) {
        nextNumber = parseInt(numPart) + 1;
      }
    }
    // Helper function to extract product code from policy number
function extractProductCodeFromPolicyNumber(policyNumber: string): string {
    if (!policyNumber) return 'GEN';
    const parts = policyNumber.split('/');
    if (parts.length >= 2) {
        return parts[1]; // Return the product code part
    }
    return 'GEN';
}

// In your POST /claims endpoint, after getting the policy, extract the product code:
const policy = policyCheck.rows[0];
const productCode = extractProductCodeFromPolicyNumber(policy.policyNumber);
const claimNumber = await generateClaimNumber(productCode);
const paddedNumber = nextNumber.toString().padStart(6, '0');
    return `${prefix}${paddedNumber}/${year}`;
  } catch (error) {
    console.error('Error generating claim number:', error);
    // Fallback to timestamp-based number
    return `CLND/AHO/${productCode || 'GEN'}/${Date.now()}/${year}`;
  }
}

// ==================== CUSTOMER ENDPOINTS ====================

// GET /api/claims - Get my claims with vehicle details
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    console.log('Fetching claims for user:', userId);
    
    const result = await pool.query(`
      SELECT 
        c.id,
        c."claimNumber",
        c.status,
        c."incidentDate",
        c."incidentDescription",
        c."estimatedAmount",
        c."submittedDate",
        c."natureOfLoss",
        c."createdAt",
        c."updatedAt",
        c."location",
        c."riskItem",
        c."vehicleDamageDetails",
        c."witnessName",
        c."witnessPhone",
        c."driverFullName",
        c."driverLicenseNumber",
        c."roadConditions",
        c."weatherConditions",
        p."policyNumber",
        p.type as "policyType",
        p."productDetails"
      FROM claims c
      LEFT JOIN policies p ON p.id = c."policyId"
      WHERE c."userId" = $1
      ORDER BY c."submittedDate" DESC
    `, [userId]);
    
    // Parse vehicle details and format response
    const claimsWithDetails = result.rows.map(claim => {
      let vehicleDetails = null;
      let vehicles = [];
      
      if (claim.productDetails) {
        try {
          const productDetails = typeof claim.productDetails === 'string' 
            ? JSON.parse(claim.productDetails) 
            : claim.productDetails;
          
          // Extract all vehicles
          if (productDetails.vehicles && Array.isArray(productDetails.vehicles)) {
            vehicles = productDetails.vehicles.map((v: any) => ({
              make: v.make || null,
              model: v.model || null,
              year: v.year || v.yearOfMake || null,
              plateNumber: v.plateNumber || v.registrationNumber || null,
              engineNumber: v.engineNumber || null,
              chassisNumber: v.chassisNumber || null,
              vehicleType: v.vehicleType || null,
              vehicleValue: v.vehicleValue || null
            }));
            
            // Get first vehicle for quick reference
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
        } catch (e) {
          console.error('Error parsing productDetails for claim:', claim.id, e);
        }
      }
      
      // Remove productDetails from response
      delete claim.productDetails;
      
      return {
        ...claim,
        vehicleDetails,
        vehicles: vehicles.length > 0 ? vehicles : undefined
      };
    });
    
    console.log(`Found ${claimsWithDetails.length} claims for user ${userId}`);
    res.json(claimsWithDetails);
    
  } catch (error) {
    console.error('Failed to fetch claims:', error);
    res.status(500).json({ 
      error: 'Failed to fetch claims', 
      details: error.message 
    });
  }
});

// POST /api/claims - Create new claim
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log('=== CREATING NEW CLAIM ===');
    console.log('User ID:', userId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      policyId,
      productType,
      productCode = 'GEN',
      riskItem,
      incidentDate,
      timeOfAccident,
      incidentDescription,
      location,
      estimatedAmount,
      natureOfLoss,
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
    
    // Validate required fields
    if (!policyId) {
      return res.status(400).json({ error: 'Policy ID is required' });
    }
    if (!incidentDate) {
      return res.status(400).json({ error: 'Incident date is required' });
    }
    if (!incidentDescription) {
      return res.status(400).json({ error: 'Incident description is required' });
    }
    if (!natureOfLoss) {
      return res.status(400).json({ error: 'Nature of loss is required' });
    }
    
    // Verify policy belongs to user
    const policyCheck = await pool.query(
      'SELECT id, "policyNumber", type FROM policies WHERE id = $1 AND "userId" = $2',
      [policyId, userId]
    );
    
    if (policyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found or does not belong to you' });
    }
    
    const policy = policyCheck.rows[0];
    const actualProductCode = productCode || (policy.type === 'AUTO' ? 'AUTO' : 
                              policy.type === 'HOME' ? 'HOME' : 
                              policy.type === 'LIFE' ? 'LIFE' : 
                              policy.type === 'HEALTH' ? 'HLTH' : 'GEN');
    
    // Generate claim number
    const claimNumber = await generateClaimNumber(actualProductCode);
    console.log('Generated claim number:', claimNumber);
    
    // Prepare injured persons JSON
    const injuredPersonsJson = injuredPersons && Array.isArray(injuredPersons) && injuredPersons.length > 0 
      ? JSON.stringify(injuredPersons) 
      : null;
    
    // Insert claim - using the correct column names from your database
    const result = await pool.query(`
      INSERT INTO claims (
        id,
        "claimNumber",
        "policyId",
        "userId",
        status,
        "riskItem",
        "incidentDate",
        "timeOfAccident",
        "incidentDescription",
        location,
        "natureOfLoss",
        "estimatedAmount",
        "witnessName",
        "witnessPhone",
        "witnessStatement",
        "driverFullName",
        "driverAge",
        "driverOccupation",
        "driverLicenseNumber",
        "driverLicenseIssueDate",
        "driverLicenseExpiryDate",
        "vehicleDamageDetails",
        "injuredPersons",
        "roadConditions",
        "weatherConditions",
        "responsibleParty",
        "submittedDate",
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid()::text,
        $1, $2, $3, 'SUBMITTED',
        $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24,
        NOW(), NOW(), NOW()
      ) RETURNING id, "claimNumber"
    `, [
      claimNumber, policyId, userId,
      riskItem || null, incidentDate, timeOfAccident || null, incidentDescription,
      location || null, natureOfLoss, estimatedAmount ? parseFloat(estimatedAmount) : null,
      witnessName || null, witnessPhone || null, witnessStatement || null,
      driverFullName || null, driverAge ? parseInt(driverAge) : null, driverOccupation || null,
      driverLicenseNumber || null, driverLicenseIssueDate || null, driverLicenseExpiryDate || null,
      vehicleDamageDetails || null, injuredPersonsJson,
      roadConditions || null, weatherConditions || null, responsibleParty || null
    ]);
    
    console.log('Claim created successfully:', result.rows[0]);
    
    res.status(201).json({
      message: 'Claim submitted successfully',
      claimNumber: result.rows[0].claimNumber,
      claimId: result.rows[0].id
    });
    
  } catch (error) {
    console.error('Failed to create claim:', error);
    res.status(500).json({ error: 'Failed to create claim', details: error.message });
  }
});
// GET /api/claims/:id/documents/:documentId/download - Download document
router.get('/:id/documents/:documentId/download', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { id: claimId, documentId } = req.params;
    
    // Check if user has access to this claim
    const claimResult = await pool.query(
      'SELECT "userId" FROM claims WHERE id = $1',
      [claimId]
    );
    
    if (claimResult.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    const claim = claimResult.rows[0];
    const isAdmin = CLAIM_ROLES.includes(userRole) || userRole === 'MASTER_ADMIN';
    
    if (!isAdmin && claim.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get document info
    const documentResult = await pool.query(
      'SELECT * FROM claim_documents WHERE id = $1 AND "claimId" = $2',
      [documentId, claimId]
    );
    
    if (documentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = documentResult.rows[0];
    const filePath = document.documentUrl;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    // Set appropriate headers for download
    res.setHeader('Content-Type', document.documentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.documentName)}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Failed to download document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// GET /api/claims/:id/documents/:documentId/view - View document inline
router.get('/:id/documents/:documentId/view', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { id: claimId, documentId } = req.params;
    
    // Check if user has access to this claim
    const claimResult = await pool.query(
      'SELECT "userId" FROM claims WHERE id = $1',
      [claimId]
    );
    
    if (claimResult.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    const claim = claimResult.rows[0];
    const isAdmin = CLAIM_ROLES.includes(userRole) || userRole === 'MASTER_ADMIN';
    
    if (!isAdmin && claim.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get document info
    const documentResult = await pool.query(
      'SELECT * FROM claim_documents WHERE id = $1 AND "claimId" = $2',
      [documentId, claimId]
    );
    
    if (documentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = documentResult.rows[0];
    const filePath = document.documentUrl;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    // Set appropriate headers for inline viewing
    const mimeType = getMimeType(filePath);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.documentName)}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Failed to view document:', error);
    res.status(500).json({ error: 'Failed to view document' });
  }
});

// Helper function to get MIME type
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// GET /api/claims/:id/documents - Get all documents for a claim
router.get('/:id/documents', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { id: claimId } = req.params;
    
    // Check if user has access to this claim
    const claimResult = await pool.query(
      'SELECT "userId" FROM claims WHERE id = $1',
      [claimId]
    );
    
    if (claimResult.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    const claim = claimResult.rows[0];
    const isAdmin = CLAIM_ROLES.includes(userRole) || userRole === 'MASTER_ADMIN';
    
    if (!isAdmin && claim.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get all documents for this claim
    const result = await pool.query(`
      SELECT 
        id,
        "documentName",
        "documentUrl",
        "documentType",
        "fileSize",
        "uploadedAt",
        "createdAt"
      FROM claim_documents
      WHERE "claimId" = $1
      ORDER BY "createdAt" DESC
    `, [claimId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});
// GET /api/claims/queue - Get claim queue
router.get('/queue', authorize(...CLAIM_ROLES), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c."claimNumber",
        c.status,
        c."incidentDate",
        c."estimatedAmount",
        c."submittedDate",
        c."natureOfLoss",
        u."firstName",
        u."lastName",
        u.email,
        u.phone,
        p."policyNumber",
        p.type
      FROM claims c
      LEFT JOIN users u ON u.id = c."userId"
      LEFT JOIN policies p ON p.id = c."policyId"
      WHERE c.status IN ('SUBMITTED', 'UNDER_REVIEW')
      ORDER BY c."submittedDate" ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch claim queue:', error);
    res.status(500).json({ error: 'Failed to fetch claim queue' });
  }
});

// GET /api/claims/queue/stats - Get queue statistics
router.get('/queue/stats', authorize(...CLAIM_ROLES), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'SUBMITTED') as pending,
        COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') as "underReview",
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
        COUNT(*) FILTER (WHERE status = 'PAID') as paid,
        COUNT(*) as total
      FROM claims
    `);
    
    const stats = result.rows[0];
    Object.keys(stats).forEach(key => {
      stats[key] = parseInt(stats[key]) || 0;
    });
    
    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch queue stats:', error);
    res.status(500).json({ error: 'Failed to fetch queue statistics' });
  }
});

// GET /api/claims/active - Get active claims
router.get('/active', authorize('CLAIMS_ADMIN', 'CUSTOMER_ADMIN', 'MASTER_ADMIN', 'MANAGER_CLAIMS', 'HEAD_CLAIMS'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c."claimNumber",
        c.status,
        c."incidentDate",
        c."estimatedAmount",
        c."approvedAmount",
        c."submittedDate",
        u."firstName",
        u."lastName",
        u.email,
        p."policyNumber",
        p.type
      FROM claims c
      LEFT JOIN users u ON u.id = c."userId"
      LEFT JOIN policies p ON p.id = c."policyId"
      WHERE c.status IN ('APPROVED', 'IN_PROGRESS', 'PAID')
      ORDER BY c."updatedAt" DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch active claims:', error);
    res.status(500).json({ error: 'Failed to fetch active claims' });
  }
});

// GET /api/claims/pending-review - Get claims pending officer review
router.get('/pending-review', authorize(...CLAIM_ROLES), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c."claimNumber",
        c.status,
        c."incidentDate",
        c."estimatedAmount",
        c."submittedDate",
        c."natureOfLoss",
        c."riskItem",
        c.location,
        c."incidentDescription",
        u."firstName",
        u."lastName",
        u.email,
        u.phone,
        p."policyNumber",
        p.type
      FROM claims c
      LEFT JOIN users u ON u.id = c."userId"
      LEFT JOIN policies p ON p.id = c."policyId"
      WHERE c.status = 'SUBMITTED'
      ORDER BY c."submittedDate" ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch pending claims:', error);
    res.status(500).json({ error: 'Failed to fetch pending claims' });
  }
});

// POST /api/claims/:id/review - Review claim
router.post('/:id/review', authorize(...CLAIM_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const officerName = `${req.user?.firstName} ${req.user?.lastName}`;
    const { proximateCause, officerRemarks, estimatedLoss, claimStatus } = req.body;
    
    await pool.query(`
      UPDATE claims SET
        "proximateCause" = $1,
        "officerRemarks" = $2,
        "estimatedAmount" = COALESCE($3, "estimatedAmount"),
        status = $4,
        "reviewedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE id = $5
    `, [proximateCause, officerRemarks, estimatedLoss, claimStatus, id]);
    
    res.json({ message: 'Claim reviewed successfully', status: claimStatus });
  } catch (error) {
    console.error('Failed to review claim:', error);
    res.status(500).json({ error: 'Failed to review claim' });
  }
});

// GET /api/claims/:id - Get claim details
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const result = await pool.query(`
      SELECT 
        c.*,
        u."firstName",
        u."lastName",
        u.email,
        u.phone,
        u.address,
        p."policyNumber",
        p.type as "policyType",
        p."coverageAmount",
        p.premium,
        p."effectiveDate",
        p."expirationDate",
        p."productDetails"
      FROM claims c
      LEFT JOIN users u ON u.id = c."userId"
      LEFT JOIN policies p ON p.id = c."policyId"
      WHERE c.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    const claim = result.rows[0];
    const isAdmin = CLAIM_ROLES.includes(userRole) || userRole === 'MASTER_ADMIN';
    
    if (!isAdmin && claim.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Parse vehicle details
    let vehicleDetails = null;
    let vehicles = [];
    if (claim.productDetails) {
      try {
        const productDetails = typeof claim.productDetails === 'string' 
          ? JSON.parse(claim.productDetails) 
          : claim.productDetails;
        
        if (productDetails.vehicles && productDetails.vehicles.length > 0) {
          vehicles = productDetails.vehicles;
          const firstVehicle = vehicles[0];
          vehicleDetails = {
            make: firstVehicle.make,
            model: firstVehicle.model,
            year: firstVehicle.year || firstVehicle.yearOfMake,
            plateNumber: firstVehicle.plateNumber || firstVehicle.registrationNumber,
            engineNumber: firstVehicle.engineNumber,
            chassisNumber: firstVehicle.chassisNumber,
            vehicleType: firstVehicle.vehicleType,
            vehicleValue: firstVehicle.vehicleValue
          };
        }
      } catch (e) {
        console.error('Error parsing productDetails:', e);
      }
    }
    
    // Parse injured persons if stored as JSON
    let injuredPersons = [];
    if (claim.injuredPersons) {
      try {
        injuredPersons = typeof claim.injuredPersons === 'string' 
          ? JSON.parse(claim.injuredPersons) 
          : claim.injuredPersons;
      } catch (e) {
        injuredPersons = [];
      }
    }
    
    delete claim.productDetails;
    
    res.json({
      ...claim,
      vehicleDetails,
      vehicles,
      injuredPersons
    });
  } catch (error) {
    console.error('Failed to fetch claim:', error);
    res.status(500).json({ error: 'Failed to fetch claim' });
  }
});

// PATCH /api/claims/:id/status - Update claim status
router.patch('/:id/status', authorize(...CLAIM_ROLES), async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    await pool.query(`
      UPDATE claims 
      SET status = $1, "updatedAt" = NOW()
      WHERE id = $2
    `, [status, req.params.id]);
    
    res.json({ message: `Claim ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Failed to update claim status:', error);
    res.status(500).json({ error: 'Failed to update claim status' });
  }
});

// POST /api/claims/:id/documents - Upload documents
router.post('/:id/documents', upload.array('documents', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    const userId = req.user?.id;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const documents = [];
    for (const file of files) {
      const result = await pool.query(`
        INSERT INTO claim_documents (
          id, 
          "claimId", 
          "documentName", 
          "documentUrl", 
          "documentType", 
          "uploadedBy", 
          "fileSize",
          "uploadedAt",
          "createdAt"
        ) VALUES (
          gen_random_uuid()::text, 
          $1, $2, $3, $4, $5, $6, NOW(), NOW()
        ) RETURNING *
      `, [
        id,                           // claimId
        file.originalname,            // documentName
        file.path,                    // documentUrl
        file.mimetype || 'application/octet-stream', // documentType
        userId,                       // uploadedBy
        file.size                     // fileSize
      ]);
      
      documents.push(result.rows[0]);
    }
    
    res.status(201).json({ 
      message: 'Documents uploaded successfully', 
      documents: documents.map(doc => ({
        id: doc.id,
        documentName: doc.documentName,
        documentType: doc.documentType,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt
      }))
    });
  } catch (error) {
    console.error('Failed to upload documents:', error);
    res.status(500).json({ error: 'Failed to upload documents', details: error.message });
  }
});

// GET /api/claims/stats/summary - Get statistics
router.get('/stats/summary', authorize(...CLAIM_ROLES), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'SUBMITTED') as pending,
        COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') as "underReview",
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
        COUNT(*) FILTER (WHERE status = 'PAID') as paid
      FROM claims
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;