import { Response } from 'express';
import pool from '../lib/db.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

export const DashboardController = {
  getStats: async (req: AuthRequest, res: Response) => {
    try {
      const userRole = req.user?.role || '';
      const userId = req.user?.id;

      let dashboardData: any = { role: userRole, data: {} };

      if (userRole === 'MASTER_ADMIN') {
        const [customers, policies, claims, revenue, monthlyClaims] = await Promise.all([
          pool.query(`SELECT COUNT(*) as count FROM users WHERE role = 'CUSTOMER'`),
          pool.query(`SELECT COUNT(*) as count FROM policies WHERE status = 'ACTIVE'`),
          pool.query(`SELECT COUNT(*) as count FROM claims WHERE status IN ('SUBMITTED', 'PENDING', 'UNDER_REVIEW')`),
          pool.query(`SELECT COALESCE(SUM(amount), 0) as revenue FROM payments WHERE status IN ('SUCCESS', 'COMPLETED') AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)`),
          pool.query(`SELECT COUNT(*) as count FROM claims WHERE status IN ('APPROVED', 'PAID') AND EXTRACT(MONTH FROM "updatedAt") = EXTRACT(MONTH FROM CURRENT_DATE)`)
        ]);

        dashboardData = {
          role: 'MASTER_ADMIN',
          stats: {
            totalCustomers: parseInt(customers.rows[0]?.count || '0'),
            activePolicies: parseInt(policies.rows[0]?.count || '0'),
            pendingClaims: parseInt(claims.rows[0]?.count || '0'),
            monthlyRevenue: parseFloat(revenue.rows[0]?.revenue || '0'),
            monthlyClaimsPaid: parseInt(monthlyClaims.rows[0]?.count || '0'),
          },
        };
      } else if (userRole === 'CUSTOMER') {
        const [policies, claims, payments, tickets] = await Promise.all([
          pool.query(`SELECT COUNT(*) as count FROM policies WHERE "userId" = $1 AND status = 'ACTIVE'`, [userId]),
          pool.query(`SELECT COUNT(*) as count FROM claims WHERE "userId" = $1 AND status IN ('SUBMITTED', 'PENDING', 'UNDER_REVIEW')`, [userId]),
          pool.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE "userId" = $1 AND status IN ('SUCCESS', 'COMPLETED')`, [userId]),
          pool.query(`SELECT COUNT(*) as count FROM support_tickets WHERE "userId" = $1 AND status IN ('open', 'in_progress')`, [userId])
        ]);

        const recentPolicies = await pool.query(`
          SELECT "policyNumber", type, status, "coverageAmount", premium, "effectiveDate"
          FROM policies WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 5
        `, [userId]);

        const recentClaims = await pool.query(`
          SELECT "claimNumber", status, "incidentDate", "estimatedAmount", "submittedDate"
          FROM claims WHERE "userId" = $1 ORDER BY "submittedDate" DESC LIMIT 5
        `, [userId]);

        dashboardData = {
          role: 'CUSTOMER',
          stats: {
            activePolicies: parseInt(policies.rows[0]?.count || '0'),
            pendingClaims: parseInt(claims.rows[0]?.count || '0'),
            totalPaid: parseFloat(payments.rows[0]?.total || '0'),
            openTickets: parseInt(tickets.rows[0]?.count || '0'),
          },
          recentPolicies: recentPolicies.rows,
          recentClaims: recentClaims.rows,
        };
      } else if (userRole === 'CLAIMS_ADMIN') {
        const [pending, approved, total, avgTime] = await Promise.all([
          pool.query(`SELECT COUNT(*) as count FROM claims WHERE status IN ('SUBMITTED', 'PENDING', 'UNDER_REVIEW')`),
          pool.query(`SELECT COUNT(*) as count FROM claims WHERE status IN ('APPROVED', 'PAID') AND EXTRACT(MONTH FROM "updatedAt") = EXTRACT(MONTH FROM CURRENT_DATE)`),
          pool.query(`SELECT COUNT(*) as count FROM claims`),
          pool.query(`SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))/86400) as avg_days FROM claims WHERE status IN ('APPROVED', 'PAID')`)
        ]);

        const recentClaims = await pool.query(`
          SELECT c."claimNumber", c.status, c."estimatedAmount", c."submittedDate",
                 u."firstName", u."lastName", p."policyNumber"
          FROM claims c
          JOIN users u ON u.id = c."userId"
          JOIN policies p ON p.id = c."policyId"
          ORDER BY c."submittedDate" DESC LIMIT 10
        `);

        dashboardData = {
          role: 'CLAIMS_ADMIN',
          stats: {
            pendingClaims: parseInt(pending.rows[0]?.count || '0'),
            approvedClaims: parseInt(approved.rows[0]?.count || '0'),
            totalClaims: parseInt(total.rows[0]?.count || '0'),
            avgProcessingDays: Math.round(parseFloat(avgTime.rows[0]?.avg_days || '0')),
          },
          recentClaims: recentClaims.rows,
        };
      }

      res.json(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  },

  getActivities: async (req: AuthRequest, res: Response) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;

      let activities: any[] = [];

      if (userRole === 'MASTER_ADMIN') {
        const result = await pool.query(`
          (SELECT 'claim' as type, "claimNumber" as reference, status, "createdAt" as timestamp, 'System' as user_name
           FROM claims ORDER BY "createdAt" DESC LIMIT 5)
          UNION ALL
          (SELECT 'payment' as type, id::text as reference, status, date as timestamp, 'System' as user_name
           FROM payments ORDER BY date DESC LIMIT 5)
          UNION ALL
          (SELECT 'policy' as type, "policyNumber" as reference, status, "createdAt" as timestamp, 'System' as user_name
           FROM policies ORDER BY "createdAt" DESC LIMIT 3)
          ORDER BY timestamp DESC LIMIT 10
        `);
        activities = result.rows;
      } else if (userRole === 'CUSTOMER') {
        const result = await pool.query(`
          (SELECT 'claim' as type, "claimNumber" as reference, status, "createdAt" as timestamp, 'You' as user_name
           FROM claims WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 5)
          UNION ALL
          (SELECT 'payment' as type, id::text as reference, status, date as timestamp, 'You' as user_name
           FROM payments WHERE "userId" = $1 ORDER BY date DESC LIMIT 5)
          UNION ALL
          (SELECT 'policy' as type, "policyNumber" as reference, status, "createdAt" as timestamp, 'You' as user_name
           FROM policies WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 3)
          ORDER BY timestamp DESC LIMIT 10
        `, [userId]);
        activities = result.rows;
      }

      const formattedActivities = activities.map(activity => ({
        type: activity.type,
        message: `${activity.type} ${activity.reference} is ${activity.status}`,
        timestamp: activity.timestamp,
        user: activity.user_name,
        status: activity.status,
      }));

      res.json(formattedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      res.json([]);
    }
  },
};