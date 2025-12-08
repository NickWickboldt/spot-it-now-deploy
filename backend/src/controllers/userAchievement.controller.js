import { badgeService } from '../services/badge.service.js';
import { userAchievementService } from '../services/userAchievement.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';

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

/**
 * Controller to get badge progress for the authenticated user.
 * Returns all badges with their earned status and progress percentage.
 */
const getMyBadgeProgress = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const badgesWithProgress = await badgeService.getBadgeProgress(userId);
  
  // Group badges by category for easier frontend display
  const grouped = {
    category_mastery: [],
    rarity_hunting: [],
    milestones: [],
    challenges: [],
    special: [],
    social: [],
  };
  
  for (const badge of badgesWithProgress) {
    const category = badge.category || 'special';
    if (grouped[category]) {
      grouped[category].push(badge);
    } else {
      grouped.special.push(badge);
    }
  }
  
  // Calculate summary stats
  const earned = badgesWithProgress.filter(b => b.isEarned);
  const summary = {
    totalBadges: badgesWithProgress.length,
    earnedCount: earned.length,
    totalXPFromBadges: earned.reduce((sum, b) => sum + (b.xpReward || 0), 0),
    completionPercentage: Math.round((earned.length / badgesWithProgress.length) * 100),
  };
  
  return res
    .status(200)
    .json(new ApiResponse(200, { badges: grouped, all: badgesWithProgress, summary }, 'Badge progress fetched successfully'));
});

/**
 * Controller to get achievements for the authenticated user.
 */
const getMyAchievements = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const achievements = await userAchievementService.getAchievementsForUser(userId);
  return res
    .status(200)
    .json(new ApiResponse(200, achievements, 'Your achievements fetched successfully'));
});


export {
    awardAchievementToUser, getAchievementsForUser, getMyAchievements, getMyBadgeProgress, getUsersWithAchievement, revokeAchievementFromUser
};

