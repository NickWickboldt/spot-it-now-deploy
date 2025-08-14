import { Router } from 'express';
import {
    getFollowCounts,
    getFollowers,
    getFollowing,
    toggleFollow,
} from '../controllers/follow.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// --- Secured Route ---
// A user must be logged in to follow or unfollow another user.
router.route('/toggle/:userIdToFollow').post(verifyJWT, toggleFollow);


// --- Public Routes ---
// Anyone can view who follows whom.
router.route('/:userId/followers').get(getFollowers);
router.route('/:userId/following').get(getFollowing);
router.route('/:userId/counts').get(getFollowCounts);


export default router;
