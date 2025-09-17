import { userDiscoveryService } from '../services/userDiscovery.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';

/**
 * Get user's discovery record with all discovered animals
 * GET /api/v1/users/me/discoveries
 */
const getUserDiscoveries = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userDiscovery = await userDiscoveryService.getUserDiscovery(userId);
  
  return res
    .status(200)
    .json(new ApiResponse(200, userDiscovery, 'User discoveries fetched successfully'));
});

/**
 * Get user's discovery statistics
 * GET /api/v1/users/me/discovery-stats
 */
const getDiscoveryStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const stats = await userDiscoveryService.getDiscoveryStats(userId);
  
  return res
    .status(200)
    .json(new ApiResponse(200, stats, 'Discovery stats fetched successfully'));
});

/**
 * Check if user has discovered a specific animal
 * GET /api/v1/users/me/discoveries/check/:animalId
 */
const checkAnimalDiscovered = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { animalId } = req.params;
  
  const discovered = await userDiscoveryService.hasDiscovered(userId, animalId);
  
  return res
    .status(200)
    .json(new ApiResponse(200, { discovered }, 'Discovery status checked successfully'));
});

/**
 * Manually add a discovery (for testing or admin purposes)
 * POST /api/v1/users/me/discoveries
 */
const addDiscovery = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { animalId, sightingId, verifiedBy = 'USER' } = req.body;
  
  const isNewDiscovery = await userDiscoveryService.addDiscovery(userId, animalId, sightingId, verifiedBy);
  
  const message = isNewDiscovery ? 'New animal discovered!' : 'Animal already discovered';
  
  return res
    .status(200)
    .json(new ApiResponse(200, { isNewDiscovery }, message));
});

/**
 * Update verification status for an existing discovery
 * PATCH /api/v1/users/me/discoveries/:animalId/verify
 */
const updateVerification = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { animalId } = req.params;
  const { verifiedBy } = req.body;
  
  const updated = await userDiscoveryService.updateVerification(userId, animalId, verifiedBy);
  
  const message = updated ? 'Verification updated successfully' : 'Discovery not found';
  
  return res
    .status(200)
    .json(new ApiResponse(200, { updated }, message));
});

/**
 * Get leaderboard of top discoverers (bonus feature)
 * GET /api/v1/discoveries/leaderboard
 */
const getLeaderboard = asyncHandler(async (req, res) => {
  // This would require aggregation pipeline to get top users by discoveries
  // Leaving as placeholder for future implementation
  return res
    .status(200)
    .json(new ApiResponse(200, [], 'Leaderboard feature coming soon'));
});

export {
    addDiscovery, checkAnimalDiscovered, getDiscoveryStats, getLeaderboard, getUserDiscoveries, updateVerification
};
