import { Router } from 'express';
import { ProfileController, upload } from '../../controllers/profile.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
const router = Router();
router.get('/', authenticate, ProfileController.getProfile);
router.put('/', authenticate, ProfileController.updateProfile);
router.post('/avatar', authenticate, upload.single('avatar'), ProfileController.uploadAvatar);
router.put('/password', authenticate, ProfileController.changePassword);
export default router;
