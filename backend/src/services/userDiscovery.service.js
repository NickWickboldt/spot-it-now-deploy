import { Animal } from '../models/animal.model.js';
import { UserDiscovery } from '../models/userDiscovery.model.js';
import { ApiError } from '../utils/ApiError.util.js';

/**
 * Gets or creates a user's discovery record
 * @param {string} userId - The ID of the user
 * @returns {Promise<UserDiscovery>} The user's discovery record
 */
const getUserDiscovery = async (userId) => {
  let userDiscovery = await UserDiscovery.findOne({ user: userId })
    .populate({
      path: 'discoveredAnimals',
      select: 'commonName scientificName category rarityLevel imageUrls conservationStatus description'
    })
    .populate({
      path: 'animalDiscoveries.animal',
      select: 'commonName scientificName category rarityLevel imageUrls conservationStatus description'
    });

  // Create new discovery record if it doesn't exist
  if (!userDiscovery) {
    userDiscovery = await UserDiscovery.create({
      user: userId,
      discoveredAnimals: [],
      animalDiscoveries: [],
      stats: {
        totalDiscovered: 0,
        commonDiscovered: 0,
        uncommonDiscovered: 0,
        rareDiscovered: 0,
        legendaryDiscovered: 0,
        categoriesCompleted: []
      }
    });
  }

  return userDiscovery;
};

/**
 * Adds a new animal discovery for a user
 * @param {string} userId - The ID of the user
 * @param {string} animalId - The ID of the discovered animal
 * @param {string} sightingId - The ID of the sighting that led to discovery
 * @param {string} verifiedBy - How the discovery was verified ('AI', 'USER', 'COMMUNITY')
 * @returns {Promise<boolean>} True if new discovery, false if already discovered
 */
const addDiscovery = async (userId, animalId, sightingId, verifiedBy = 'AI') => {
  const animal = await Animal.findById(animalId);
  
  if (!animal) {
    throw new ApiError(404, 'Animal not found');
  }

  // Direct DB check: does this user already have this animal in their discoveries?
  const existingDiscovery = await UserDiscovery.findOne({
    user: userId,
    discoveredAnimals: animalId
  });

  if (existingDiscovery) {
    // Already discovered - not a new discovery
    return false;
  }

  // It's a new discovery - add it
  const userDiscovery = await getUserDiscovery(userId);
  
  // Add to discoveredAnimals array
  userDiscovery.discoveredAnimals.push(animalId);
  
  // Add detailed record
  userDiscovery.animalDiscoveries.push({
    animal: animalId,
    discoveredAt: new Date(),
    firstSighting: sightingId,
    verifiedByAI: verifiedBy === 'AI',
    verifiedByUser: verifiedBy === 'USER',
    verifiedByCommunity: verifiedBy === 'COMMUNITY'
  });

  // Update stats
  userDiscovery.stats.totalDiscovered = userDiscovery.discoveredAnimals.length;
  await userDiscovery.save();

  // Update rarity and category stats
  await updateRarityStats(userDiscovery, animal.rarityLevel, 1);
  await updateCategoryStats(userDiscovery, animal.category);

  return true;
};

/**
 * Updates rarity statistics
 */
const updateRarityStats = async (userDiscovery, rarityLevel, increment) => {
  switch (rarityLevel.toLowerCase()) {
    case 'common':
      userDiscovery.stats.commonDiscovered += increment;
      break;
    case 'uncommon':
      userDiscovery.stats.uncommonDiscovered += increment;
      break;
    case 'rare':
      userDiscovery.stats.rareDiscovered += increment;
      break;
    case 'legendary':
      userDiscovery.stats.legendaryDiscovered += increment;
      break;
  }
  await userDiscovery.save();
};

/**
 * Updates category completion statistics
 */
const updateCategoryStats = async (userDiscovery, category) => {
  // Get total animals in this category
  const totalInCategory = await Animal.countDocuments({ category });
  
  // Count user's discoveries in this category
  const userDiscoveriesInCategory = await Animal.countDocuments({
    category,
    _id: { $in: userDiscovery.discoveredAnimals }
  });

  // Update or add category stats
  const existingCategoryIndex = userDiscovery.stats.categoriesCompleted.findIndex(
    cat => cat.category === category
  );

  const categoryData = {
    category,
    total: totalInCategory,
    discovered: userDiscoveriesInCategory,
    completedAt: userDiscoveriesInCategory === totalInCategory ? new Date() : null
  };

  if (existingCategoryIndex >= 0) {
    userDiscovery.stats.categoriesCompleted[existingCategoryIndex] = categoryData;
  } else {
    userDiscovery.stats.categoriesCompleted.push(categoryData);
  }

  await userDiscovery.save();
};

/**
 * Gets user's discovery statistics
 * @param {string} userId - The ID of the user
 * @returns {Promise<Object>} Discovery statistics
 */
const getDiscoveryStats = async (userId) => {
  const userDiscovery = await getUserDiscovery(userId);
  const totalAnimals = await Animal.countDocuments();
  
  return {
    totalAnimals,
    discovered: userDiscovery.stats.totalDiscovered,
    completionPercentage: Math.round((userDiscovery.stats.totalDiscovered / totalAnimals) * 100),
    rarityBreakdown: {
      common: userDiscovery.stats.commonDiscovered,
      uncommon: userDiscovery.stats.uncommonDiscovered,
      rare: userDiscovery.stats.rareDiscovered,
      legendary: userDiscovery.stats.legendaryDiscovered
    },
    categoriesCompleted: userDiscovery.stats.categoriesCompleted,
    recentDiscoveries: userDiscovery.animalDiscoveries
      .sort((a, b) => new Date(b.discoveredAt) - new Date(a.discoveredAt))
      .slice(0, 10)
  };
};

/**
 * Checks if user has discovered a specific animal
 * @param {string} userId - The ID of the user
 * @param {string} animalId - The ID of the animal to check
 * @returns {Promise<boolean>} True if discovered
 */
const hasDiscovered = async (userId, animalId) => {
  const userDiscovery = await UserDiscovery.findOne({ user: userId });
  if (!userDiscovery) return false;
  
  return userDiscovery.hasDiscovered(animalId);
};

/**
 * Updates verification status for an existing discovery
 * @param {string} userId - The ID of the user
 * @param {string} animalId - The ID of the animal
 * @param {string} verifiedBy - New verification type ('AI', 'USER', 'COMMUNITY')
 * @returns {Promise<boolean>} True if updated successfully
 */
const updateVerification = async (userId, animalId, verifiedBy) => {
  const userDiscovery = await getUserDiscovery(userId);
  return await userDiscovery.updateVerification(animalId, verifiedBy);
};

export const userDiscoveryService = {
  getUserDiscovery,
  addDiscovery,
  getDiscoveryStats,
  hasDiscovered,
  updateRarityStats,
  updateCategoryStats,
  updateVerification
};