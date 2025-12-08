import { Router } from 'express';
import {
    clearAllRegionalChallenges,
    deleteRegionalChallenge,
    getActiveUserChallenges,
    getRegionalChallenges,
    getRegionManifest,
    getUserChallenges,
    listAllRegionalChallenges,
    regenerateRegionalChallenges,
} from '../controllers/regionalChallenge.controller.js';
import { verifyAdmin } from '../middlewares/admin.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @route GET /api/v1/regional-challenges/user
 * @desc Get or create user-specific challenges (persisted with expiration)
 * @access Private (requires authentication)
 * @query {number} lat - Latitude coordinate
 * @query {number} lng - Longitude coordinate
 */
router.get('/user', verifyJWT, getUserChallenges);

/**
 * @route GET /api/v1/regional-challenges/user/active
 * @desc Get user's current active challenges without creating new ones
 * @access Private (requires authentication)
 */
router.get('/user/active', verifyJWT, getActiveUserChallenges);

/**
 * @route GET /api/v1/regional-challenges
 * @desc Get regional challenges based on user's geolocation (generates new each time - use /user instead)
 *       Uses cached probability manifest or creates one via AI
 * @access Private (requires authentication)
 * @query {number} lat - Latitude coordinate
 * @query {number} lng - Longitude coordinate
 */
router.get('/', verifyJWT, getRegionalChallenges);

/**
 * @route GET /api/v1/regional-challenges/manifest
 * @desc Get the full probability manifest for a region (admin/debug)
 * @access Admin only
 * @query {number} lat - Latitude coordinate
 * @query {number} lng - Longitude coordinate
 */
router.get('/manifest', verifyJWT, verifyAdmin(1), getRegionManifest);

/**
 * @route GET /api/v1/regional-challenges/all
 * @desc List all regional manifests (admin only)
 * @access Admin only
 */
router.get('/all', verifyJWT, verifyAdmin(1), listAllRegionalChallenges);

/**
 * @route POST /api/v1/regional-challenges/regenerate
 * @desc Force regenerate the probability manifest for a region (admin only)
 * @access Admin only
 * @body {number} lat - Latitude coordinate
 * @body {number} lng - Longitude coordinate
 */
router.post('/regenerate', verifyJWT, verifyAdmin(1), regenerateRegionalChallenges);

/**
 * @route DELETE /api/v1/regional-challenges/clear-all
 * @desc Clear all regional manifests (admin only)
 * @access Admin only
 */
router.delete('/clear-all', verifyJWT, verifyAdmin(1), clearAllRegionalChallenges);

/**
 * @route DELETE /api/v1/regional-challenges/:id
 * @desc Delete a single regional manifest (admin only)
 * @access Admin only
 */
router.delete('/:id', verifyJWT, verifyAdmin(1), deleteRegionalChallenge);

export default router;
