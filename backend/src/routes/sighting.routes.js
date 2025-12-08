import { Router } from 'express';
import {
    addMediaUrlToSighting,
    createSighting,
    deleteSighting,
    findSightingsNear,
    getAllSightings,
    getCommunityReviewSighting,
    getFollowingRecentSightings,
    getMySightings,
    getRecentSightings,
    getSightingById,
    getSightingsByAnimal,
    getSightingsByUser,
    removeMediaUrlFromSighting,
    submitCommunityVerificationVote,
    updateSightingField
} from '../controllers/sighting.controller.js';
import { verifyAdmin } from '../middlewares/admin.middleware.js';
import { optionalJWT, verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// --- Public Routes ---
// Anyone can view sighting data
router.route('/near').get(findSightingsNear); // e.g., /near?long=-96.8&lat=32.7
router.route('/by-user/:userId').get(getSightingsByUser);
router.route('/by-animal/:animalId').get(getSightingsByAnimal);

// public recent feed (paginated)
router.route('/recent').get(getRecentSightings);

// following recent feed (paginated)
router.route('/following/recent').get(verifyJWT, getFollowingRecentSightings);
router.route('/community/next').get(verifyJWT, getCommunityReviewSighting);

// Get current user's own sightings (including private) - place before param route to avoid 'my' matching :sightingId
router.route('/my').get(verifyJWT, getMySightings);

router.route('/:sightingId').get(optionalJWT, getSightingById);

// Admin: list all sightings
router.route('/').get(verifyJWT, verifyAdmin(1), getAllSightings);


// --- Secured Routes ---
// These actions require a user to be logged in.
// The service layer is responsible for checking ownership or admin status.
router.route('/create').post(verifyJWT, createSighting);
router.route('/:sightingId/community-vote').post(verifyJWT, submitCommunityVerificationVote);
router.route('/:sightingId/delete').delete(verifyJWT, deleteSighting);
router.route('/:sightingId/update').patch(verifyJWT, updateSightingField);

// Routes for managing the mediaUrls array
router.route('/:sightingId/media/add').post(verifyJWT, addMediaUrlToSighting);
router.route('/:sightingId/media/remove').post(verifyJWT, removeMediaUrlFromSighting);


export default router;
