import { searchService } from '../services/search.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';

/**
 * Search across users, animals, and sightings
 * GET /api/v1/search?q=term&type=all|users|animals|sightings&page=1&pageSize=20
 */
export const search = asyncHandler(async (req, res) => {
  const { q = '', type = 'all', page = 1, pageSize = 20 } = req.query;
  const userId = req.user?._id; // Optional - user might not be logged in
  
  if (!q || !q.trim()) {
    return res.status(200).json(
      new ApiResponse(200, { users: [], animals: [], sightings: [] }, 'No search query provided')
    );
  }

  const results = await searchService.search(
    q.trim(),
    type,
    parseInt(page, 10),
    parseInt(pageSize, 10)
  );

  // Add isLikedByUser to sightings if user is logged in
  if (userId && results.sightings.length > 0) {
    const { Like } = await import('../models/like.model.js');
    const sightingIds = results.sightings.map(s => s._id);
    const userLikes = await Like.find({
      user: userId,
      sighting: { $in: sightingIds }
    }).lean();
    
    const likedSightingIds = new Set(userLikes.map(l => l.sighting.toString()));
    
    console.log(`[SEARCH] User ${userId} has ${userLikes.length} likes out of ${sightingIds.length} sightings`);
    console.log(`[SEARCH] Liked sighting IDs:`, Array.from(likedSightingIds));
    
    results.sightings = results.sightings.map(sighting => ({
      ...sighting,
      isLikedByUser: likedSightingIds.has(sighting._id.toString())
    }));
    
    console.log(`[SEARCH] Updated sightings with isLikedByUser flags:`, results.sightings.map(s => ({ id: s._id, isLiked: s.isLikedByUser })));
  }

  return res
    .status(200)
    .set('Cache-Control', 'no-cache, no-store, must-revalidate')
    .set('Pragma', 'no-cache')
    .set('Expires', '0')
    .json(new ApiResponse(200, results, 'Search results retrieved successfully'));
});

/**
 * Get trending search terms
 * GET /api/v1/search/trending
 */
export const getTrendingSearches = asyncHandler(async (req, res) => {
  const trending = await searchService.getTrendingSearches();
  
  return res.status(200).json(
    new ApiResponse(200, trending, 'Trending searches retrieved successfully')
  );
});
