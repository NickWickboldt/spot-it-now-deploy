import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { followService } from '../services/follow.service.js';

/**
 * Controller to toggle a follow on another user.
 */
const toggleFollow = asyncHandler(async (req, res) => {
  // The user to be followed is identified by the ID in the URL parameters.
  const { userIdToFollow } = req.params;
  // The user initiating the follow is the currently logged-in user.
  const followerId = req.user._id;

  const result = await followService.toggleFollow(followerId, userIdToFollow);
  const message = result.isFollowing ? 'Successfully followed user' : 'Successfully unfollowed user';

  return res.status(200).json(new ApiResponse(200, result, message));
});

/**
 * Controller to get a list of a user's followers.
 */
const getFollowers = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const followers = await followService.getFollowers(userId);
  return res
    .status(200)
    .json(new ApiResponse(200, followers, "Followers fetched successfully"));
});

/**
 * Controller to get a list of users a user is following.
 */
const getFollowing = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const following = await followService.getFollowing(userId);
  return res
    .status(200)
    .json(new ApiResponse(200, following, "Following list fetched successfully"));
});

/**
 * Controller to get the follower and following counts for a user.
 */
const getFollowCounts = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const counts = await followService.getFollowCounts(userId);
    return res
        .status(200)
        .json(new ApiResponse(200, counts, "Follow counts fetched successfully"));
});

export {
  toggleFollow,
  getFollowers,
  getFollowing,
  getFollowCounts,
};
