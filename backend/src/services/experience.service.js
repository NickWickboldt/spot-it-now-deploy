import { Animal } from '../models/animal.model.js';
import { User } from '../models/user.model.js';
import { UserDiscovery } from '../models/userDiscovery.model.js';
import { ApiError } from '../utils/ApiError.util.js';
import { log } from '../utils/logger.util.js';

/**
 * XP Configuration based on animal rarity
 * First discovery gives full XP, repeat sightings give reduced XP
 */
const XP_CONFIG = {
  // Base XP for first-time discovery of each rarity
  FIRST_DISCOVERY: {
    Common: 25,
    Uncommon: 50,
    Rare: 100,
    Legendary: 250,
  },
  // XP for repeat sightings (already discovered animal)
  REPEAT_SIGHTING: {
    Common: 5,
    Uncommon: 10,
    Rare: 20,
    Legendary: 50,
  },
  // Bonus XP multipliers
  BONUSES: {
    AI_VERIFIED: 1.0,      // No bonus for AI-only verification
    USER_VERIFIED: 1.1,    // 10% bonus for user-verified
    COMMUNITY_VERIFIED: 1.2, // 20% bonus for community-verified
    CAMERA_CAPTURE: 1.1,   // 10% bonus for camera captures
  }
};

/**
 * Level thresholds - XP required to reach each level
 * Follows a curved progression for satisfying leveling
 */
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  850,    // Level 5
  1300,   // Level 6
  1850,   // Level 7
  2500,   // Level 8
  3300,   // Level 9
  4200,   // Level 10
  5300,   // Level 11
  6500,   // Level 12
  7900,   // Level 13
  9500,   // Level 14
  11300,  // Level 15
  13400,  // Level 16
  15800,  // Level 17
  18500,  // Level 18
  21600,  // Level 19
  25000,  // Level 20
  29000,  // Level 21
  33500,  // Level 22
  38500,  // Level 23
  44000,  // Level 24
  50000,  // Level 25 (Master Spotter)
];

/**
 * Level titles for display
 */
const LEVEL_TITLES = {
  1: 'Novice Spotter',
  2: 'Curious Observer',
  3: 'Nature Watcher',
  4: 'Trail Walker',
  5: 'Wildlife Scout',
  6: 'Nature Explorer',
  7: 'Animal Tracker',
  8: 'Wildlife Enthusiast',
  9: 'Nature Guide',
  10: 'Seasoned Spotter',
  11: 'Wildlife Expert',
  12: 'Nature Specialist',
  13: 'Master Tracker',
  14: 'Wildlife Veteran',
  15: 'Nature Master',
  16: 'Elite Spotter',
  17: 'Wildlife Sage',
  18: 'Nature Legend',
  19: 'Grand Naturalist',
  20: 'Master Naturalist',
  21: 'Wildlife Champion',
  22: 'Nature Guardian',
  23: 'Elite Naturalist',
  24: 'Wildlife Luminary',
  25: 'Master Spotter',
};

/**
 * Calculate the level from total XP
 * @param {number} xp - Total experience points
 * @returns {number} Current level (1-25)
 */
const calculateLevel = (xp) => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
};

/**
 * Get XP progress within current level
 * @param {number} xp - Total experience points
 * @returns {Object} Progress info
 */
const getLevelProgress = (xp) => {
  const level = calculateLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  
  const xpInCurrentLevel = xp - currentThreshold;
  const xpNeededForNextLevel = nextThreshold - currentThreshold;
  const progressPercentage = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100));
  
  return {
    level,
    title: LEVEL_TITLES[level] || 'Master Spotter',
    currentXP: xp,
    xpInLevel: xpInCurrentLevel,
    xpForNextLevel: xpNeededForNextLevel,
    xpToNextLevel: nextThreshold - xp,
    progressPercentage,
    isMaxLevel: level >= LEVEL_THRESHOLDS.length,
    nextLevelThreshold: nextThreshold,
  };
};

/**
 * Calculate XP for a sighting based on animal rarity and discovery status
 * @param {string} userId - User's ID
 * @param {string} animalId - Animal's ID
 * @param {Object} options - Additional options (verifiedBy, captureMethod)
 * @returns {Promise<Object>} XP calculation result
 */
