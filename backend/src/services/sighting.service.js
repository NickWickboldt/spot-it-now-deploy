import { Comment } from '../models/comment.model.js';
import { Follow } from '../models/follow.model.js';
import { Like } from '../models/like.model.js';
import { Sighting } from '../models/sighting.model.js';
import { ApiError } from '../utils/ApiError.util.js';
import { log } from '../utils/logger.util.js';
import { animalService } from './animal.service.js';
import { userDiscoveryService } from './userDiscovery.service.js';

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

  // Try to find matching animal if identification is provided
  let linkedAnimalId = null;
  if (identification && (identification.commonName || identification.scientificName)) {
    try {
      const matchedAnimal = await animalService.findAnimalByIdentification(identification);
      if (matchedAnimal) {
        linkedAnimalId = matchedAnimal._id;
        log.info('sighting-service', 'Animal linked to sighting', { 
          animalId: linkedAnimalId, 
          commonName: identification.commonName,
          scientificName: identification.scientificName
        });
      } else {
        log.warn('sighting-service', 'No animal found for identification', { 
          commonName: identification.commonName,
          scientificName: identification.scientificName 
        });
      }
    } catch (error) {
      log.warn('sighting-service', 'Error linking animal to sighting', { error: error.message });
    }
  }

  // Set verification flags based on identification source
  let verificationFlags = {
    verifiedByAI: false,
    verifiedByUser: false,
    verifiedByCommunity: false
  };
  
  if (identification && identification.source) {
    if (identification.source === 'AI') {
      verificationFlags.verifiedByAI = true;
    } else if (identification.source === 'USER') {
      verificationFlags.verifiedByUser = true;
    } else if (identification.source === 'COMMUNITY') {
      verificationFlags.verifiedByCommunity = true;
    }
  }

  const sighting = await Sighting.create({
    user: userId,
    userName,
    mediaUrls,
    location,
    caption,
    isPrivate,
    identification: identification || null,
    animal: linkedAnimalId, // Link the matched animal
    ...verificationFlags, // Add verification flags
  });

  // Auto-add discovery if animal is identified and linked
  if (linkedAnimalId && identification) {
    try {
      const verifiedBy = identification.source === 'USER' ? 'USER' : 'AI';
      await userDiscoveryService.addDiscovery(userId, linkedAnimalId, sighting._id, verifiedBy);
      log.info('sighting-service', 'Discovery added for sighting', { 
        sightingId: sighting._id, 
        userId, 
        animalId: linkedAnimalId,
        verifiedBy 
      });
    } catch (error) {
      // Don't fail sighting creation if discovery fails
      log.warn('sighting-service', 'Failed to add discovery for sighting', { 
        sightingId: sighting._id, 
        error: error.message 
      });
    }
  }

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
  const sighting = await Sighting.findById(sightingId).select('user');

  if (!sighting) {
    throw new ApiError(404, 'Sighting not found');
  }

  const ownerId = String(sighting.user);
  const currentId = String(userId);

  // Allow deletion only if the user is the owner or an admin
  if (ownerId !== currentId && !isAdmin) {
    // add diagnostic info to server logs only
    try { log.warn('sighting-service', 'Delete forbidden', { sightingId, ownerId, currentId, isAdmin }); } catch {}
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
  // Public-facing: only non-private posts
  return await Sighting.find({ user: userId, isPrivate: { $ne: true } }).sort({ createdAt: -1 });
};

