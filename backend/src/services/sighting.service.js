import { Sighting } from '../models/sighting.model.js';
import { ApiError } from '../utils/ApiError.util.js';
import { log } from '../utils/logger.util.js';

/**
 * Creates a new sighting post.
 * @param {string} userId - The ID of the user creating the sighting.
 * @param {object} sightingData - The data for the new sighting.
 * @returns {Promise<Sighting>} The created sighting object.
 */
const createSighting = async (userId, userName, sightingData) => {
  const { mediaUrls, latitude, longitude, caption, isPrivate, identification } = sightingData || {};

  const mediaUrlsValid = Array.isArray(mediaUrls) && mediaUrls.length > 0 && mediaUrls.every(u => typeof u === 'string' && u.trim().length > 0);
  const latNum = latitude !== undefined && latitude !== null ? Number(latitude) : null;
  const longNum = longitude !== undefined && longitude !== null ? Number(longitude) : null;
  const coordsValid = latNum !== null && longNum !== null && !Number.isNaN(latNum) && !Number.isNaN(longNum);

  if (!mediaUrlsValid || !coordsValid) {
    log.warn('sighting-service', 'Validation failed for createSighting', { mediaUrlsValid, coordsValid });
    throw new ApiError(400, 'Media URLs and location coordinates are required.');
  }

  const location = {
    type: 'Point',
    coordinates: [longNum, latNum], // GeoJSON format: [longitude, latitude]
  };

  const sighting = await Sighting.create({
    user: userId,
    userName,
    mediaUrls,
    location,
    caption,
    isPrivate,
    identification: identification || null,
  });

  log.info('sighting-service', 'Sighting created', { sightingId: sighting._id, userId });
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
 * Returns all sightings (admin use).
 * @returns {Promise<Sighting[]>}
 */
const getAllSightings = async () => {
  return await Sighting.find({}).sort({ createdAt: -1 });
};

/**
 * Returns paginated sightings with optional text search.
 * @param {object} options { page, pageSize, q }
 */
const getSightingsPage = async ({ page = 1, pageSize = 20, q = '' } = {}) => {
  const skip = (page - 1) * pageSize;
  const filter = {};
  if (q && q.trim()) {
    const regex = new RegExp(q.trim(), 'i');
    // Search caption or user username (requires populate later) or animal commonName
    filter.$or = [{ caption: regex }];
  }

  const [items, total] = await Promise.all([
    Sighting.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).populate('user', 'username profilePictureUrl').populate('animal', 'commonName scientificName'),
    Sighting.countDocuments(filter),
  ]);

  return { items, total, page, pageSize };
};

/**
 * Returns most recent sightings in pages (public feed).
 * @param {{page?: number, pageSize?: number}} options
 */
const getRecentSightingsPage = async ({ page = 1, pageSize = 20 } = {}) => {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    Sighting.find({}).sort({ createdAt: -1 }).skip(skip).limit(pageSize).populate('user', 'username profilePictureUrl').populate('animal', 'commonName'),
    Sighting.countDocuments({}),
  ]);
  return { items, total, page, pageSize };
};

/**
 * Updates one or more specific fields for a sighting.
 * @param {string} sightingId - The ID of the sighting to update.
 * @param {object} fieldsToUpdate - An object with the key-value pairs to update.
 * @returns {Promise<Sighting>} The updated sighting object.
 */
const updateSightingField = async (sightingId, fieldsToUpdate) => {
  // Defensive: if frontend sends empty string to clear animal, coerce to null so Mongoose
  // doesn't attempt to cast an empty string to ObjectId (which throws a CastError).
  const update = { ...fieldsToUpdate };
  if (Object.prototype.hasOwnProperty.call(update, 'animal')) {
    // treat empty string or all-whitespace as null
    if (update.animal === '' || (typeof update.animal === 'string' && update.animal.trim() === '')) {
      update.animal = null;
    }
  }
  if (Object.prototype.hasOwnProperty.call(update, 'aiIdentification')) {
    if (update.aiIdentification === '' || (typeof update.aiIdentification === 'string' && update.aiIdentification.trim() === '')) {
      update.aiIdentification = null;
    }
  }
  if (Object.prototype.hasOwnProperty.call(update, 'identification')) {
    if (!update.identification || typeof update.identification !== 'object') {
      update.identification = null;
    }
  }

  const sighting = await Sighting.findByIdAndUpdate(
    sightingId,
    { $set: update },
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
  getSightingsPage
  ,getRecentSightingsPage
};
