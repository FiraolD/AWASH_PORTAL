// backend/src/services/claimAssignment.service.ts
import pool from '../lib/db.js';
/**
 * Find the first matching assignment rule for a policy.
 * Logs all steps to help debug.
 */
export async function findMatchingRule(productType, amount) {
    console.log('[findMatchingRule] Received:', { productType, amount, typeofProduct: typeof productType, typeofAmount: typeof amount });
    // Ensure amount is a number
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        console.warn('[findMatchingRule] Amount is not a valid number:', amount);
        return null;
    }
    // Use 'ALL' if productType is null/undefined
    const typeForQuery = productType || 'ALL';
    console.log(`[findMatchingRule] Query: productType='${typeForQuery}', amount=${numericAmount}`);
    try {
        const result = await pool.query(`SELECT *
       FROM claims_assignment_rules
       WHERE is_active = true
         AND (product_type = $1 OR product_type = 'ALL')
         AND $2 >= min_amount
         AND (max_amount IS NULL OR $2 <= max_amount)
       ORDER BY priority ASC
       LIMIT 1`, [typeForQuery, numericAmount]);
        if (result.rows.length === 0) {
            console.log('[findMatchingRule] No rule found.');
            return null;
        }
        console.log('[findMatchingRule] Rule found:', result.rows[0]);
        return result.rows[0];
    }
    catch (error) {
        console.error('[findMatchingRule] Database error:', error);
        return null;
    }
}
/**
 * Assign a claim to the first available active officer with the required role.
 */
export async function assignClaimToOfficer(claimId, requiredRole) {
    console.log(`[assignClaimToOfficer] Searching for active officer with role: ${requiredRole}`);
    try {
        const result = await pool.query(`SELECT id
       FROM users
       WHERE role = $1 AND status = 'ACTIVE'
       ORDER BY last_login_at DESC NULLS LAST
       LIMIT 1`, [requiredRole]);
        if (result.rows.length === 0) {
            console.warn(`[assignClaimToOfficer] No active officer found for role: ${requiredRole}`);
            return null;
        }
        const officerId = result.rows[0].id;
        console.log(`[assignClaimToOfficer] Found officer: ${officerId}`);
        await pool.query(`UPDATE claims
       SET "assignedOfficer" = $1, "updatedAt" = NOW()
       WHERE id = $2`, [officerId, claimId]);
        console.log(`[assignClaimToOfficer] Claim ${claimId} assigned successfully.`);
        return officerId;
    }
    catch (error) {
        console.error('[assignClaimToOfficer] Error:', error);
        return null;
    }
}
