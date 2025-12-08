import { RegionalChallenge } from '../models/regionalChallenge.model.js';
import { regionalChallengeService } from '../services/regionalChallenge.service.js';
import { ApiError } from '../utils/ApiError.util.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';

/**
 * Get regional challenges based on user's geolocation.
 * 
 * NEW WORKFLOW:
 * 1. Takes lat/lng coordinates
 * 2. Checks for existing Region (by key or proximity)
 * 3. If no region: Calls AI ONCE to generate probability manifest
 * 4. Uses local code to select Daily/Weekly challenges
 * 5. Returns the selected challenges
 * 
 * @route GET /api/v1/regional-challenges
 * @query {number} lat - Latitude coordinate
 * @query {number} lng - Longitude coordinate
 */
export const getRegionalChallenges = asyncHandler(async (req, res) => {
  let { lat, lng } = req.query;

  // Try to get coordinates from query params first, then fall back to user profile
  if ((lat == null || lng == null) && req.user) {
    lat = req.user.latitude;
    lng = req.user.longitude;
  }

  if (lat == null || lng == null) {
    throw new ApiError(400, 'Missing lat/lng coordinates. Please provide location or update your profile.');
  }

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ApiError(400, 'Invalid coordinates. lat and lng must be valid numbers.');
  }

  if (latitude < -90 || latitude > 90) {
    throw new ApiError(400, 'Invalid latitude. Must be between -90 and 90.');
  }

  if (longitude < -180 || longitude > 180) {
    throw new ApiError(400, 'Invalid longitude. Must be between -180 and 180.');
  }

  const result = await regionalChallengeService.getOrGenerateRegionalChallenge(latitude, longitude);

  return res.status(200).json(
    new ApiResponse(200, {
      region_key: result.region.region_key,
      location: result.region.location,
      // Daily challenges (3 animals with count 1 each)
      daily: result.daily,
      // Weekly challenges (5-7 animals with count 1 each)
      weekly: result.weekly,
      // Manifest size for debugging
      manifest_size: result.region.animal_manifest.length,
    }, 'Regional challenges retrieved')
  );
});

/**
 * Get the full probability manifest for a region (admin/debug).
 * 
 * @route GET /api/v1/regional-challenges/manifest
 * @query {number} lat - Latitude coordinate
 * @query {number} lng - Longitude coordinate
 */
export const getRegionManifest = asyncHandler(async (req, res) => {
  let { lat, lng } = req.query;

  if (lat == null || lng == null) {
    throw new ApiError(400, 'Missing lat/lng coordinates.');
  }

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ApiError(400, 'Invalid coordinates.');
  }

  // Get or create the region
  const result = await regionalChallengeService.getOrGenerateRegionalChallenge(latitude, longitude);

  return res.status(200).json(
    new ApiResponse(200, {
      region_key: result.region.region_key,
      location: result.region.location,
      center: result.region.center,
      animal_manifest: result.region.animal_manifest,
      created_at: result.region.createdAt,
    }, 'Region manifest retrieved')
  );
});

/**
 * Force regenerate the probability manifest for a region (admin only).
 * This deletes the existing manifest and creates a new one with fresh AI data.
 * 
 * @route POST /api/v1/regional-challenges/regenerate
 * @body {number} lat - Latitude coordinate
 * @body {number} lng - Longitude coordinate
 */
export const regenerateRegionalChallenges = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;

  if (lat == null || lng == null) {
    throw new ApiError(400, 'Missing lat/lng coordinates in request body.');
  }

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ApiError(400, 'Invalid coordinates.');
  }

  const result = await regionalChallengeService.regenerateRegionManifest(latitude, longitude);

  return res.status(201).json(
    new ApiResponse(201, {
      region_key: result.region.region_key,
      location: result.region.location,
      daily: result.daily,
      weekly: result.weekly,
      manifest_size: result.region.animal_manifest.length,
    }, 'Region manifest regenerated with AI')
  );
});

/**
 * List all regional manifests (admin only).
 * Returns all cached region manifests sorted by creation date.
 * 
 * @route GET /api/v1/regional-challenges/all
 */
