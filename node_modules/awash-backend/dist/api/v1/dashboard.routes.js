import { Router } from 'express';
import { DashboardController } from '../../controllers/dashboard.controller.js';
import { authenticate } from '../api/middleware/auth.middleware.js';
const router = Router();
router.get('/stats', authenticate, DashboardController.getStats);
router.get('/activities', authenticate, DashboardController.getActivities);
export default router;
