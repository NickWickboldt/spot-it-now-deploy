import { algorithmService } from '../services/algorithm.service.js';
import { ApiError } from '../utils/ApiError.util.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';

/**
 * Track sighting view for algorithm
 */
const trackSightingView = asyncHandler(async (req, res) => {
  const { sightingId, durationSeconds } = req.body;
  
  if (!sightingId || !durationSeconds) {
    throw new ApiError(400, 'Sighting ID and duration are required');
  }
  
  await algorithmService.trackInteraction(
    req.user._id,
    sightingId,
    'view',
    durationSeconds
  );
  
  return res.status(200).json(
    new ApiResponse(200, {}, 'View tracked successfully')
  );
});

/**
 * Track sighting like for algorithm
 */
const trackSightingLike = asyncHandler(async (req, res) => {
  const { sightingId } = req.body;
  
  if (!sightingId) {
    throw new ApiError(400, 'Sighting ID is required');
  }
  
  await algorithmService.trackInteraction(
    req.user._id,
    sightingId,
    'like',
    10 // Like weight
  );
  
  return res.status(200).json(
    new ApiResponse(200, {}, 'Like tracked successfully')
  );
});

/**
 * Track sighting comment for algorithm
 */
const trackSightingComment = asyncHandler(async (req, res) => {
  const { sightingId } = req.body;
  
  if (!sightingId) {
    throw new ApiError(400, 'Sighting ID is required');
  }
  
  await algorithmService.trackInteraction(
    req.user._id,
    sightingId,
    'comment',
    15 // Comment weight
  );
  
  return res.status(200).json(
    new ApiResponse(200, {}, 'Comment tracked successfully')
  );
});

/**
 * Get user's algorithm statistics
 */
const getUserAlgorithmStats = asyncHandler(async (req, res) => {
  const stats = await algorithmService.getUserAlgorithmStats(req.user._id);
  
  return res.status(200).json(
    new ApiResponse(200, stats, 'User algorithm statistics retrieved successfully')
  );
});

/**
 * Toggle user's algorithm on/off
 */
const toggleUserAlgorithm = asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  
  if (typeof enabled !== 'boolean') {
    throw new ApiError(400, 'enabled must be a boolean');
  }
  
  const updatedPreference = await algorithmService.toggleAlgorithm(
    req.user._id,
    enabled
  );
  
  return res.status(200).json(
    new ApiResponse(
      200,
      updatedPreference,
      `Algorithm ${enabled ? 'enabled' : 'disabled'} successfully`
    )
  );
});

/**
 * Reset user's algorithm preferences
 */
const resetUserAlgorithm = asyncHandler(async (req, res) => {
  await algorithmService.resetUserPreferences(req.user._id);
  
  return res.status(200).json(
    new ApiResponse(200, {}, 'Algorithm preferences reset successfully')
  );
});

/**
 * Get personalized feed for user
 */
const getPersonalizedFeed = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  
  console.log('[ALGORITHM CONTROLLER] Getting feed for user:', req.user._id);
  
  const result = await algorithmService.getPersonalizedFeed(
    req.user._id,
    page,
    pageSize
  );
  
  console.log('[ALGORITHM CONTROLLER] Result items count:', result.items.length);
  console.log('[ALGORITHM CONTROLLER] First item has algorithmScore:', result.items[0]?.algorithmScore);
  
  // Disable caching to ensure fresh algorithm scores
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  return res.status(200).json(
    new ApiResponse(200, result, 'Personalized feed retrieved successfully')
  );
});

/**
 * Admin: Reset user's algorithm preferences
 */
const adminResetUserAlgorithm = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  await algorithmService.resetUserPreferences(userId);
  
  return res.status(200).json(
    new ApiResponse(200, {}, 'User algorithm preferences reset successfully')
  );
});

/**
 * Admin: Get user's algorithm statistics
 */
const adminGetUserAlgorithmStats = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  console.log('[ALGORITHM ADMIN] Fetching stats for user:', userId);
  console.log('[ALGORITHM ADMIN] Requested by admin:', req.user?._id || req.admin?._id);
  
  const stats = await algorithmService.getUserAlgorithmStats(userId);
  
  console.log('[ALGORITHM ADMIN] Stats fetched successfully');
  
  return res.status(200).json(
    new ApiResponse(200, stats, 'User algorithm statistics retrieved successfully')
  );
});

/**
 * Admin: Toggle user's algorithm on/off
 */
const adminToggleUserAlgorithm = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { enabled } = req.body;
  
  if (typeof enabled !== 'boolean') {
    throw new ApiError(400, 'enabled must be a boolean');
  }
  
  const updatedPreference = await algorithmService.toggleAlgorithm(
    userId,
    enabled
  );
  
  return res.status(200).json(
    new ApiResponse(
      200,
      updatedPreference,
      `User algorithm ${enabled ? 'enabled' : 'disabled'} successfully`
    )
  );
});

/**
 * Get personalized following feed
 */
const getPersonalizedFollowingFeed = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  
  const result = await algorithmService.getPersonalizedFollowingFeed(
    req.user._id,
    page,
    pageSize
  );
  
  // Disable caching
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  return res.status(200).json(
    new ApiResponse(200, result, 'Personalized following feed retrieved successfully')
  );
});

/**
 * Get personalized local feed (nearby)
 */
const getPersonalizedLocalFeed = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const longitude = parseFloat(req.query.longitude);
  const latitude = parseFloat(req.query.latitude);
  const radiusMeters = parseInt(req.query.radiusMeters) || 5000;
  
  if (isNaN(longitude) || isNaN(latitude)) {
    throw new ApiError(400, 'Valid longitude and latitude are required');
  }
  
  const result = await algorithmService.getPersonalizedLocalFeed(
    req.user._id,
    longitude,
    latitude,
    radiusMeters,
    page,
    pageSize
  );
  
  // Disable caching
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  return res.status(200).json(
    new ApiResponse(200, result, 'Personalized local feed retrieved successfully')
  );
});

export const algorithmController = {
  trackSightingView,
  trackSightingLike,
  trackSightingComment,
  getUserAlgorithmStats,
  toggleUserAlgorithm,
  resetUserAlgorithm,
  getPersonalizedFeed,
  getPersonalizedFollowingFeed,
  getPersonalizedLocalFeed,
  adminResetUserAlgorithm,
  adminGetUserAlgorithmStats,
  adminToggleUserAlgorithm,
};