export const listAllRegionalChallenges = asyncHandler(async (req, res) => {
  const regions = await RegionalChallenge.find({})
    .sort({ createdAt: -1 })
    .limit(100);

  return res.status(200).json(
    new ApiResponse(200, {
      count: regions.length,
      challenges: regions.map((r) => ({
        _id: r._id,
        region_key: r.region_key,
        location: r.location,
        center: r.center,
        manifest_size: r.animal_manifest.length,
        high_probability_count: r.animal_manifest.filter((a) => a.probability >= 15).length,
        createdAt: r.createdAt,
      })),
    }, 'All regional manifests retrieved')
  );
});

/**
 * Clear all regional manifests (admin only).
 * Deletes all cached region data from the database.
 * 
 * @route DELETE /api/v1/regional-challenges/clear-all
 */
export const clearAllRegionalChallenges = asyncHandler(async (req, res) => {
  const result = await RegionalChallenge.deleteMany({});

  return res.status(200).json(
    new ApiResponse(200, {
      deleted: result.deletedCount,
    }, `Cleared ${result.deletedCount} regional manifests`)
  );
});

/**
 * Delete a single regional manifest by ID (admin only).
 * 
 * @route DELETE /api/v1/regional-challenges/:id
 */
export const deleteRegionalChallenge = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const region = await RegionalChallenge.findByIdAndDelete(id);

  if (!region) {
    throw new ApiError(404, 'Regional manifest not found');
  }

  return res.status(200).json(
    new ApiResponse(200, {
      deleted: region._id,
      location: region.location,
    }, 'Regional manifest deleted')
  );
});

/**
 * Get or create user-specific challenges.
 * These challenges persist until they expire (daily: 24h, weekly: 7 days).
 * 
 * @route GET /api/v1/regional-challenges/user
 * @query {number} lat - Latitude coordinate
 * @query {number} lng - Longitude coordinate
 */
export const getUserChallenges = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new ApiError(401, 'Authentication required');
  }

  let { lat, lng } = req.query;

  // Try to get coordinates from query params first, then fall back to user profile
  if ((lat == null || lng == null) && req.user) {
    lat = req.user.latitude;
    lng = req.user.longitude;
  }

  if (lat == null || lng == null) {
    throw new ApiError(400, 'Missing lat/lng coordinates. Please provide location or update your profile.');
  }

  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ApiError(400, 'Invalid coordinates. lat and lng must be valid numbers.');
  }

  const result = await regionalChallengeService.getOrCreateUserChallenges(req.user._id, latitude, longitude);

  const response = {
    region_key: result.userChallenge.region_key,
    location: result.location,
    cached: result.cached,
  };

  // Add daily challenge if active
  if (result.userChallenge.daily?.expires_at > new Date()) {
    response.daily = {
      animals: result.userChallenge.daily.animals,
      expires_at: result.userChallenge.daily.expires_at,
      completed: result.userChallenge.daily.completed,
      xp_potential: result.userChallenge.daily.xp_potential || 0,
      xp_awarded: result.userChallenge.daily.xp_awarded || 0,
    };
  }

  // Add weekly challenge if active
  if (result.userChallenge.weekly?.expires_at > new Date()) {
    response.weekly = {
      animals: result.userChallenge.weekly.animals,
      expires_at: result.userChallenge.weekly.expires_at,
      completed: result.userChallenge.weekly.completed,
      xp_potential: result.userChallenge.weekly.xp_potential || 0,
      xp_awarded: result.userChallenge.weekly.xp_awarded || 0,
    };
  }

  return res.status(200).json(
    new ApiResponse(200, response, 'User challenges retrieved')
  );
});

/**
 * Get user's current active challenges (without creating new ones).
 * 
 * @route GET /api/v1/regional-challenges/user/active
 */
export const getActiveUserChallenges = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new ApiError(401, 'Authentication required');
  }

  const challenges = await regionalChallengeService.getUserActiveChallenges(req.user._id);

  if (!challenges) {
    return res.status(200).json(
      new ApiResponse(200, { active: false }, 'No active challenges')
    );
  }

  return res.status(200).json(
    new ApiResponse(200, { active: true, ...challenges }, 'Active challenges retrieved')
  );
});
