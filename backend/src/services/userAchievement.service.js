import { Achievement } from '../models/achievement.model.js';
import { User } from '../models/user.model.js';
import { UserAchievement } from '../models/userAchievement.model.js';
import { ApiError } from '../utils/ApiError.util.js';

/**
 * Awards an achievement to a user.
 * This also adds the achievement's XP reward to the user's total experience points.
 * @param {string} userId - The ID of the user receiving the achievement.
 * @param {string} achievementId - The ID of the achievement being awarded.
 * @returns {Promise<UserAchievement>} The created UserAchievement object.
 */
const awardAchievement = async (userId, achievementId) => {
  // Check if the achievement and user exist
  const achievement = await Achievement.findById(achievementId);
  if (!achievement) {
    throw new ApiError(404, 'Achievement not found.');
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  // Check if the user already has this achievement
  const existingUserAchievement = await UserAchievement.findOne({ user: userId, achievement: achievementId });
  if (existingUserAchievement) {
    throw new ApiError(409, 'User has already earned this achievement.');
  }

  // 1. Create the link between the user and the achievement
  const userAchievement = await UserAchievement.create({
    user: userId,
    achievement: achievementId,
  });

  // 2. Update the user's experience points (use xpReward, fallback to pointsReward for legacy)
  const xpToAward = achievement.xpReward || achievement.pointsReward || 0;
  if (xpToAward > 0) {
    await User.findByIdAndUpdate(userId, {
      $inc: { experiencePoints: xpToAward },
    });
  }

  return userAchievement;
};

/**
 * Revokes an achievement from a user.
 * This also subtracts the XP from the user's total experience points.
 * @param {string} userId - The ID of the user.
 * @param {string} achievementId - The ID of the achievement to revoke.
 */
const revokeAchievement = async (userId, achievementId) => {
    const userAchievement = await UserAchievement.findOneAndDelete({
        user: userId,
        achievement: achievementId,
    });

    if (!userAchievement) {
        throw new ApiError(404, 'User has not earned this achievement, cannot revoke.');
    }

    // Find the XP value of the achievement that was just revoked
    const achievement = await Achievement.findById(achievementId);
    if (achievement) {
        // Subtract the XP from the user's total (use xpReward, fallback to pointsReward)
        const xpToRevoke = achievement.xpReward || achievement.pointsReward || 0;
        if (xpToRevoke > 0) {
            await User.findByIdAndUpdate(userId, {
                $inc: { experiencePoints: -xpToRevoke },
            });
        }
    }
};

/**
 * Gets all achievements earned by a specific user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<UserAchievement[]>} An array of UserAchievement objects, populated with achievement details.
 */
const getAchievementsForUser = async (userId) => {
  return await UserAchievement.find({ user: userId }).populate('achievement');
};

/**
 * Gets all users who have earned a specific achievement.
 * @param {string} achievementId - The ID of the achievement.
 * @returns {Promise<UserAchievement[]>} An array of UserAchievement objects, populated with user details.
 */
const getUsersWithAchievement = async (achievementId) => {
    return await UserAchievement.find({ achievement: achievementId }).populate('user', 'username profilePictureUrl');
};

export const userAchievementService = {
  awardAchievement,
  revokeAchievement,
  getAchievementsForUser,
  getUsersWithAchievement,
};