import { Router } from 'express';
import { PaymentController } from '../../controllers/payment.controller.js';
import { authenticate } from '../../api/middleware/auth.middleware.js';
const router = Router();
router.get('/', authenticate, PaymentController.getMyPayments);
router.get('/methods', authenticate, PaymentController.getPaymentMethods);
router.post('/methods', authenticate, PaymentController.createPaymentMethod);
router.delete('/methods/:id', authenticate, PaymentController.deletePaymentMethod);
export default router;
