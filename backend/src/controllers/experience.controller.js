import { experienceService } from '../services/experience.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { log } from '../utils/logger.util.js';

/**
 * Get the current user's level and XP information
 */
const getMyLevelInfo = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  log.route('experience-controller', 'Get my level info', { userId });
  
  const levelInfo = await experienceService.getUserLevelInfo(userId);
  
  return res
    .status(200)
    .json(new ApiResponse(200, levelInfo, 'Level info retrieved successfully'));
});

/**
 * Get another user's level info (public profile data)
 */
const getUserLevelInfo = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  log.route('experience-controller', 'Get user level info', { targetUserId: userId });
  
  const levelInfo = await experienceService.getUserLevelInfo(userId);
  
  return res
    .status(200)
    .json(new ApiResponse(200, levelInfo, 'Level info retrieved successfully'));
});

/**
 * Get the XP configuration (rarity values, level thresholds, etc.)
 */
const getXPConfig = asyncHandler(async (req, res) => {
  log.route('experience-controller', 'Get XP config');
  
  const config = experienceService.getXPConfig();
  
  return res
    .status(200)
    .json(new ApiResponse(200, config, 'XP configuration retrieved successfully'));
});

/**
 * Calculate level from XP (utility endpoint)
 */
const calculateLevelFromXP = asyncHandler(async (req, res) => {
  const { xp } = req.query;
  const xpAmount = parseInt(xp) || 0;
  
  const levelProgress = experienceService.getLevelProgress(xpAmount);
  
  return res
    .status(200)
    .json(new ApiResponse(200, levelProgress, 'Level calculated successfully'));
});

export const experienceController = {
  getMyLevelInfo,
  getUserLevelInfo,
  getXPConfig,
  calculateLevelFromXP,
};
