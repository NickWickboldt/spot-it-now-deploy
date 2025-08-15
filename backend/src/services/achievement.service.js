import { Achievement } from '../models/achievement.model.js';
import { ApiError } from '../utils/ApiError.util.js';

/**
 * Creates a new achievement.
 * @param {object} achievementData - The data for the new achievement.
 * @returns {Promise<Achievement>} The created achievement object.
 */
const createAchievement = async (achievementData) => {
  const { name, description, iconUrl, pointsReward } = achievementData;

  if (!name || !description || !iconUrl) {
    throw new ApiError(400, 'Name, description, and icon URL are required.');
  }

  const existingAchievement = await Achievement.findOne({ name });
  if (existingAchievement) {
    throw new ApiError(409, 'An achievement with this name already exists.');
  }

  return await Achievement.create({
    name,
    description,
    iconUrl,
    pointsReward,
  });
};

/**
 * Updates an achievement's details.
 * @param {string} achievementId - The ID of the achievement to update.
 * @param {object} updateData - An object with the fields to update.
 * @returns {Promise<Achievement>} The updated achievement object.
 */
const updateAchievement = async (achievementId, updateData) => {
  const achievement = await Achievement.findByIdAndUpdate(
    achievementId,
    { $set: updateData },
    { new: true }
  );
  if (!achievement) {
    throw new ApiError(404, 'Achievement not found');
  }
  return achievement;
};

/**
 * Deletes an achievement.
 * @param {string} achievementId - The ID of the achievement to delete.
 */
const deleteAchievement = async (achievementId) => {
  const achievement = await Achievement.findByIdAndDelete(achievementId);
  if (!achievement) {
    throw new ApiError(404, 'Achievement not found');
  }
  // Note: We might also want to delete all UserAchievement records associated with this.
  // This can be handled here or with database-level hooks later.
};

/**
 * Gets a single achievement by its ID.
 * @param {string} achievementId - The ID of the achievement.
 * @returns {Promise<Achievement>} The achievement object.
 */
const getAchievementById = async (achievementId) => {
  const achievement = await Achievement.findById(achievementId);
  if (!achievement) {
    throw new ApiError(404, 'Achievement not found');
  }
  return achievement;
};

/**
 * Gets all achievements from the database.
 * @returns {Promise<Achievement[]>} An array of all achievement objects.
 */
const getAllAchievements = async () => {
  return await Achievement.find({});
};

/**
 * Gets a single field from an achievement's document.
 * @param {string} achievementId - The ID of the achievement.
 * @param {string} fieldName - The name of the field to retrieve.
 * @returns {Promise<any>} The value of the requested field.
 */
const getAchievementField = async (achievementId, fieldName) => {
  const achievement = await Achievement.findById(achievementId).select(fieldName);
  if (!achievement) {
    throw new ApiError(404, "Achievement not found");
  }
  return achievement[fieldName];
};

/**
 * Updates one or more specific fields for an achievement.
 * @param {string} achievementId - The ID of the achievement to update.
 * @param {object} fieldsToUpdate - An object with the key-value pairs to update.
 * @returns {Promise<Achievement>} The updated achievement object.
 */
const updateAchievementField = async (achievementId, fieldsToUpdate) => {
  const achievement = await Achievement.findByIdAndUpdate(
    achievementId,
    { $set: fieldsToUpdate },
    { new: true }
  );
  if (!achievement) {
    throw new ApiError(404, "Achievement not found");
  }
  return achievement;
};

export const achievementService = {
  createAchievement,
  updateAchievement,
  deleteAchievement,
  getAchievementById,
  getAllAchievements,
  getAchievementField,
  updateAchievementField,
};