const calculateSightingXP = async (userId, animalId, options = {}) => {
  const { verifiedBy = 'AI', captureMethod = 'UNKNOWN', isFirstDiscovery: passedIsFirstDiscovery } = options;

  if (!animalId) {
    return { xpAwarded: 0, reason: 'No animal linked to sighting' };
  }

  // Get the animal to check rarity
  const animal = await Animal.findById(animalId);
  if (!animal) {
    return { xpAwarded: 0, reason: 'Animal not found' };
  }

  const rarityLevel = animal.rarityLevel || 'Common';

  // Use passed isFirstDiscovery if provided (since discovery is added before XP calculation)
  // Otherwise check the database
  let isFirstDiscovery = passedIsFirstDiscovery;
  if (isFirstDiscovery === undefined) {
    const userDiscovery = await UserDiscovery.findOne({ user: userId });
    isFirstDiscovery = !userDiscovery || !userDiscovery.discoveredAnimals.includes(animalId);
  }

  // Calculate base XP
  let baseXP = isFirstDiscovery 
    ? (XP_CONFIG.FIRST_DISCOVERY[rarityLevel] || XP_CONFIG.FIRST_DISCOVERY.Common)
    : (XP_CONFIG.REPEAT_SIGHTING[rarityLevel] || XP_CONFIG.REPEAT_SIGHTING.Common);

  // Apply bonuses
  let multiplier = 1.0;
  const bonuses = [];

  // Verification bonus
  if (verifiedBy === 'USER') {
    multiplier *= XP_CONFIG.BONUSES.USER_VERIFIED;
    bonuses.push({ type: 'User Verified', multiplier: XP_CONFIG.BONUSES.USER_VERIFIED });
  } else if (verifiedBy === 'COMMUNITY') {
    multiplier *= XP_CONFIG.BONUSES.COMMUNITY_VERIFIED;
    bonuses.push({ type: 'Community Verified', multiplier: XP_CONFIG.BONUSES.COMMUNITY_VERIFIED });
  }

  // Capture method bonus
  if (captureMethod === 'CAMERA') {
    multiplier *= XP_CONFIG.BONUSES.CAMERA_CAPTURE;
    bonuses.push({ type: 'Camera Capture', multiplier: XP_CONFIG.BONUSES.CAMERA_CAPTURE });
  }

  const finalXP = Math.round(baseXP * multiplier);

  return {
    xpAwarded: finalXP,
    baseXP,
    multiplier,
    bonuses,
    isFirstDiscovery,
    rarityLevel,
    animalName: animal.commonName,
    reason: isFirstDiscovery 
      ? `First ${rarityLevel} discovery!` 
      : `${rarityLevel} sighting`,
  };
};

/**
 * Award XP to a user and handle level ups
 * @param {string} userId - User's ID
 * @param {number} xpAmount - Amount of XP to award
 * @param {string} reason - Reason for XP award (for logging)
 * @returns {Promise<Object>} Result with level info and potential level up
 */
const awardXP = async (userId, xpAmount, reason = 'Sighting') => {
  if (!xpAmount || xpAmount <= 0) {
    return { success: false, message: 'Invalid XP amount' };
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const previousXP = user.experiencePoints || 0;
  const previousLevel = calculateLevel(previousXP);

  // Update user's XP
  const newXP = previousXP + xpAmount;
  user.experiencePoints = newXP;
  await user.save();

  const newLevel = calculateLevel(newXP);
  const leveledUp = newLevel > previousLevel;

  log.info('experience-service', 'XP awarded', {
    userId,
    xpAwarded: xpAmount,
    previousXP,
    newXP,
    previousLevel,
    newLevel,
    leveledUp,
    reason,
  });

  return {
    success: true,
    xpAwarded: xpAmount,
    previousXP,
    newXP,
    previousLevel,
    newLevel,
    leveledUp,
    levelProgress: getLevelProgress(newXP),
    reason,
  };
};

/**
 * Process XP for a new sighting
 * @param {string} userId - User's ID
 * @param {string} animalId - Animal's ID (can be null)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} XP result
 */
const processSightingXP = async (userId, animalId, options = {}) => {
  try {
    // Calculate how much XP this sighting is worth
    const calculation = await calculateSightingXP(userId, animalId, options);
    
    if (calculation.xpAwarded <= 0) {
      return {
        ...calculation,
        awarded: false,
      };
    }

    // Award the XP
    const awardResult = await awardXP(userId, calculation.xpAwarded, calculation.reason);

    return {
      ...calculation,
      ...awardResult,
      awarded: true,
    };
  } catch (error) {
    log.error('experience-service', 'Error processing sighting XP', {
      userId,
      animalId,
      error: error.message,
    });
    return {
      xpAwarded: 0,
      awarded: false,
      error: error.message,
    };
  }
};

/**
 * Get user's level and XP info
 * @param {string} userId - User's ID
 * @returns {Promise<Object>} Level info
 */
const getUserLevelInfo = async (userId) => {
  const user = await User.findById(userId).select('experiencePoints username');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const xp = user.experiencePoints || 0;
  return {
    userId,
    username: user.username,
    ...getLevelProgress(xp),
  };
};

/**
 * Get the XP configuration (for frontend display)
 */
const getXPConfig = () => {
  return {
    firstDiscovery: XP_CONFIG.FIRST_DISCOVERY,
    repeatSighting: XP_CONFIG.REPEAT_SIGHTING,
    bonuses: XP_CONFIG.BONUSES,
    levelThresholds: LEVEL_THRESHOLDS,
    levelTitles: LEVEL_TITLES,
    maxLevel: LEVEL_THRESHOLDS.length,
  };
};

export const experienceService = {
  calculateLevel,
  getLevelProgress,
  calculateSightingXP,
  awardXP,
  processSightingXP,
  getUserLevelInfo,
  getXPConfig,
  XP_CONFIG,
  LEVEL_THRESHOLDS,
  LEVEL_TITLES,
};
