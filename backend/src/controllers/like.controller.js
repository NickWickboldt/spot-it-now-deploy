import { likeService } from '../services/like.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';

/**
 * Controller to toggle a like on a specific sighting.
 */
const toggleSightingLike = asyncHandler(async (req, res) => {
  const { sightingId } = req.params;
  const userId = req.user._id; // From verifyJWT middleware

  const result = await likeService.toggleLike(sightingId, userId);
  const message = result.liked ? 'Sighting liked successfully' : 'Sighting unliked successfully';

  return res.status(200).json(new ApiResponse(200, result, message));
});

/**
 * Controller to get all data about likes for a specific sighting.
 */
const getSightingLikes = asyncHandler(async (req, res) => {
  const { sightingId } = req.params;

  const likeCount = await likeService.getLikeCountForSighting(sightingId);
  const users = await likeService.getUsersWhoLikedSighting(sightingId);

  const likeData = {
    count: likeCount,
    users: users,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, likeData, 'Sighting likes fetched successfully'));
});

/**
 * Controller to get all sightings liked by a specific user.
 */
const getLikedSightingsByUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const likedSightings = await likeService.getSightingsLikedByUser(userId);
    return res
        .status(200)
        .json(new ApiResponse(200, likedSightings, 'User\'s liked sightings fetched successfully'));
});

/**
 * Controller to get user's activity feed (liked and commented sightings)
 */
const getUserActivityFeed = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    
    const result = await likeService.getUserActivityFeed(
      userId, 
      parseInt(page, 10), 
      parseInt(pageSize, 10)
    );
    
    return res
        .status(200)
        .set('Cache-Control', 'no-cache, no-store, must-revalidate')
        .json(new ApiResponse(200, result, 'User activity feed fetched successfully'));
});


export {
    getLikedSightingsByUser, getSightingLikes, getUserActivityFeed, toggleSightingLike
};

