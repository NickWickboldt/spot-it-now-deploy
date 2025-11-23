import { Router } from 'express';
import { algorithmController } from '../controllers/algorithm.controller.js';
import { verifyAdmin } from '../middlewares/admin.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// User routes (require authentication)
router.post('/track/view', verifyJWT, algorithmController.trackSightingView);
router.post('/track/like', verifyJWT, algorithmController.trackSightingLike);
router.post('/track/comment', verifyJWT, algorithmController.trackSightingComment);

router.get('/stats', verifyJWT, algorithmController.getUserAlgorithmStats);
router.patch('/toggle', verifyJWT, algorithmController.toggleUserAlgorithm);
router.post('/reset', verifyJWT, algorithmController.resetUserAlgorithm);

router.get('/feed', verifyJWT, algorithmController.getPersonalizedFeed);

// Admin routes
router.post('/admin/reset/:userId', verifyJWT, verifyAdmin, algorithmController.adminResetUserAlgorithm);
router.get('/admin/stats/:userId', verifyJWT, verifyAdmin, algorithmController.adminGetUserAlgorithmStats);
router.patch('/admin/toggle/:userId', verifyJWT, verifyAdmin, algorithmController.adminToggleUserAlgorithm);

export default router;
