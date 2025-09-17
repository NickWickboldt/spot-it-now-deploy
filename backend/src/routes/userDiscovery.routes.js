import { Router } from 'express';
import {
    addDiscovery,
    checkAnimalDiscovered,
    getDiscoveryStats,
    getLeaderboard,
    getUserDiscoveries,
    updateVerification
} from '../controllers/userDiscovery.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply JWT verification to all routes
router.use(verifyJWT);

// User discovery routes
router.route('/me/discoveries').get(getUserDiscoveries);
router.route('/me/discoveries').post(addDiscovery);
router.route('/me/discovery-stats').get(getDiscoveryStats);
router.route('/me/discoveries/check/:animalId').get(checkAnimalDiscovered);
router.route('/me/discoveries/:animalId/verify').patch(updateVerification);

// Public discovery routes
router.route('/discoveries/leaderboard').get(getLeaderboard);

export default router;