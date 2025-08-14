import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { userAchievementService } from '../services/userAchievement.service.js';

/**
 * Controller to award an achievement to a specific user.
 */
const awardAchievementToUser = asyncHandler(async (req, res) => {
  const { userId, achievementId } = req.body;
  const newUserAchievement = await userAchievementService.awardAchievement(userId, achievementId);
  return res
    .status(201)
    .json(new ApiResponse(201, newUserAchievement, 'Achievement awarded successfully'));
});

/**
 * Controller to revoke an achievement from a user.
 */
const revokeAchievementFromUser = asyncHandler(async (req, res) => {
    const { userId, achievementId } = req.body;
    await userAchievementService.revokeAchievement(userId, achievementId);
    return res
        .status(200)
        .json(new ApiResponse(200, {}, 'Achievement has been successfully revoked'));
});

/**
 * Controller to get all achievements for a specific user.
 */
const getAchievementsForUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const achievements = await userAchievementService.getAchievementsForUser(userId);
  return res
    .status(200)
    .json(new ApiResponse(200, achievements, 'User achievements fetched successfully'));
});

/**
 * Controller to get all users who have earned a specific achievement.
 */
const getUsersWithAchievement = asyncHandler(async (req, res) => {
    const { achievementId } = req.params;
    const users = await userAchievementService.getUsersWithAchievement(achievementId);
    return res
        .status(200)
        .json(new ApiResponse(200, users, 'Users with this achievement fetched successfully'));
});


export {
  awardAchievementToUser,
  revokeAchievementFromUser,
  getAchievementsForUser,
  getUsersWithAchievement,
};
