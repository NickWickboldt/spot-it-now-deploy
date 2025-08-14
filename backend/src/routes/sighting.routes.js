import { Router } from 'express';
import {
  createSighting,
  deleteSighting,
  getSightingById,
  getSightingsByUser,
  getSightingsByAnimal,
  findSightingsNear,
  updateSightingField,
  addMediaUrlToSighting,
  removeMediaUrlFromSighting,
} from '../controllers/sighting.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// --- Public Routes ---
// Anyone can view sighting data
router.route('/near').get(findSightingsNear); // e.g., /near?long=-96.8&lat=32.7
router.route('/by-user/:userId').get(getSightingsByUser);
router.route('/by-animal/:animalId').get(getSightingsByAnimal);
router.route('/:sightingId').get(getSightingById);


// --- Secured Routes ---
// These actions require a user to be logged in.
// The service layer is responsible for checking ownership or admin status.
router.route('/create').post(verifyJWT, createSighting);
router.route('/:sightingId/delete').delete(verifyJWT, deleteSighting);
router.route('/:sightingId/update').patch(verifyJWT, updateSightingField);

// Routes for managing the mediaUrls array
router.route('/:sightingId/media/add').post(verifyJWT, addMediaUrlToSighting);
router.route('/:sightingId/media/remove').post(verifyJWT, removeMediaUrlFromSighting);


export default router;