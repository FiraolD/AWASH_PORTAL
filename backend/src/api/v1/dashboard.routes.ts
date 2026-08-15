import { Router } from 'express';
import pool from '../../lib/db.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount);
};

// Get dashboard stats based on user role - SIMPLIFIED VERSION
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    
    console.log('Fetching dashboard stats for role:', userRole);
    
    // MASTER_ADMIN Dashboard
    if (userRole === 'MASTER_ADMIN') {
      // Run queries one by one to avoid complex joins that might fail
      const totalCustomers = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'CUSTOMER'");
      const totalPolicies = await pool.query("SELECT COUNT(*) as count FROM policies");
      const totalClaims = await pool.query("SELECT COUNT(*) as count FROM claims");
      const totalPremium = await pool.query("SELECT COALESCE(SUM(premium), 0) as total FROM policies WHERE status = 'ACTIVE'");
      const activePolicies = await pool.query("SELECT COUNT(*) as count FROM policies WHERE status = 'ACTIVE'");
      const pendingClaims = await pool.query("SELECT COUNT(*) as count FROM claims WHERE status = 'SUBMITTED'");
      const totalProducts = await pool.query("SELECT COUNT(*) as count FROM products");
      
      res.json({
        totalCustomers: parseInt(totalCustomers.rows[0].count),
        totalPolicies: parseInt(totalPolicies.rows[0].count),
        totalClaims: parseInt(totalClaims.rows[0].count),
        totalPremium: parseFloat(totalPremium.rows[0].total),
        activePolicies: parseInt(activePolicies.rows[0].count),
        pendingClaims: parseInt(pendingClaims.rows[0].count),
        totalRevenue: 0,
        newCustomersThisMonth: 0,
        totalProducts: parseInt(totalProducts.rows[0].count)
      });
    } 
    
    // CUSTOMER Dashboard
    else if (userRole === 'CUSTOMER') {
      const activePolicies = await pool.query(
        "SELECT COUNT(*) as count FROM policies WHERE \"userId\" = $1 AND status = 'ACTIVE'",
        [userId]
      );
      const pendingClaims = await pool.query(
        "SELECT COUNT(*) as count FROM claims WHERE \"userId\" = $1 AND status IN ('SUBMITTED', 'UNDER_REVIEW')",
        [userId]
      );
      const openTickets = await pool.query(
        "SELECT COUNT(*) as count FROM support_tickets WHERE \"userId\" = $1 AND status IN ('OPEN', 'IN_PROGRESS')",
        [userId]
      );
      const totalProducts = await pool.query(
        "SELECT COUNT(*) as count FROM products where \"userID\" = $1 AND isActive = 'true'",
        [userId]
      );
      
      res.json({
        activePolicies: parseInt(activePolicies.rows[0].count),
        pendingClaims: parseInt(pendingClaims.rows[0].count),
        openTickets: parseInt(openTickets.rows[0].count),
        totalPaid: 0,
        totalPremium: 0,
        totalProducts: parseInt(totalProducts.rows[0].count)
      });
    }
    
    // CLAIMS Department Dashboard
    else if (userRole?.startsWith('CLAIMS') || ['CLAIM_OFFICER', 'CLAIM_OFFICER_I', 'CLAIM_OFFICER_II', 'SENIOR_CLAIM_OFFICER', 'SUPERVISOR_CLAIMS', 'MANAGER_CLAIMS', 'HEAD_CLAIMS', 'CLAIMS_ADMIN'].includes(userRole || '')) {
      const pendingClaims = await pool.query("SELECT COUNT(*) as count FROM claims WHERE status = 'SUBMITTED'");
      const underReview = await pool.query("SELECT COUNT(*) as count FROM claims WHERE status = 'UNDER_REVIEW'");
      const totalClaims = await pool.query("SELECT COUNT(*) as count FROM claims");
      
      res.json({
        pendingClaims: parseInt(pendingClaims.rows[0].count),
        underReview: parseInt(underReview.rows[0].count),
        totalClaims: parseInt(totalClaims.rows[0].count),
        approvedThisMonth: 0,
        rejectedThisMonth: 0,
        averageProcessingTime: 4.5
      });
    }
    
    // UNDERWRITING Department Dashboard
    else if (userRole?.startsWith('UNDERWRITING') || ['UNDERWRITER', 'UNDERWRITING_OFFICER', 'UNDERWRITING_OFFICER_I', 'UNDERWRITING_OFFICER_II', 'SENIOR_UNDERWRITING_OFFICER', 'SUPERVISOR_UNDERWRITING', 'MANAGER_UNDERWRITING', 'HEAD_UNDERWRITING', 'UNDERWRITING_ADMIN'].includes(userRole || '')) {
      const pendingReviews = await pool.query(
        "SELECT COUNT(*) as count FROM policies WHERE status IN ('PENDING_UNDERWRITING', 'SUBMITTED')"
      );
      const pendingFinalApprovals = await pool.query(
        "SELECT COUNT(*) as count FROM policies WHERE status = 'PENDING_FINAL_APPROVAL'"
      );
      const totalPolicies = await pool.query("SELECT COUNT(*) as count FROM policies");
      
      res.json({
        pendingReviews: parseInt(pendingReviews.rows[0].count),
        pendingFinalApprovals: parseInt(pendingFinalApprovals.rows[0].count),
        totalPolicies: parseInt(totalPolicies.rows[0].count),
        approvedThisMonth: 0
      });
    }
    
    // Default response for unknown roles
    else {
      res.json({
        message: 'No dashboard data available for your role',
        role: userRole
      });
    }
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard stats', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get recent transaction notifications based on existing audit and transaction data
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let query = `
      SELECT 
        a.id,
        a.action,
        a."entityType",
        a."entityId",
        a."createdAt",
        a."newValues",
        u."firstName",
        u."lastName",
        u.email
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a."userId"
      WHERE a."createdAt" >= NOW() - INTERVAL '30 days'
    `;

    const params: any[] = [];

    if (userRole === 'CUSTOMER') {
      query += ` AND (a."userId" = $1 OR a."entityType" IN ('POLICY', 'CLAIM', 'PAYMENT'))`;
      params.push(userId);
    }

    query += ` ORDER BY a."createdAt" DESC LIMIT 25`;

    const result = await pool.query(query, params);

    const notifications = result.rows.map((entry: any) => {
      const personName = [entry.firstName, entry.lastName].filter(Boolean).join(' ') || entry.email || 'System';
      const payload = entry.newValues || {};
      const entityType = (entry.entityType || '').toUpperCase();
      let title = 'System update';
      let message = `${entry.action} was recorded for ${entityType.toLowerCase()}.`;
      let type: 'payment' | 'claim' | 'policy' | 'system' = 'system';

      if (entityType === 'PAYMENT') {
        title = 'Payment processed';
        type = 'payment';
        message = `Payment ${payload.referenceNumber || entry.entityId || 'record'} was processed for ${personName}.`;
      } else if (entityType === 'CLAIM') {
        title = 'Claim update';
        type = 'claim';
        message = `Claim ${payload.claimNumber || entry.entityId || 'record'} was updated by ${personName}.`;
      } else if (entityType === 'POLICY') {
        title = 'Policy update';
        type = 'policy';
        message = `Policy ${payload.policyNumber || entry.entityId || 'record'} was updated by ${personName}.`;
      } else if (entityType === 'SUPPORT') {
        title = 'Support ticket update';
        type = 'system';
        message = `Support request was updated by ${personName}.`;
      } else if (entry.action) {
        title = entry.action.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
        message = `${title} was recorded for ${personName}.`;
      }

      return {
        id: entry.id,
        type,
        title,
        message,
        createdAt: entry.createdAt,
        unread: true,
      };
    });

    res.json({
      notifications,
      unreadCount: notifications.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error);
    res.status(500).json({
      error: 'Failed to fetch notifications',
      notifications: [],
      unreadCount: 0,
    });
  }
});

