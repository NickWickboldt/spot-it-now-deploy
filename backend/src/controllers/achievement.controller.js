import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { achievementService } from '../services/achievement.service.js';

/**
 * Controller to create a new achievement.
 */
const createAchievement = asyncHandler(async (req, res) => {
  const newAchievement = await achievementService.createAchievement(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, newAchievement, 'Achievement created successfully'));
});

/**
 * Controller to update an achievement's details.
 */
const updateAchievement = asyncHandler(async (req, res) => {
  const { achievementId } = req.params;
  const updatedAchievement = await achievementService.updateAchievement(achievementId, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, updatedAchievement, 'Achievement updated successfully'));
});

/**
 * Controller to delete an achievement.
 */
const deleteAchievement = asyncHandler(async (req, res) => {
  const { achievementId } = req.params;
  await achievementService.deleteAchievement(achievementId);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Achievement deleted successfully'));
});

/**
 * Controller to get a single achievement by its ID.
 */
const getAchievementById = asyncHandler(async (req, res) => {
  const { achievementId } = req.params;
  const achievement = await achievementService.getAchievementById(achievementId);
  return res
    .status(200)
    .json(new ApiResponse(200, achievement, 'Achievement fetched successfully'));
});

/**
 * Controller to get all achievements.
 */
const getAllAchievements = asyncHandler(async (req, res) => {
  const achievements = await achievementService.getAllAchievements();
  return res
    .status(200)
    .json(new ApiResponse(200, achievements, 'All achievements fetched successfully'));
});

/**
 * Controller to get a single field from an achievement.
 */
const getAchievementField = asyncHandler(async (req, res) => {
    const { achievementId, fieldName } = req.params;
    const fieldValue = await achievementService.getAchievementField(achievementId, fieldName);
    return res.status(200).json(new ApiResponse(200, { [fieldName]: fieldValue }, `${fieldName} fetched successfully`));
});

/**
 * Controller to set/update a single field for an achievement.
 */
const setAchievementField = asyncHandler(async (req, res) => {
    const { achievementId } = req.params;
    // The request body should contain the field to update, e.g., { "name": "New Name" }
    const updatedAchievement = await achievementService.updateAchievementField(achievementId, req.body);
    return res.status(200).json(new ApiResponse(200, updatedAchievement, `Achievement field updated successfully`));
});


export {
  createAchievement,
  updateAchievement,
  deleteAchievement,
  getAchievementById,
  getAllAchievements,
  getAchievementField,
  setAchievementField,
};