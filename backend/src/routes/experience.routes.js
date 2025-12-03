import { Router } from 'express';
import { experienceController } from '../controllers/experience.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Public routes
// Get XP configuration (level thresholds, rarity XP values, etc.)
router.get('/config', experienceController.getXPConfig);

// Utility: Calculate level from XP amount
router.get('/calculate', experienceController.calculateLevelFromXP);

// Get any user's level info (public profile data)
router.get('/user/:userId', experienceController.getUserLevelInfo);

// Protected routes (require authentication)
// Get current user's level info
router.get('/me', verifyJWT, experienceController.getMyLevelInfo);

export default router;