// Get dashboard activities - SIMPLIFIED VERSION
router.get('/activities', authenticate, async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    
    let activities = [];
    
    // Fetch recent claims
    try {
      let claimsQuery = `
        SELECT 
          c.id, 
          c."claimNumber", 
          c.status, 
          c."submittedDate",
          u."firstName", 
          u."lastName"
        FROM claims c
        JOIN users u ON u.id = c."userId"
      `;
      
      if (userRole === 'CUSTOMER') {
        claimsQuery += ` WHERE c."userId" = $1`;
        const claimsResult = await pool.query(claimsQuery + ` ORDER BY c."submittedDate" DESC LIMIT 10`, [userId]);
        
        for (const claim of claimsResult.rows) {
          activities.push({
            id: claim.id,
            type: 'claim',
            claimNumber: claim.claimNumber,
            action: `Claim ${claim.claimNumber} was submitted`,
            user: `${claim.firstName} ${claim.lastName}`,
            timestamp: claim.submittedDate,
            status: claim.status
          });
        }
      } else {
        const claimsResult = await pool.query(claimsQuery + ` ORDER BY c."submittedDate" DESC LIMIT 10`);
        
        for (const claim of claimsResult.rows) {
          activities.push({
            id: claim.id,
            type: 'claim',
            claimNumber: claim.claimNumber,
            action: `Claim ${claim.claimNumber} was submitted by ${claim.firstName} ${claim.lastName}`,
            user: `${claim.firstName} ${claim.lastName}`,
            timestamp: claim.submittedDate,
            status: claim.status
          });
        }
      }
    } catch (err) {
      console.error('Error fetching claims for activities:', err);
    }
    
    // Fetch recent policies
    try {
      let policiesQuery = `
        SELECT 
          p.id, 
          p."policyNumber", 
          p.type, 
          p.status, 
          p."createdAt",
          u."firstName", 
          u."lastName"
        FROM policies p
        JOIN users u ON u.id = p."userId"
      `;
      
      if (userRole === 'CUSTOMER') {
        policiesQuery += ` WHERE p."userId" = $1`;
        const policiesResult = await pool.query(policiesQuery + ` ORDER BY p."createdAt" DESC LIMIT 10`, [userId]);
        
        for (const policy of policiesResult.rows) {
          activities.push({
            id: policy.id,
            type: 'policy',
            policyNumber: policy.policyNumber,
            action: `Policy ${policy.policyNumber} (${policy.type}) was created`,
            user: `${policy.firstName} ${policy.lastName}`,
            timestamp: policy.createdAt,
            status: policy.status
          });
        }
      } else {
        const policiesResult = await pool.query(policiesQuery + ` ORDER BY p."createdAt" DESC LIMIT 10`);
        
        for (const policy of policiesResult.rows) {
          activities.push({
            id: policy.id,
            type: 'policy',
            policyNumber: policy.policyNumber,
            action: `Policy ${policy.policyNumber} (${policy.type}) was created by ${policy.firstName} ${policy.lastName}`,
            user: `${policy.firstName} ${policy.lastName}`,
            timestamp: policy.createdAt,
            status: policy.status
          });
        }
      }
    } catch (err) {
      console.error('Error fetching policies for activities:', err);
    }
    
    // Sort activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    res.json({
      activities: activities.slice(0, 20),
      totalCount: activities.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    res.status(500).json({ 
      error: 'Failed to fetch activities', 
      details: error.message,
      activities: [],
      totalCount: 0
    });
  }
});

export default router;