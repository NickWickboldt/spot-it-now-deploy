import { Router } from 'express';
import {
  awardAchievementToUser,
  revokeAchievementFromUser,
  getAchievementsForUser,
  getUsersWithAchievement,
} from '../controllers/userAchievement.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { verifyAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

// --- Public Routes ---
// Anyone can view which achievements a user has earned or who has a specific achievement.
router.route('/user/:userId').get(getAchievementsForUser);
router.route('/achievement/:achievementId').get(getUsersWithAchievement);


// --- Admin-Only Routes ---
// These actions require the user to be a logged-in admin.
router.route('/award').post(verifyJWT, verifyAdmin(1), awardAchievementToUser);
router.route('/revoke').post(verifyJWT, verifyAdmin(1), revokeAchievementFromUser); // Using POST for consistency as it needs a body


export default router;