import stringSimilarity from 'string-similarity';
import { cloudinary, configureCloudinary } from '../config/cloudinary.config.js';
import { Animal } from '../models/animal.model.js';
import { Comment } from '../models/comment.model.js';
import { CommunityVote } from '../models/communityVote.model.js';
import { Follow } from '../models/follow.model.js';
import { Like } from '../models/like.model.js';
import { Sighting } from '../models/sighting.model.js';
import { ApiError } from '../utils/ApiError.util.js';
import { log } from '../utils/logger.util.js';
import { animalService } from './animal.service.js';
import { animalMappingService } from './animalMapping.service.js';
import { userDiscoveryService } from './userDiscovery.service.js';

const isCloudinaryConfigured = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let cloudinaryConfigured = false;

const ensureCloudinaryConfigured = () => {
  if (cloudinaryConfigured) {
    return true;
  }

  if (!isCloudinaryConfigured()) {
    return false;
  }

  configureCloudinary();
  cloudinaryConfigured = true;
  return true;
};

const extractCloudinaryAssetFromUrl = (mediaUrl) => {
  if (!mediaUrl || typeof mediaUrl !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(mediaUrl);
    if (!parsed.hostname || !parsed.hostname.endsWith('cloudinary.com')) {
      return null;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 4) {
      return null;
    }

    const [, resourceType, deliveryType, ...rest] = segments;
    if (deliveryType !== 'upload') {
      return null;
    }

    if (!['image', 'video'].includes(resourceType)) {
      return null;
    }

    const versionIndex = rest.findIndex((segment) => /^v\d+$/.test(segment));
    let publicIdParts = versionIndex >= 0 ? rest.slice(versionIndex + 1) : rest;

    while (publicIdParts.length && publicIdParts[0].includes(',')) {
      publicIdParts = publicIdParts.slice(1);
    }

    if (!publicIdParts.length) {
      return null;
    }

    const filename = publicIdParts.pop();
    const dotIndex = filename.lastIndexOf('.');
    const baseName = dotIndex > -1 ? filename.slice(0, dotIndex) : filename;
    publicIdParts.push(baseName);

    return {
      publicId: publicIdParts.join('/'),
      resourceType,
    };
  } catch (error) {
    return null;
  }
};

const deleteCloudinaryAssetsForSighting = async (mediaUrls = [], context = {}) => {
  if (!ensureCloudinaryConfigured()) {
    log.debug('sighting-service', 'Skipping Cloudinary cleanup; configuration missing', { sightingId: context.sightingId });
    return;
  }

  const assets = mediaUrls
    .map((url) => extractCloudinaryAssetFromUrl(url))
    .filter(Boolean);

  if (!assets.length) {
    return;
  }

  const uniqueAssets = Array.from(
    new Map(assets.map((asset) => [`${asset.resourceType}:${asset.publicId}`, asset])).values()
  );

  try {
    const results = await Promise.allSettled(
      uniqueAssets.map(async (asset) => {
        try {
          const result = await cloudinary.uploader.destroy(asset.publicId, {
            resource_type: asset.resourceType,
            invalidate: true,
          });
          log.debug('sighting-service', 'Deleted Cloudinary asset for sighting', {
            sightingId: context.sightingId,
            resourceType: asset.resourceType,
            publicId: asset.publicId,
            result,
          });
          return result;
        } catch (error) {
          const reason = error?.message || error;
          log.warn('sighting-service', 'Failed to delete Cloudinary asset for sighting', {
            sightingId: context.sightingId,
            resourceType: asset.resourceType,
            publicId: asset.publicId,
            error: reason,
          });
          return null;
        }
      })
    );
    return results;
  } catch (error) {
    const reason = error?.message || error;
    log.warn('sighting-service', 'Cloudinary cleanup threw unexpectedly; continuing', {
      sightingId: context.sightingId,
      error: reason,
    });
  }
};

