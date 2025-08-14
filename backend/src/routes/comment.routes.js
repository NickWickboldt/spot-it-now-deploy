import { Router } from 'express';
import {
  createComment,
  updateComment,
  deleteComment,
  getCommentsForSighting,
} from '../controllers/comment.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// --- Public Route ---
// Anyone can get the list of comments for a specific sighting.
router.route('/sighting/:sightingId').get(getCommentsForSighting);


// --- Secured Routes ---
// These actions require a user to be logged in.
router.route('/sighting/:sightingId').post(verifyJWT, createComment);
router.route('/:commentId').patch(verifyJWT, updateComment);
router.route('/:commentId').delete(verifyJWT, deleteComment);


export default router;