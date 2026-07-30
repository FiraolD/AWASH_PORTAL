import { Router } from 'express';
import authRoutes from './auth.routes.js';
import approvalRoutes from './approval.routes.js';
import auditRoutes from './audit.routes.js';
import claimsRoutes from './claim.routes.js';
import claimsAssignmentRoutes from './claims-assignment.routes.js';
import configRoutes from './config.routes.js';
import coverageTiersRoutes from './coverageTiers.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import paymentsRoutes from './payment.routes.js';
import perilsRoutes from './perils.routes.js';
import policiesRoutes from './policy.routes.js';
import premiumRatesRoutes from './premium-rates.routes.js';
import productsRoutes from './products.routes.js';
import settingsRoutes from './settings.routes.js';
import usersRoutes from './user.routes.js';

const router = Router();

// Auth
router.use('/auth', authRoutes);

// Users
router.use('/users', usersRoutes);

// Products
router.use('/products', productsRoutes);

// Policies
router.use('/policies', policiesRoutes);

// Claims
router.use('/claims', claimsRoutes);
router.use('/claims-assignment', claimsAssignmentRoutes);

// Payments
router.use('/payments', paymentsRoutes);

// Approval / Workflow
router.use('/approval', approvalRoutes);

// Settings & Configuration
router.use('/settings', settingsRoutes);
router.use('/config', configRoutes);

// Coverage Tiers
router.use('/coverage-tiers', coverageTiersRoutes);

// Dashboard
router.use('/dashboard', dashboardRoutes);

// Perils
router.use('/perils', perilsRoutes);

// Premium Rates
router.use('/premium-rates', premiumRatesRoutes);

// Audit Logs
router.use('/audit', auditRoutes);

export default router;