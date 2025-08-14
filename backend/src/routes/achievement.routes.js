import { Router } from 'express';
import {
  createAchievement,
  updateAchievement,
  deleteAchievement,
  getAchievementById,
  getAllAchievements,
  getAchievementField,
  setAchievementField,
} from '../controllers/achievement.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { verifyAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

// --- Public Routes ---
// Any user or client can view the list of achievements.
router.route('/').get(getAllAchievements);
router.route('/:achievementId').get(getAchievementById);
router.route('/:achievementId/field/:fieldName').get(getAchievementField);


// --- Admin-Only Routes ---
// These actions require the user to be a logged-in admin.
router.route('/create').post(verifyJWT, verifyAdmin(1), createAchievement);
router.route('/:achievementId/update').patch(verifyJWT, verifyAdmin(1), updateAchievement);
router.route('/:achievementId/delete').delete(verifyJWT, verifyAdmin(1), deleteAchievement);
router.route('/:achievementId/field').patch(verifyJWT, verifyAdmin(1), setAchievementField);


export default router;
