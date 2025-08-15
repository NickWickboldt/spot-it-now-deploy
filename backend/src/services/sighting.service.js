import { Sighting } from '../models/sighting.model.js';
import { ApiError } from '../utils/ApiError.util.js';

/**
 * Creates a new sighting post.
 * @param {string} userId - The ID of the user creating the sighting.
 * @param {object} sightingData - The data for the new sighting.
 * @returns {Promise<Sighting>} The created sighting object.
 */
const createSighting = async (userId, sightingData) => {
  const { mediaUrls, latitude, longitude, caption, isPrivate } = sightingData;

  if (!mediaUrls || !latitude || !longitude) {
    throw new ApiError(400, 'Media URLs and location coordinates are required.');
  }

  const location = {
    type: 'Point',
    coordinates: [longitude, latitude], // GeoJSON format: [longitude, latitude]
  };

  const sighting = await Sighting.create({
    user: userId,
    mediaUrls,
    location,
    caption,
    isPrivate,
  });

  return sighting;
};

/**
 * Deletes a sighting.
 * @param {string} sightingId - The ID of the sighting to delete.
 * @param {string} userId - The ID of the user attempting to delete.
 * @param {boolean} isAdmin - Flag indicating if the user is an admin.
 */
const deleteSighting = async (sightingId, userId, isAdmin = false) => {
  const sighting = await Sighting.findById(sightingId);

  if (!sighting) {
    throw new ApiError(404, 'Sighting not found');
  }

  // Allow deletion only if the user is the owner or an admin
  if (sighting.user.toString() !== userId && !isAdmin) {
    throw new ApiError(403, 'You are not authorized to delete this sighting.');
  }

  await Sighting.findByIdAndDelete(sightingId);
};

/**
 * Gets a single sighting by its ID.
 * @param {string} sightingId - The ID of the sighting.
 * @returns {Promise<Sighting>} The sighting object.
 */
const getSightingById = async (sightingId) => {
  const sighting = await Sighting.findById(sightingId).populate('user', 'username profilePictureUrl').populate('animal', 'commonName scientificName');
  if (!sighting) {
    throw new ApiError(404, 'Sighting not found');
  }
  return sighting;
};

/**
 * Gets all sightings for a specific user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Sighting[]>} An array of sighting objects.
 */
const getSightingsByUser = async (userId) => {
  return await Sighting.find({ user: userId }).sort({ createdAt: -1 });
};

/**
 * Gets all sightings of a specific animal.
 * @param {string} animalId - The ID of the animal.
 * @returns {Promise<Sighting[]>} An array of sighting objects.
 */
const getSightingsByAnimal = async (animalId) => {
  return await Sighting.find({ animal: animalId }).sort({ createdAt: -1 });
};

/**
 * Finds sightings within a certain radius of a geographic point.
 * @param {number} longitude - The longitude of the center point.
 * @param {number} latitude - The latitude of the center point.
 * @param {number} maxDistanceInMeters - The radius in meters.
 * @returns {Promise<Sighting[]>} An array of nearby sighting objects.
 */
const findSightingsNear = async (longitude, latitude, maxDistanceInMeters = 10000) => {
    return await Sighting.find({
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [longitude, latitude]
                },
                $maxDistance: maxDistanceInMeters
            }
        }
    });
};

/**
 * Updates one or more specific fields for a sighting.
 * @param {string} sightingId - The ID of the sighting to update.
 * @param {object} fieldsToUpdate - An object with the key-value pairs to update.
 * @returns {Promise<Sighting>} The updated sighting object.
 */
const updateSightingField = async (sightingId, fieldsToUpdate) => {
  const sighting = await Sighting.findByIdAndUpdate(
    sightingId,
    { $set: fieldsToUpdate },
    { new: true }
  );
  if (!sighting) {
    throw new ApiError(404, 'Sighting not found');
  }
  return sighting;
};

/**
 * Adds a new media URL to a sighting's mediaUrls array.
 * @param {string} sightingId - The ID of the sighting.
 * @param {string} mediaUrl - The new media URL to add.
 * @returns {Promise<Sighting>} The updated sighting object.
 */
const addMediaUrlToSighting = async (sightingId, mediaUrl) => {
  const sighting = await Sighting.findByIdAndUpdate(
    sightingId,
    { $push: { mediaUrls: mediaUrl } },
    { new: true }
  );
  if (!sighting) {
    throw new ApiError(404, 'Sighting not found');
  }
  return sighting;
};

/**
 * Removes a media URL from a sighting's mediaUrls array.
 * @param {string} sightingId - The ID of the sighting.
 * @param {string} mediaUrl - The media URL to remove.
 * @returns {Promise<Sighting>} The updated sighting object.
 */
const removeMediaUrlFromSighting = async (sightingId, mediaUrl) => {
  const sighting = await Sighting.findByIdAndUpdate(
    sightingId,
    { $pull: { mediaUrls: mediaUrl } },
    { new: true }
  );
  if (!sighting) {
    throw new ApiError(404, 'Sighting not found');
  }
  return sighting;
};

export const sightingService = {
  createSighting,
  deleteSighting,
  getSightingById,
  getSightingsByUser,
  getSightingsByAnimal,
  findSightingsNear,
  updateSightingField,
  addMediaUrlToSighting,
  removeMediaUrlFromSighting,
};
