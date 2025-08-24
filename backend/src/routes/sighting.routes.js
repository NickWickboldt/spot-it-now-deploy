import { Router } from 'express';
import {
  addMediaUrlToSighting,
  createSighting,
  deleteSighting,
  findSightingsNear,
  getAllSightings,
  getSightingById,
  getSightingsByAnimal,
  getSightingsByUser,
  removeMediaUrlFromSighting,
  updateSightingField,
  getRecentSightings
} from '../controllers/sighting.controller.js';
import { verifyAdmin } from '../middlewares/admin.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// --- Public Routes ---
// Anyone can view sighting data
router.route('/near').get(findSightingsNear); // e.g., /near?long=-96.8&lat=32.7
router.route('/by-user/:userId').get(getSightingsByUser);
router.route('/by-animal/:animalId').get(getSightingsByAnimal);
// public recent feed (paginated) - define before parameterized routes so 'recent' is not
// interpreted as a sightingId by the `/:sightingId` route.
router.route('/recent').get(getRecentSightings);
router.route('/:sightingId').get(getSightingById);

// Admin: list all sightings
router.route('/').get(verifyJWT, verifyAdmin(1), getAllSightings);


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