const resolveAnimalMappingForAIIdentification = async (aiNameRaw) => {
  const raw = typeof aiNameRaw === 'string' ? aiNameRaw : '';
  const aiTrimmed = raw.trim();
  if (!aiTrimmed) {
    return { aiName: null, canonicalName: null, animalId: null, mapping: null };
  }

  // Normalization consistent with mapping service
  const canonicalName = animalMappingService.normalizeAIName(aiTrimmed);

  // 1) Try existing mapping by normalized AI label
  let mapping = await animalMappingService.findMappingByAIName(canonicalName);
  if (mapping) {
    log.debug('sighting-service', 'Mapping found for AI identification', {
      aiName: aiTrimmed,
      canonicalName,
      mappingId: mapping._id,
      animalId: mapping.animalId || null,
    });
    // Early return if mapping already points to an animal
    if (mapping.animalId) {
      log.info('sighting-service', 'AI name resolved via existing mapping', {
        aiName: aiTrimmed,
        normalizedAI: canonicalName,
        animalId: mapping.animalId,
        mode: 'mapping-existing',
      });
      return { aiName: aiTrimmed, canonicalName, animalId: mapping.animalId, mapping };
    }
  }

  let resolvedAnimalId = mapping?.animalId || null;

  // 2) Try exact normalized match against animals.commonName
  // Fetch all animals' commonName to normalize and compare
  const animals = await Animal.find({}, { _id: 1, commonName: 1 }).lean();
  const normalize = animalMappingService.normalizeAIName;
  const normalizedToAnimal = new Map();
  for (const a of animals) {
    const norm = normalize(a.commonName || '');
    if (norm) {
      // first seen wins; avoids overwriting if duplicates exist
      if (!normalizedToAnimal.has(norm)) normalizedToAnimal.set(norm, a);
    }
  }

  if (!resolvedAnimalId && normalizedToAnimal.has(canonicalName)) {
    const animal = normalizedToAnimal.get(canonicalName);
    resolvedAnimalId = animal._id;
    // Upsert mapping to persist exact match
    const { mapping: upserted } = await animalMappingService.createOrUpdateMapping(canonicalName, resolvedAnimalId, { retroactive: true });
    mapping = upserted?.toObject?.() || upserted;
    log.info('sighting-service', 'AI name exact-matched to animal', {
      aiName: aiTrimmed,
      normalizedAI: canonicalName,
      animalCommonName: animal.commonName,
      animalId: resolvedAnimalId,
      mode: 'exact',
    });
    return { aiName: aiTrimmed, canonicalName, animalId: resolvedAnimalId, mapping };
  }

  // 3) Fuzzy match if still unresolved
  if (!resolvedAnimalId) {
    const normalize = animalMappingService.normalizeAIName;
    const normalizeForFuzzy = (s = '') => normalize(s).replace(/\bgrey\b/g, 'gray');
    const stripModifiers = (s = '') => normalizeForFuzzy(s)
      .replace(/\b(eastern|western|northern|southern|common|american|european|asian|african)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const toTokens = (s = '') => stripModifiers(s).split(' ').filter(Boolean);
    const jaccard = (aTokens, bTokens) => {
      const a = new Set(aTokens);
      const b = new Set(bTokens);
      const inter = new Set([...a].filter(x => b.has(x)));
      const union = new Set([...a, ...b]);
      return union.size ? inter.size / union.size : 0;
    };

    const aiNorm = normalizeForFuzzy(aiTrimmed);
    const aiStripped = stripModifiers(aiTrimmed);
    const aiTokens = toTokens(aiTrimmed);
    const threshold = 0.85;

    // Log fuzzy input forms
    try {
      log.debug('sighting-service', 'Fuzzy inputs prepared', {
        aiName: aiTrimmed,
        normalizedAI: canonicalName,
        aiNorm,
        aiStripped,
        aiTokens,
        threshold,
      });
    } catch {}

    const scored = [];
    for (const a of animals) {
      const cn = a.commonName || '';
      const candNorm = normalizeForFuzzy(cn);
      const candStripped = stripModifiers(cn);
      const candTokens = toTokens(cn);
      const s1 = stringSimilarity.compareTwoStrings(aiNorm, candNorm);
      const s2 = stringSimilarity.compareTwoStrings(aiStripped, candStripped);
      const s3 = jaccard(aiTokens, candTokens);
      const score = Math.max(s1, s2, s3);
      scored.push({ animal: a, cn, candNorm, candStripped, candTokens, s1, s2, s3, score });
    }
    scored.sort((x, y) => y.score - x.score);

    // Log top 5 candidates with their scores
    try {
      const top = scored.slice(0, 5).map((r) => ({
        commonName: r.cn,
        s1_normSim: Number(r.s1.toFixed(3)),
        s2_strippedSim: Number(r.s2.toFixed(3)),
        s3_tokenJaccard: Number(r.s3.toFixed(3)),
        score: Number(r.score.toFixed(3)),
        candNorm: r.candNorm,
        candStripped: r.candStripped,
        candTokens: r.candTokens,
      }));
      log.debug('sighting-service', 'Fuzzy scoring candidates (top 5)', {
        totalCandidates: animals.length,
        top,
      });
    } catch {}

    const best = scored[0];
    const bestCandidate = best?.animal || null;
    const bestScore = best?.score || 0;

    if (bestCandidate && bestScore >= threshold) {
      resolvedAnimalId = bestCandidate._id;
      const { mapping: upserted } = await animalMappingService.createOrUpdateMapping(canonicalName, resolvedAnimalId, { retroactive: true });
      mapping = upserted?.toObject?.() || upserted;
      log.info('sighting-service', 'AI name fuzzy-matched to animal', {
        aiName: aiTrimmed,
        normalizedAI: canonicalName,
        matchedCommonName: bestCandidate.commonName,
        score: Number(bestScore.toFixed(3)),
        animalId: resolvedAnimalId,
        mode: 'fuzzy',
      });
      return { aiName: aiTrimmed, canonicalName, animalId: resolvedAnimalId, mapping };
    } else if (bestCandidate) {
      try {
        log.debug('sighting-service', 'Fuzzy best candidate below threshold', {
          aiName: aiTrimmed,
          normalizedAI: canonicalName,
          bestCommonName: bestCandidate.commonName,
          bestScore: Number(bestScore.toFixed(3)),
          threshold,
        });
      } catch {}
    }
  }

  // 4) Fallback: ensure placeholder mapping with null animalId
  if (!mapping) {
    const placeholder = await animalMappingService.ensureMappingForAIName(canonicalName);
    mapping = placeholder;
  }

  if (!resolvedAnimalId) {
    log.info('sighting-service', 'AI name left unmapped', {
      aiName: aiTrimmed,
      normalizedAI: canonicalName,
      mode: 'unmapped',
    });
  } else {
    log.info('sighting-service', 'AI name resolved after processing', {
      aiName: aiTrimmed,
      normalizedAI: canonicalName,
      animalId: resolvedAnimalId,
      mode: 'resolved',
    });
  }

  return { aiName: aiTrimmed, canonicalName, animalId: resolvedAnimalId || null, mapping };
};

/**
 * Creates a new sighting post.
 * @param {string} userId - The ID of the user creating the sighting.
 * @param {object} sightingData - The data for the new sighting.
 * @returns {Promise<Sighting>} The created sighting object.
 */
const createSighting = async (userId, userName, sightingData) => {
  const { mediaUrls, latitude, longitude, caption, isPrivate, identification, imageVerification, captureMethod } = sightingData || {};

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

  // Try to resolve animal linking and record AI raw data if provided
  let linkedAnimalId = null;
  let aiName = null;
  let aiConfidence = null;

  if (identification && typeof identification === 'object') {
    const { source, commonName, scientificName, confidence: idConfidence } = identification;

    if (source === 'AI') {
      try {
        const { aiName: resolvedAIName, animalId: resolvedAnimalId } = await resolveAnimalMappingForAIIdentification(commonName);
        aiName = resolvedAIName;
        if (Number.isFinite(Number(idConfidence))) {
          const numericConfidence = Number(idConfidence);
          aiConfidence = Math.max(0, Math.min(100, numericConfidence));
        }

        if (resolvedAnimalId) {
          linkedAnimalId = resolvedAnimalId;
        }
      } catch (error) {
        aiName = typeof commonName === 'string' ? commonName.trim() : null;
        if (Number.isFinite(Number(idConfidence))) {
          const numericConfidence = Number(idConfidence);
          aiConfidence = Math.max(0, Math.min(100, numericConfidence));
        }
        log.warn('sighting-service', 'Error resolving AI identification mapping', {
          aiName,
          error: error.message,
        });
      }
    } else if (commonName || scientificName) {
      try {
        const matchedAnimal = await animalService.findAnimalByIdentification(identification);
        if (matchedAnimal) {
          linkedAnimalId = matchedAnimal._id;
          log.info('sighting-service', 'Animal linked to sighting', {
            animalId: linkedAnimalId,
            commonName,
            scientificName,
            source,
          });
        } else {
          log.warn('sighting-service', 'No animal found for identification', {
            commonName,
            scientificName,
            source,
          });
        }
      } catch (error) {
        log.warn('sighting-service', 'Error linking animal to sighting', { error: error.message });
      }
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

  // Determine if sighting requires admin review based on verification
  let requiresAdminReview = false;
  let initialReputationScore = 50;
  
  if (imageVerification) {
    // High fraud score or many suspicious flags warrant review
    if (imageVerification.fraudScore > 0.7 || (imageVerification.verificationFlags && imageVerification.verificationFlags.length > 2)) {
      requiresAdminReview = true;
      initialReputationScore = 30; // Lower reputation for suspicious images
    } else if (imageVerification.fraudScore > 0.5) {
      initialReputationScore = 40; // Medium reputation
    } else if (imageVerification.fraudScore < 0.3) {
      initialReputationScore = 70; // Higher reputation for verified authentic images
    }
  }

  // Camera captures get higher initial reputation
  if (captureMethod === 'CAMERA') {
    initialReputationScore = Math.min(100, initialReputationScore + 15);
  }

  const sighting = await Sighting.create({
    user: userId,
    userName,
    mediaUrls,
    location,
    caption,
    isPrivate,
    identification: identification || null,
    animalId: linkedAnimalId,
    aiIdentification: aiName,
    confidence: aiConfidence,
    ...verificationFlags,
    // Image verification tracking
    imageVerification: imageVerification ? {
      verified: !imageVerification.isSuspicious,
      fraudScore: imageVerification.fraudScore || 0,
      isSuspicious: imageVerification.isSuspicious || false,
      verificationDetails: imageVerification.details || {},
      verificationFlags: imageVerification.verificationFlags || [],
      verifiedAt: new Date()
    } : undefined,
    captureMethod: captureMethod || 'UNKNOWN',
    reputationScore: initialReputationScore,
    requiresAdminReview
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

  // Send notifications to nearby users with matching animal preferences
  if (linkedAnimalId && !isPrivate && longNum !== null && latNum !== null) {
    try {
      // Define notification radius in meters (5km = 5000 meters)
      const notificationRadiusMeters = 5000;
      const notificationRadiusMiles = notificationRadiusMeters / 1609.34; // Convert to miles for comparison
      
      // Find nearby users with this animal in their preferences
      const nearbyUsers = await User.find({
        _id: { $ne: userId }, // Exclude the post creator
        notificationsEnabled: true,
        latitude: { $exists: true, $ne: null },
        longitude: { $exists: true, $ne: null },
        $or: [
          { animalPreferences: linkedAnimalId }, // Has this specific animal in preferences
          { animalPreferences: { $size: 0 } } // Empty preferences means see all animals
        ]
      }).select('_id username latitude longitude').limit(100); // Limit to prevent overload

      // Filter users by distance using Haversine formula
      const usersInRange = nearbyUsers.filter(nearbyUser => {
        const R = 3959; // Earth's radius in miles
        const dLat = (nearbyUser.latitude - latNum) * Math.PI / 180;
        const dLon = (nearbyUser.longitude - longNum) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(latNum * Math.PI / 180) * Math.cos(nearbyUser.latitude * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance <= notificationRadiusMiles;
      });

      // Get animal name for notification
      const animal = await Animal.findById(linkedAnimalId).select('commonName');
      const animalName = animal?.commonName || 'an animal';
      
      // Send notifications to matching users
      const notificationPromises = usersInRange.map(async (nearbyUser) => {
        try {
          await notificationService.sendNotificationToUser(nearbyUser._id, {
            type: 'nearby_sighting',
            title: `New ${animalName} Spotted Nearby!`,
            subtitle: `${userName} posted a sighting`,
            message: `${userName} spotted a ${animalName} near you: "${caption?.substring(0, 50) || 'Check it out!'}"`,
          });
        } catch (error) {
          log.warn('sighting-service', 'Failed to send nearby sighting notification', {
            sightingId: sighting._id,
            targetUserId: nearbyUser._id,
            error: error.message
          });
        }
      });

      await Promise.allSettled(notificationPromises);
      
      log.info('sighting-service', 'Sent nearby sighting notifications', {
        sightingId: sighting._id,
        animalId: linkedAnimalId,
        notificationsSent: usersInRange.length
      });
    } catch (error) {
      // Don't fail sighting creation if notifications fail
      log.warn('sighting-service', 'Failed to send nearby sighting notifications', {
        sightingId: sighting._id,
        error: error.message
      });
    }
  }

  if (linkedAnimalId) {
    log.debug('sighting-service', 'Sighting linked to animal', {
      sightingId: sighting._id,
      animalId: linkedAnimalId,
      aiName: aiName || null,
    });
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
  const sighting = await Sighting.findById(sightingId).select('user mediaUrls');

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

  const mediaUrls = Array.isArray(sighting.mediaUrls) ? sighting.mediaUrls : [];

  try {
    await deleteCloudinaryAssetsForSighting(mediaUrls, { sightingId });
  } catch (error) {
    const reason = error?.message || error;
    log.warn('sighting-service', 'Continuing after Cloudinary cleanup failure', { sightingId, error: reason });
  }

  await sighting.deleteOne();
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
  return await Sighting.find({ animalId }).sort({ createdAt: -1 });
};

/**
 * Finds sightings within a certain radius of a geographic point.
 * @param {number} longitude - The longitude of the center point.
 * @param {number} latitude - The latitude of the center point.
 * @param {number} maxDistanceInMeters - The radius in meters.
 * @returns {Promise<Sighting[]>} An array of nearby sighting objects.
 */
const findSightingsNear = async (longitude, latitude, maxDistanceInMeters = 10000) => {
  const lon = Number(longitude);
  const lat = Number(latitude);
  const distInput = Number(maxDistanceInMeters);

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return [];
  }

  const distMeters = Number.isFinite(distInput) && distInput > 0 ? distInput : 10000;
  const clampedDistance = Math.min(distMeters, 500000); // cap at ~310 miles

  const docs = await Sighting.find({
    isPrivate: { $ne: true },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        $maxDistance: clampedDistance,
      },
    },
  })
    .populate('user', 'username profilePictureUrl')
    .populate('animal', 'commonName iconPath')
    .lean();
  
  return docs.map((doc) => {
    const canonicalAnimal = doc.animal || null;
    return {
      ...doc,
      animal: canonicalAnimal,
      userName: doc.user?.username || 'Unknown User',
    };
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
  if (Object.prototype.hasOwnProperty.call(update, 'animal') && !Object.prototype.hasOwnProperty.call(update, 'animalId')) {
    update.animalId = update.animal;
    delete update.animal;
  }
  if (Object.prototype.hasOwnProperty.call(update, 'animalId')) {
    if (update.animalId === '' || (typeof update.animalId === 'string' && update.animalId.trim() === '')) {
      update.animalId = null;
    }
  }
  if (Object.prototype.hasOwnProperty.call(update, 'aiIdentification')) {
    if (update.aiIdentification === '' || (typeof update.aiIdentification === 'string' && update.aiIdentification.trim() === '')) {
      update.aiIdentification = null;
    } else if (typeof update.aiIdentification === 'string') {
      update.aiIdentification = update.aiIdentification.trim();
    }
  }
  if (Object.prototype.hasOwnProperty.call(update, 'confidence')) {
    const numericConfidence = Number(update.confidence);
    update.confidence = Number.isFinite(numericConfidence)
      ? Math.max(0, Math.min(100, numericConfidence))
      : null;
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
    const { source, commonName, scientificName, confidence: idConfidence } = update.identification;
    let resolvedAnimalId = null;

    if (source === 'AI') {
      try {
        const {
          aiName: resolvedAIName,
          animalId: mappingAnimalId,
        } = await resolveAnimalMappingForAIIdentification(commonName);
        update.aiIdentification = resolvedAIName || update.aiIdentification || null;

        if (Number.isFinite(Number(idConfidence))) {
          update.confidence = Math.max(0, Math.min(100, Number(idConfidence)));
        } else if (!Object.prototype.hasOwnProperty.call(update, 'confidence')) {
          update.confidence = null;
        }

        update.verifiedByAI = true;
        if (mappingAnimalId) {
          resolvedAnimalId = mappingAnimalId;
        }
      } catch (error) {
        update.aiIdentification = typeof commonName === 'string'
          ? commonName.trim()
          : update.aiIdentification || null;
        if (Number.isFinite(Number(idConfidence))) {
          update.confidence = Math.max(0, Math.min(100, Number(idConfidence)));
        } else if (!Object.prototype.hasOwnProperty.call(update, 'confidence')) {
          update.confidence = null;
        }
        update.verifiedByAI = true;
        log.warn('sighting-service', 'Error resolving AI identification mapping during update', {
          sightingId,
          aiName: update.aiIdentification || null,
          error: error.message,
        });
      }
    } else {
      try {
        const matchedAnimal = await animalService.findAnimalByIdentification(update.identification);
        if (matchedAnimal) {
          resolvedAnimalId = matchedAnimal._id;
          log.info('sighting-service', 'Animal linked to sighting update', {
            sightingId,
            animalId: matchedAnimal._id,
            commonName,
            scientificName,
            verificationSource: source,
          });
        } else {
          log.warn('sighting-service', 'No animal found for identification update', {
            sightingId,
            commonName,
            scientificName,
            verificationSource: source,
          });
        }
      } catch (error) {
        log.warn('sighting-service', 'Error linking animal to sighting update', { sightingId, error: error.message });
      }

      if (source === 'USER') {
        update.verifiedByUser = true;
      } else if (source === 'COMMUNITY') {
        update.verifiedByCommunity = true;
      }
    }

    update.animalId = resolvedAnimalId || null;
  }

  if (!Object.prototype.hasOwnProperty.call(update, 'animalId') && typeof update.aiIdentification === 'string' && update.aiIdentification) {
    try {
      const { animalId: resolvedAnimalId } = await resolveAnimalMappingForAIIdentification(update.aiIdentification);
      if (resolvedAnimalId) {
        update.animalId = resolvedAnimalId;
      }
    } catch (error) {
      log.warn('sighting-service', 'Failed to resolve mapping from direct AI identification update', {
        sightingId,
        aiName: update.aiIdentification,
        error: error.message,
      });
    }
  }

  const sighting = await Sighting.findByIdAndUpdate(
    sightingId,
    { $set: update },
    { new: true }
  );

  // Handle discovery updates when identification is added or changed
  if (update.animalId && update.identification) {
    try {
      const verifiedBy = update.identification.source === 'USER' ? 'USER' : 'AI';
      await userDiscoveryService.addDiscovery(
        originalSighting.user,
        update.animalId,
        sightingId,
        verifiedBy
      );
      log.info('sighting-service', 'Discovery added/updated for sighting update', {
        sightingId,
        userId: originalSighting.user,
        animalId: update.animalId,
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

  if (update.animalId) {
    log.debug('sighting-service', 'Sighting linked to animal via update', {
      sightingId,
      animalId: update.animalId,
      aiName: update.aiIdentification || null,
    });
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
  ,getCommunitySightingCandidate: async ({ userId } = {}) => {
    if (!userId) {
      throw new ApiError(400, 'User ID is required to fetch community sightings');
    }

    const votedIds = await CommunityVote.find({ user: userId }).distinct('sighting');
    const match = {
      isPrivate: { $ne: true },
      verifiedByCommunity: { $ne: true },
      'mediaUrls.0': { $exists: true },
    };

    if (votedIds.length) {
      match._id = { $nin: votedIds };
    }

    const [randomDoc] = await Sighting.aggregate([
      { $match: match },
      { $sample: { size: 1 } },
    ]);

    if (!randomDoc) {
      return null;
    }

    const sighting = await Sighting.findById(randomDoc._id)
      .populate('user', 'username profilePictureUrl')
      .populate('animal', 'commonName scientificName')
      .lean();

    return sighting;
  }
  ,submitCommunityVote: async ({ userId, sightingId, vote }) => {
    if (!userId || !sightingId) {
      throw new ApiError(400, 'User and sighting are required');
    }

    const normalizedVote = vote === 'APPROVE' ? 'APPROVE' : 'REJECT';

    const [sighting, existingVote] = await Promise.all([
      Sighting.findOne({ _id: sightingId, isPrivate: { $ne: true } }).populate('animal'),
      CommunityVote.findOne({ user: userId, sighting: sightingId }),
    ]);

    if (!sighting) {
      throw new ApiError(404, 'Sighting not found');
    }

    if (existingVote) {
      throw new ApiError(400, 'You have already reviewed this sighting');
    }

    await CommunityVote.create({ user: userId, sighting: sightingId, vote: normalizedVote });

    const now = new Date();
    const inc = normalizedVote === 'APPROVE'
      ? { 'communityReview.approvals': 1 }
      : { 'communityReview.rejections': 1 };
    const set = { 'communityReview.lastReviewedAt': now };

    if (normalizedVote === 'APPROVE') {
      set.verifiedByCommunity = true;
    }

    const updatedSighting = await Sighting.findByIdAndUpdate(
      sightingId,
      { $inc: inc, $set: set },
      { new: true }
    )
      .populate('user', 'username profilePictureUrl')
      .populate('animal', 'commonName scientificName')
      .lean();

    if (!updatedSighting) {
      throw new ApiError(404, 'Sighting not found after vote');
    }

    if (normalizedVote === 'APPROVE') {
      const ownerId = String(sighting.user);
      const resolvedAnimalId = sighting.animalId
        || (sighting.animal && (sighting.animal._id || sighting.animal))
        || null;

      if (resolvedAnimalId) {
        try {
          await userDiscoveryService.updateVerification(ownerId, resolvedAnimalId, 'COMMUNITY');
        } catch (error) {
          log.warn('sighting-service', 'Failed to update discovery with community verification', {
            sightingId,
            animalId: resolvedAnimalId,
            error: error?.message || error,
          });
        }
      }
    }

    return { vote: normalizedVote, sighting: updatedSighting };
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




