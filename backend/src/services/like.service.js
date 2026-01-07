import { Comment } from '../models/comment.model.js';
import { Like } from '../models/like.model.js';
import { Sighting } from '../models/sighting.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.util.js';
import { getRandomSoundVerb } from '../utils/animalSounds.js';
import { notificationService } from './notification.service.js';

/**
 * Toggles a like on a sighting for a given user.
 * If the like exists, it's removed (unlike). If it doesn't, it's created (like).
 * @param {string} sightingId - The ID of the sighting to like/unlike.
 * @param {string} userId - The ID of the user performing the action.
 * @returns {Promise<{liked: boolean}>} An object indicating the new like status.
 */
const toggleLike = async (sightingId, userId) => {
  // First, check if the sighting actually exists to avoid orphaned likes.
  const sighting = await Sighting.findById(sightingId).populate('user', 'username notificationsEnabled');
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
    // decrement denormalized counter on Sighting
    await Sighting.findByIdAndUpdate(sightingId, { $inc: { likes: -1 } });
    return { liked: false }; // The user no longer likes this post
  } else {
    // If like does not exist, create it
    await Like.create({
      sighting: sightingId,
      user: userId,
    });
    // increment denormalized counter on Sighting
    await Sighting.findByIdAndUpdate(sightingId, { $inc: { likes: 1 } });
    
    // Send notification to the post owner (but not if they liked their own post)
    const postOwnerId = sighting.user._id.toString();
    const likerId = userId.toString();
    
    if (postOwnerId !== likerId) {
      // Get the liker's username
      const liker = await User.findById(userId, 'username');
      const likerUsername = liker?.username || 'Someone';
      
      // Only send notification if the post owner has notifications enabled
      if (sighting.user.notificationsEnabled !== false) {
        try {
          const animalSound = getRandomSoundVerb();
          await notificationService.sendNotificationToUser(postOwnerId, {
            type: 'sighting_liked',
            title: 'New Like',
            subtitle: `${likerUsername} ${animalSound} you with a like`,
            message: `${likerUsername} liked your sighting: "${sighting.caption?.substring(0, 50) || 'your post'}"`,
            relatedUser: userId,
            relatedSighting: sightingId,
          });
        } catch (error) {
          // Log error but don't fail the like operation
          console.error('Failed to send like notification:', error);
        }
      }
    }
    
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

/**
 * Gets user's activity feed - liked sightings and commented sightings sorted by date
 * @param {string} userId - The ID of the user.
 * @param {number} page - Page number for pagination
 * @param {number} pageSize - Number of items per page
 * @returns {Promise<{activities: Array, hasMore: boolean}>} Activities sorted by date
 */
const getUserActivityFeed = async (userId, page = 1, pageSize = 20) => {
  const skip = (page - 1) * pageSize;
  
  // Get likes with sighting and sighting user populated
  const likes = await Like.find({ user: userId })
    .populate({
      path: 'sighting',
      populate: [
        { path: 'user', select: 'username profilePictureUrl' },
        { path: 'animalId', select: 'commonName scientificName' }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();
  
  // Get comments with sighting and sighting user populated
  const comments = await Comment.find({ user: userId })
    .populate({
      path: 'sighting',
      populate: [
        { path: 'user', select: 'username profilePictureUrl' },
        { path: 'animalId', select: 'commonName scientificName' }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();
  
  // Transform likes into activity items
  const likeActivities = likes
    .filter(like => like.sighting) // Filter out likes with deleted sightings
    .map(like => ({
      type: 'like',
      activityDate: like.createdAt,
      sighting: {
        _id: like.sighting._id,
        caption: like.sighting.caption,
        mediaUrls: like.sighting.mediaUrls,
        createdAt: like.sighting.createdAt,
        likes: like.sighting.likes || 0,
        comments: like.sighting.comments || 0,
        user: like.sighting.user,
        animalId: like.sighting.animalId,
        aiIdentification: like.sighting.aiIdentification,
      },
    }));
  
  // Transform comments into activity items
  const commentActivities = comments
    .filter(comment => comment.sighting) // Filter out comments with deleted sightings
    .map(comment => ({
      type: 'comment',
      activityDate: comment.createdAt,
      commentText: comment.commentText,
      sighting: {
        _id: comment.sighting._id,
        caption: comment.sighting.caption,
        mediaUrls: comment.sighting.mediaUrls,
        createdAt: comment.sighting.createdAt,
        likes: comment.sighting.likes || 0,
        comments: comment.sighting.comments || 0,
        user: comment.sighting.user,
        animalId: comment.sighting.animalId,
        aiIdentification: comment.sighting.aiIdentification,
      },
    }));
  
  // Combine and sort by activity date (most recent first)
  const allActivities = [...likeActivities, ...commentActivities]
    .sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime());
  
  // Deduplicate by sighting ID (keep most recent activity for each sighting)
  const seenSightings = new Set();
  const uniqueActivities = allActivities.filter(activity => {
    const sightingId = activity.sighting._id.toString();
    if (seenSightings.has(sightingId)) {
      return false;
    }
    seenSightings.add(sightingId);
    return true;
  });
  
  // Paginate
  const paginatedActivities = uniqueActivities.slice(skip, skip + pageSize);
  const hasMore = uniqueActivities.length > skip + pageSize;
  
  return {
    activities: paginatedActivities,
    total: uniqueActivities.length,
    hasMore,
  };
};


export const likeService = {
  toggleLike,
  getLikeCountForSighting,
  getUsersWhoLikedSighting,
  getSightingsLikedByUser,
  getUserActivityFeed,
};
