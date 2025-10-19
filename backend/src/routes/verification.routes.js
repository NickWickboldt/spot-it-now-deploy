import { Router } from 'express';
import { verifyMultipleImages, verifySingleImage } from '../controllers/verification.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Require authentication for all verification endpoints
router.use(verifyJWT);

// Verify single image for fraud indicators
router.route('/image').post(verifySingleImage);

// Verify batch of images
router.route('/images').post(verifyMultipleImages);

export default router;
