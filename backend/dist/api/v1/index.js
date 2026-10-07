import { Router } from 'express';
// Auth
import authRoutes from './auth.routes.js';
// Users & Profile
import usersRoutes from './user.routes.js';
import profileRoutes from './profile.routes.js';
// Admin
import adminRoutes from './admin.routes.js';
import migrationsRoutes from './migrations.routes.js';
import roleLevelsRoutes from './role-levels.routes.js';
// Products & Coverage
import productsRoutes from './products.routes.js';
import coverageTiersRoutes from './coverageTiers.routes.js';
// Policies
import policiesRoutes from './policies.routes.js';
// Claims
import claimsRoutes from './claim.routes.js';
import claimsAssignmentRoutes from './claims-assignment.routes.js';
// Payments
import paymentsRoutes from './payment.routes.js';
// Approval / Workflow
import approvalRoutes from './approval.routes.js';
// Underwriting
import underwritingRoutes from './underwriting.routes.js';
// Settings & Configuration
import settingsRoutes from './settings.routes.js';
import configRoutes from './config.routes.js';
// Risk & Pricing
import perilsRoutes from './perils.routes.js';
import ridersRoutes from './riders.routes.js';
import premiumRatesRoutes from './premium-rates.routes.js';
// Support
import supportRoutes from './support.routes.js';
// Hospitals
import hospitalListRoutes from './hospital-list.routes.js';
// Dashboard
import dashboardRoutes from './dashboard.routes.js';
// Audit
import auditRoutes from './audit.routes.js';
const router = Router();
// ============================================================================
// AUTH
// ============================================================================
router.use('/auth', authRoutes);
// ============================================================================
// USERS & PROFILE
// ============================================================================
router.use('/users', usersRoutes);
router.use('/profile', profileRoutes);
// ============================================================================
// ADMIN
// ============================================================================
router.use('/admin', adminRoutes);
router.use('/migrations', migrationsRoutes);
router.use('/role-levels', roleLevelsRoutes);
// ============================================================================
// PRODUCTS & COVERAGE
// ============================================================================
router.use('/products', productsRoutes);
router.use('/coverage-tiers', coverageTiersRoutes);
// ============================================================================
// POLICIES
// ============================================================================
router.use('/policies', policiesRoutes);
// ============================================================================
// CLAIMS
// ============================================================================
router.use('/claims', claimsRoutes);
router.use('/claims-assignment', claimsAssignmentRoutes);
// ============================================================================
// PAYMENTS
// ============================================================================
router.use('/payments', paymentsRoutes);
// ============================================================================
// APPROVAL / WORKFLOW
// ============================================================================
router.use('/approval', approvalRoutes);
// ============================================================================
// UNDERWRITING
// ============================================================================
router.use('/underwriting', underwritingRoutes);
// ============================================================================
// SETTINGS & CONFIGURATION
// ============================================================================
router.use('/settings', settingsRoutes);
router.use('/config', configRoutes);
// ============================================================================
// RISK & PRICING
// ============================================================================
router.use('/perils', perilsRoutes);
router.use('/riders', ridersRoutes);
router.use('/premium-rates', premiumRatesRoutes);
// ============================================================================
// SUPPORT
// ============================================================================
router.use('/support', supportRoutes);
// ============================================================================
// HOSPITALS
// ============================================================================
router.use('/hospitals', hospitalListRoutes);
// ============================================================================
// DASHBOARD
// ============================================================================
router.use('/dashboard', dashboardRoutes);
// ============================================================================
// AUDIT
// ============================================================================
router.use('/audit', auditRoutes);
export default router;
