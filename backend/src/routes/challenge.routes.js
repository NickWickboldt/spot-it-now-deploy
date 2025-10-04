import { Router } from 'express';
import { adminListChallenges, createChallenge, getTodayChallenges } from '../controllers/challenge.controller.js';
import { verifyAdmin } from '../middlewares/admin.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Get today's active challenges for a location/user
router.get('/today', verifyJWT, getTodayChallenges);

// Admin: create a challenge
router.post('/create', verifyJWT, verifyAdmin(1), createChallenge);

// Admin: list all challenges
router.get('/', verifyJWT, verifyAdmin(1), adminListChallenges);

export default router;
