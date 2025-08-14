import { Like } from '../models/like.model.js';
import { Sighting } from '../models/sighting.model.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Toggles a like on a sighting for a given user.
 * If the like exists, it's removed (unlike). If it doesn't, it's created (like).
 * @param {string} sightingId - The ID of the sighting to like/unlike.
 * @param {string} userId - The ID of the user performing the action.
 * @returns {Promise<{liked: boolean}>} An object indicating the new like status.
 */
const toggleLike = async (sightingId, userId) => {
  // First, check if the sighting actually exists to avoid orphaned likes.
  const sighting = await Sighting.findById(sightingId);
  if (!sighting) {
    throw new ApiError(404, 'Sighting not found');
  }

  const existingLike = await Like.findOne({
    sighting: sightingId,
    user: userId,
  });

  if (existingLike) {
    // If like exists, remove it
    await Like.findByIdAndDelete(existingLike._id);
    return { liked: false }; // The user no longer likes this post
  } else {
    // If like does not exist, create it
    await Like.create({
      sighting: sightingId,
      user: userId,
    });
    return { liked: true }; // The user now likes this post
  }
};

/**
 * Gets the number of likes for a specific sighting.
 * @param {string} sightingId - The ID of the sighting.
 * @returns {Promise<number>} The total number of likes.
 */
const getLikeCountForSighting = async (sightingId) => {
  return await Like.countDocuments({ sighting: sightingId });
};

/**
 * Gets a list of all users who liked a specific sighting.
 * @param {string} sightingId - The ID of the sighting.
 * @returns {Promise<Like[]>} An array of like objects, populated with user details.
 */
const getUsersWhoLikedSighting = async (sightingId) => {
  return await Like.find({ sighting: sightingId }).populate('user', 'username profilePictureUrl');
};

/**
 * Gets all sightings that a specific user has liked.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Like[]>} An array of like objects, populated with sighting details.
 */
const getSightingsLikedByUser = async (userId) => {
    return await Like.find({ user: userId }).populate('sighting');
};


export const likeService = {
  toggleLike,
  getLikeCountForSighting,
  getUsersWhoLikedSighting,
  getSightingsLikedByUser,
};
