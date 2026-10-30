import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { PaymentProviderFactory } from '../../services/payment/PaymentProviderFactory.js';

const router = Router();

// ---------------------------------------------------------------------------
// Helper: Generate payment reference number
// Format: AHO-YYYYMMDD-XXXX (e.g., AHO-20260127-0001)
// ---------------------------------------------------------------------------
async function generateReference(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `AHO-${dateStr}-`;
  
  const result = await pool.query(
    `SELECT reference FROM payment_references 
     WHERE reference LIKE $1 
     ORDER BY "createdAt" DESC LIMIT 1`,
    [prefix + '%']
  );
  
  let nextNumber = 1;
  if (result.rows.length > 0) {
    const parts = result.rows[0].reference.split('-');
    if (parts.length === 3) {
      nextNumber = parseInt(parts[2]) + 1;
    }
  }
  
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

// ---------------------------------------------------------------------------
// POST /generate-reference – Generate payment reference
// ---------------------------------------------------------------------------
router.post('/generate-reference', authenticate, authorize(
  'SUPERVISOR_UNDERWRITING',
  'UNDERWRITING_MANAGER',
  'HEAD_UNDERWRITING',
  'UNDERWRITING_ADMIN',
  'MANAGER_CLAIMS',
  'HEAD_CLAIMS',
  'CLAIMS_ADMIN',
  'MASTER_ADMIN'
), async (req: any, res: any) => {
  const client = await pool.connect();
  try {
    const { policyId, claimId, amount, description, customerPhone, customerEmail } = req.body;
    const userId = req.user.id;

    // Validate server-controlled payment inputs.
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    if (numericAmount > 100000000) {
      return res.status(400).json({ error: 'Amount exceeds the permitted limit' });
    }
    if (!policyId && !claimId) {
      return res.status(400).json({ error: 'A policy or claim is required' });
    }
    if (policyId && claimId) {
      return res.status(400).json({ error: 'Provide either policyId or claimId, not both' });
    }

    // The financial amount must come from the authoritative business object,
    // not from an arbitrary client-supplied amount.
    if (policyId) {
      const policyCheck = await client.query(
        'SELECT id, "userId", status, "premiumAmount" FROM policies WHERE id = $1',
        [policyId]
      );
      if (policyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      const policy = policyCheck.rows[0];
      if (policy.status !== 'REVIEWED') {
        return res.status(400).json({ error: 'Policy must be in REVIEWED status' });
      }

      const authorizedStaff = ['SUPERVISOR_UNDERWRITING', 'UNDERWRITING_MANAGER', 'HEAD_UNDERWRITING', 'UNDERWRITING_ADMIN', 'MASTER_ADMIN'].includes(req.user.role);
      if (!authorizedStaff && policy.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (policy.premiumAmount != null && Math.abs(Number(policy.premiumAmount) - numericAmount) > 0.01) {
        return res.status(400).json({ error: 'Payment amount does not match the policy premium' });
      }
    }

    if (claimId) {
      const claimCheck = await client.query(
        'SELECT id, "userId", status, "approvedAmount" FROM claims WHERE id = $1',
        [claimId]
      );
      if (claimCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Claim not found' });
      }

      const claim = claimCheck.rows[0];
      const authorizedStaff = ['MANAGER_CLAIMS', 'HEAD_CLAIMS', 'CLAIMS_ADMIN', 'MASTER_ADMIN'].includes(req.user.role);
      if (!authorizedStaff && claim.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (claim.approvedAmount == null || Number(claim.approvedAmount) <= 0) {
        return res.status(400).json({ error: 'Claim does not have an approved payment amount' });
      }
      if (Math.abs(Number(claim.approvedAmount) - numericAmount) > 0.01) {
        return res.status(400).json({ error: 'Payment amount does not match the approved claim amount' });
      }
    }

    // Generate unique reference
    const reference = await generateReference();

    await client.query('BEGIN');

    // Create payment reference record
    await client.query(
      `INSERT INTO payment_references (
        id, reference, "policyId", "claimId", amount, description,
        status, "generatedBy", "customerPhone", "customerEmail",
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5,
        'PENDING', $6, $7, $8, NOW(), NOW()
      )`,
      [
        reference,
        policyId || null,
        claimId || null,
        numericAmount,
        description || 'Insurance Payment',
        userId,
        customerPhone || null,
        customerEmail || null,
      ]
    );

    // Update policy status
    if (policyId) {
      await client.query(
        `UPDATE policies 
         SET status = 'PENDING_PAYMENT', 
             "paymentReference" = $1, 
             "updatedAt" = NOW() 
         WHERE id = $2`,
        [reference, policyId]
      );

      // Add timeline
      await client.query(
        `INSERT INTO policy_timeline (id, "policyId", status, note, "changedBy", "createdAt")
         VALUES (gen_random_uuid(), $1, 'PENDING_PAYMENT', $2, $3, NOW())`,
        [policyId, `Payment reference generated: ${reference} for ETB ${amount}`, userId]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Payment reference generated successfully',
      reference,
      amount,
      description,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Generate reference error:', error);
    res.status(500).json({ error: 'Failed to generate payment reference' });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// GET /references – Get all payment references (staff)
// ---------------------------------------------------------------------------
router.get('/references', authenticate, authorize(
  'SUPERVISOR_UNDERWRITING', 'UNDERWRITING_MANAGER', 'HEAD_UNDERWRITING',
  'MANAGER_CLAIMS', 'HEAD_CLAIMS', 'CLAIMS_ADMIN', 'MASTER_ADMIN'
), async (req: any, res: any) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT 
        pr.*,
        p."policyNumber",
        c."claimNumber",
        CONCAT(u."firstName", ' ', u."lastName") as "generatedByName"
      FROM payment_references pr
      LEFT JOIN policies p ON p.id = pr."policyId"
      LEFT JOIN claims c ON c.id = pr."claimId"
      LEFT JOIN users u ON u.id = pr."generatedBy"
    `;
    
    const params: any[] = [];
    if (status) {
      query += ` WHERE pr.status = $1`;
      params.push(status);
    }
    
    query += ` ORDER BY pr."createdAt" DESC LIMIT 100`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch references error:', error);
    res.json([]);
  }
});

// ---------------------------------------------------------------------------
// GET /lookup/:reference – Public reference lookup
// ---------------------------------------------------------------------------
router.get('/lookup/:reference', async (req: any, res: any) => {
  try {
    const { reference } = req.params;

    const result = await pool.query(
      `SELECT 
        pr.reference, pr.amount, pr.description, pr.status,
        pr."createdAt", pr."paidAt",
        p."policyNumber",
        c."claimNumber"
       FROM payment_references pr
       LEFT JOIN policies p ON p.id = pr."policyId"
       LEFT JOIN claims c ON c.id = pr."claimId"
       WHERE pr.reference = $1`,
      [reference]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment reference not found' });
    }

    const payment = result.rows[0];
    const createdAt = new Date(payment.createdAt);
    const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    res.json({
      ...payment,
      isExpired: daysSinceCreation > 7,
      expiresAt: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Payment lookup error:', error);
    res.status(500).json({ error: 'Failed to look up payment' });
  }
});

// ---------------------------------------------------------------------------
// GET /my-references – Customer's payment references
// ---------------------------------------------------------------------------
router.get('/my-references', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT pr.*, p."policyNumber", c."claimNumber"
       FROM payment_references pr
       LEFT JOIN policies p ON p.id = pr."policyId"
       LEFT JOIN claims c ON c.id = pr."claimId"
       WHERE p."userId" = $1 OR c."userId" = $1
       ORDER BY pr."createdAt" DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('My references error:', error);
    res.json([]);
  }
});

// ---------------------------------------------------------------------------
// POST /webhook/:provider – Payment provider webhook
// ---------------------------------------------------------------------------
router.post('/webhook/:provider', async (req: any, res: any) => {
  try {
    const { provider } = req.params;
    const payload = req.body;

    console.log(`[Webhook] ${provider}:`, JSON.stringify(payload).substring(0, 300));

    // Extract reference from provider-specific payload
    let reference = payload.reference || payload.outTradeNo || payload.tx_ref || '';
    const transactionId = payload.transactionId || payload.tradeNo || '';
    const paidAmount = parseFloat(payload.amount || payload.totalAmount || '0');
    const isSuccess = 
      payload.status === 'success' || 
      payload.status === 'SUCCESS' || 
      payload.tradeState === 'SUCCESS';

    if (!reference) {
      return res.status(400).json({ error: 'Reference not found in payload' });
    }

    if (isSuccess) {
      // Never trust an unauthenticated webhook payload to establish a financial state.
      // Re-verify the transaction directly with the configured provider.
      if (!['telebirr', 'chapa'].includes(provider)) {
        return res.status(400).json({ error: 'Unsupported payment provider' });
      }

      const paymentProvider = PaymentProviderFactory.getProvider(provider as 'telebirr' | 'chapa');
      const verified = await paymentProvider.verifyPayment(reference);
      if (verified.status !== 'success') {
        return res.status(400).json({ error: 'Payment could not be verified with provider' });
      }

      const refResult = await pool.query(
        `SELECT "policyId", "claimId", amount, status
         FROM payment_references WHERE reference = $1 FOR UPDATE`,
        [reference]
      );
      if (refResult.rows.length === 0) {
        return res.status(404).json({ error: 'Payment reference not found' });
      }

      const payment = refResult.rows[0];
      const verifiedAmount = Number(verified.amount ?? paidAmount);
      if (!Number.isFinite(verifiedAmount) || Math.abs(verifiedAmount - Number(payment.amount)) > 0.01) {
        return res.status(400).json({ error: 'Verified payment amount does not match the payment reference' });
      }

      if (payment.status === 'PAID') {
        return res.json({ success: true, duplicate: true });
      }

      await pool.query(
        `UPDATE payment_references 
         SET status = 'PAID',
             "transactionId" = $1,
             provider = $2,
             "paidAmount" = $3,
             "paidAt" = NOW(),
             "updatedAt" = NOW()
         WHERE reference = $4 AND status = 'PENDING'`,
        [verified.transactionId || transactionId, provider, verifiedAmount, reference]
      );

      // Update the related business object only after provider verification.
      if (payment.policyId) {
        await pool.query(
          `UPDATE policies SET status = 'PAYMENT_RECEIVED', "updatedAt" = NOW()
           WHERE id = $1 AND status = 'PENDING_PAYMENT'`,
          [payment.policyId]
        );
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;