// Internal use for owner/admin: includes private posts
const getSightingsByUserAll = async (userId) => {
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
    Sighting.find({ isPrivate: { $ne: true } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('user', 'username profilePictureUrl')
      .populate('animal', 'commonName')
      .lean(),
    Sighting.countDocuments({ isPrivate: { $ne: true } }),
  ]);

  // Ensure comment counts are present and accurate for the page items.
  // Use aggregation to compute counts for these sighting IDs, then merge.
  try {
    const ids = items.map((doc) => doc._id);
    const counts = await Comment.aggregate([
      { $match: { sighting: { $in: ids } } },
      { $group: { _id: '$sighting', count: { $sum: 1 } } },
    ]);
    const map = new Map(counts.map((c) => [String(c._id), c.count]));
    items.forEach((doc) => {
      const key = String(doc._id);
      const aggCount = map.get(key) || 0;
      // Prefer denormalized value if present and positive; otherwise use aggregation count
      const denorm = typeof doc.comments === 'number' ? doc.comments : 0;
      doc.comments = denorm > 0 ? denorm : aggCount;
    });
  } catch (e) {
    // If aggregation fails, silently ignore to keep feed working
  }

  // Ensure like counts are present for legacy data as well
  try {
    const ids = items.map((doc) => doc._id);
    const likeCounts = await Like.aggregate([
      { $match: { sighting: { $in: ids } } },
      { $group: { _id: '$sighting', count: { $sum: 1 } } },
    ]);
    const likeMap = new Map(likeCounts.map((c) => [String(c._id), c.count]));
    items.forEach((doc) => {
      const key = String(doc._id);
      const aggCount = likeMap.get(key) || 0;
      const denorm = typeof doc.likes === 'number' ? doc.likes : 0;
      doc.likes = denorm > 0 ? denorm : aggCount;
    });
  } catch (e) {
    // ignore
  }

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

  // Get the original sighting to compare identification changes
  const originalSighting = await Sighting.findById(sightingId);
  if (!originalSighting) {
    throw new ApiError(404, 'Sighting not found');
  }

  // Try to link animal if identification is being updated
  if (update.identification && (update.identification.commonName || update.identification.scientificName)) {
    try {
      const matchedAnimal = await animalService.findAnimalByIdentification(update.identification);
      if (matchedAnimal) {
        update.animal = matchedAnimal._id;
        
        // Update verification flags based on identification source
        if (update.identification.source === 'AI') {
          update.verifiedByAI = true;
        } else if (update.identification.source === 'USER') {
          update.verifiedByUser = true;
        } else if (update.identification.source === 'COMMUNITY') {
          update.verifiedByCommunity = true;
        }
        
        log.info('sighting-service', 'Animal linked to sighting update', { 
          sightingId,
          animalId: matchedAnimal._id, 
          commonName: update.identification.commonName,
          scientificName: update.identification.scientificName,
          verificationSource: update.identification.source
        });
      } else {
        log.warn('sighting-service', 'No animal found for identification update', { 
          sightingId,
          commonName: update.identification.commonName,
          scientificName: update.identification.scientificName 
        });
        // Clear animal link if identification doesn't match any animal
        update.animal = null;
      }
    } catch (error) {
      log.warn('sighting-service', 'Error linking animal to sighting update', { sightingId, error: error.message });
      update.animal = null;
    }
  }

  const sighting = await Sighting.findByIdAndUpdate(
    sightingId,
    { $set: update },
    { new: true }
  );

  // Handle discovery updates when identification is added or changed
  if (update.animal && update.identification) {
    try {
      const verifiedBy = update.identification.source === 'USER' ? 'USER' : 'AI';
      await userDiscoveryService.addDiscovery(
        originalSighting.user,
        update.animal,
        sightingId,
        verifiedBy
      );
      log.info('sighting-service', 'Discovery added/updated for sighting update', {
        sightingId,
        userId: originalSighting.user,
        animalId: update.animal,
        verifiedBy
      });
    } catch (error) {
      // Don't fail sighting update if discovery fails
      log.warn('sighting-service', 'Failed to add/update discovery for sighting', {
        sightingId,
        error: error.message
      });
    }
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
  getSightingsByUserAll,
  getSightingsByAnimal,
  findSightingsNear,
  updateSightingField,
  addMediaUrlToSighting,
  removeMediaUrlFromSighting,
  getSightingsPage
  ,getRecentSightingsPage
  ,getFollowingRecentSightingsPage: async ({ userId, page = 1, pageSize = 20 } = {}) => {
    const skip = (page - 1) * pageSize;

    // Find all users that this user follows
    const follows = await Follow.find({ follower: userId }).select('following');
    const followingIds = follows.map(f => f.following);

    if (!followingIds.length) {
      return { items: [], total: 0, page, pageSize };
    }

    const [items, total] = await Promise.all([
      Sighting.find({ user: { $in: followingIds }, isPrivate: { $ne: true } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('user', 'username profilePictureUrl')
        .populate('animal', 'commonName')
        .lean(),
      Sighting.countDocuments({ user: { $in: followingIds }, isPrivate: { $ne: true } }),
    ]);

    // Attach accurate comment counts for these items
    try {
      const ids = items.map((doc) => doc._id);
      const counts = await Comment.aggregate([
        { $match: { sighting: { $in: ids } } },
        { $group: { _id: '$sighting', count: { $sum: 1 } } },
      ]);
      const map = new Map(counts.map((c) => [String(c._id), c.count]));
      items.forEach((doc) => {
        const key = String(doc._id);
        const aggCount = map.get(key) || 0;
        const denorm = typeof doc.comments === 'number' ? doc.comments : 0;
        doc.comments = denorm > 0 ? denorm : aggCount;
      });
    } catch (e) {
      // ignore to keep feed resilient
    }

    // Attach like counts as well
    try {
      const ids = items.map((doc) => doc._id);
      const likeCounts = await Like.aggregate([
        { $match: { sighting: { $in: ids } } },
        { $group: { _id: '$sighting', count: { $sum: 1 } } },
      ]);
      const likeMap = new Map(likeCounts.map((c) => [String(c._id), c.count]));
      items.forEach((doc) => {
        const key = String(doc._id);
        const aggCount = likeMap.get(key) || 0;
        const denorm = typeof doc.likes === 'number' ? doc.likes : 0;
        doc.likes = denorm > 0 ? denorm : aggCount;
      });
    } catch (e) {
      // ignore
    }

    return { items, total, page, pageSize };
  }
  
  /**
   * Updates verification status for a sighting.
   * @param {string} sightingId - The ID of the sighting to update.
   * @param {string} verifiedBy - The verification type ('AI', 'USER', 'COMMUNITY').
   * @returns {Promise<Sighting>} The updated sighting object.
   */
  ,updateSightingVerification: async (sightingId, verifiedBy) => {
    const update = {};
    
    if (verifiedBy === 'AI') {
      update.verifiedByAI = true;
    } else if (verifiedBy === 'USER') {
      update.verifiedByUser = true;
    } else if (verifiedBy === 'COMMUNITY') {
      update.verifiedByCommunity = true;
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
  }
};
