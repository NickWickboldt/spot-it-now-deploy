import { Follow } from '../models/follow.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.util.js';
import { getRandomSoundVerb } from '../utils/animalSounds.js';
import { notificationService } from './notification.service.js';

/**
 * Toggles a follow relationship between two users.
 * @param {string} followerId - The ID of the user initiating the action.
 * @param {string} followingId - The ID of the user to be followed/unfollowed.
 * @returns {Promise<{isFollowing: boolean}>} An object indicating the new follow status.
 */
const toggleFollow = async (followerId, followingId) => {
  // Prevent a user from following themselves
  if (followerId === followingId) {
    throw new ApiError(400, 'You cannot follow yourself.');
  }

  // Check if the user to be followed exists
  const userToFollow = await User.findById(followingId);
  if (!userToFollow) {
    throw new ApiError(404, 'User you are trying to follow does not exist.');
  }

  const existingFollow = await Follow.findOne({
    follower: followerId,
    following: followingId,
  });

  if (existingFollow) {
    // If the follow relationship exists, remove it
    await Follow.findByIdAndDelete(existingFollow._id);
    return { isFollowing: false };
  } else {
    // If it does not exist, create it
    await Follow.create({
      follower: followerId,
      following: followingId,
    });
    
    // Send notification to the user being followed
    const follower = await User.findById(followerId, 'username');
    const followerUsername = follower?.username || 'Someone';
    
    if (userToFollow.notificationsEnabled !== false) {
      try {
        const animalSound = getRandomSoundVerb();
        await notificationService.sendNotificationToUser(followingId, {
          type: 'new_follower',
          title: 'New Follower',
          subtitle: `${followerUsername} ${animalSound} you with a follow`,
          message: `${followerUsername} is now following you!`,
          relatedUser: followerId,
        });
      } catch (error) {
        console.error('Failed to send follow notification:', error);
      }
    }
    
    return { isFollowing: true };
  }
};

/**
 * Gets a list of users who are following a specific user.
 * @param {string} userId - The ID of the user whose followers are to be fetched.
 * @returns {Promise<Follow[]>} An array of follow objects, populated with follower details.
 */
const getFollowers = async (userId) => {
  return await Follow.find({ following: userId }).populate('follower', 'username profilePictureUrl');
};

/**
 * Gets a list of users that a specific user is following.
 * @param {string} userId - The ID of the user whose followed accounts are to be fetched.
 * @returns {Promise<Follow[]>} An array of follow objects, populated with following details.
 */
const getFollowing = async (userId) => {
  return await Follow.find({ follower: userId }).populate('following', 'username profilePictureUrl');
};

/**
 * Gets the follower and following counts for a specific user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<{followersCount: number, followingCount: number}>}
 */
const getFollowCounts = async (userId) => {
    const followersCount = await Follow.countDocuments({ following: userId });
    const followingCount = await Follow.countDocuments({ follower: userId });
    return { followersCount, followingCount };
};

/**
 * Check if a user is following another user
 * @param {string} followerId - The user who might be following
 * @param {string} followingId - The user who might be followed
 * @returns {Promise<boolean>}
 */
const checkIsFollowing = async (followerId, followingId) => {
  const existingFollow = await Follow.findOne({
    follower: followerId,
    following: followingId,
  });
  return !!existingFollow;
};


export const followService = {
  toggleFollow,
  getFollowers,
  getFollowing,
  getFollowCounts,
  checkIsFollowing,
};
