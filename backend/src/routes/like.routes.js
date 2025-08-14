import { Router } from 'express';
import {
  toggleSightingLike,
  getSightingLikes,
  getLikedSightingsByUser,
} from '../controllers/like.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// --- Secured Route ---
// A user must be logged in to like or unlike a post.
// The user's ID will be taken from their JWT token.
router.route('/toggle/:sightingId').post(verifyJWT, toggleSightingLike);


// --- Public Routes ---
// Anyone can see who liked a post or which posts a user has liked.
router.route('/sighting/:sightingId').get(getSightingLikes);
router.route('/user/:userId').get(getLikedSightingsByUser);


export default router;
