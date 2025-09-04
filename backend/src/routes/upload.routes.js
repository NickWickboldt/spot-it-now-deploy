import { Router } from 'express';
import { signUpload, cloudinaryWebhook } from '../controllers/upload.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Only authenticated users can request signed uploads
router.route('/sign').post(verifyJWT, signUpload);

// Optional: webhook endpoint (no auth, Cloudinary will call)
router.route('/webhook').post(cloudinaryWebhook);

export default router;

