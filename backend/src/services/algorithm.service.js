import { Follow } from '../models/follow.model.js';
import { Like } from '../models/like.model.js';
import { Sighting } from '../models/sighting.model.js';
import UserPreference from '../models/userPreference.model.js';
import { ApiError } from '../utils/ApiError.util.js';

/**
 * Get or create user preference document
 */
const getUserPreference = async (userId) => {
  let preference = await UserPreference.findOne({ user: userId });
  
  if (!preference) {
    preference = await UserPreference.create({
      user: userId,
      animalPreferences: [],
      categoryPreferences: new Map(),
      userInteractions: [],
      interactionHistory: [],
    });
  }
  
  return preference;
};

/**
 * Track user interaction with a sighting
 */
const trackInteraction = async (userId, sightingId, interactionType, score) => {
  // Get or create user preference
  const preference = await getUserPreference(userId);
  
  // Get sighting details
  const sighting = await Sighting.findById(sightingId)
    .populate('animal')
    .populate('user');
  
  if (!sighting) {
    throw new ApiError(404, 'Sighting not found');
  }
  
  // Update animal preference
  if (sighting.animal) {
    preference.updateAnimalPreference(sighting.animal._id, score);
    
    // Update category preference if animal has category
    if (sighting.animal.category) {
      preference.updateCategoryPreference(sighting.animal.category, score);
    }
  }
  
  // Update user interaction (content creator)
  if (sighting.user && sighting.user._id.toString() !== userId.toString()) {
    preference.updateUserInteraction(sighting.user._id, score);
  }
  
  // Add to interaction history
  preference.addInteraction(sightingId, interactionType, score);
  
  await preference.save();
  
  return preference;
};

/**
 * Calculate personalized score for a sighting
 */
const calculateSightingScore = (sighting, userPreference, followedUserIds) => {
  // Start with a base score so ALL content gets shown
  let score = 10; // Base score ensures content without interactions still appears
  
  // Following bonus (+10 for followed users)
  if (sighting.user && followedUserIds.includes(sighting.user._id.toString())) {
    score += 10;
  }
  
  // Animal preference score (40% weight)
  if (sighting.animal) {
    const animalPref = userPreference.animalPreferences.find(
      p => p.animal.toString() === sighting.animal._id.toString()
    );
    if (animalPref) {
      // Boost score significantly for preferred animals
      score += animalPref.score * 0.4;
    }
  }
  
  // Category preference score (20% weight)
  if (sighting.animal && sighting.animal.category) {
    const categoryScore = userPreference.categoryPreferences.get(sighting.animal.category) || 0;
    if (categoryScore > 0) {
      score += categoryScore * 0.2;
    }
  }
  
  // User interaction score (30% weight)
  if (sighting.user) {
    const userInteraction = userPreference.userInteractions.find(
      i => i.targetUser.toString() === sighting.user._id.toString()
    );
    if (userInteraction) {
      score += userInteraction.score * 0.3;
    }
  }
  
  // Enhanced recency scoring: +10 for super recent, -10 for months old
  // Hours: +10, Days: +5 to +10, Week: 0 to +5, Months: -10 to 0
  const ageInHours = (Date.now() - new Date(sighting.createdAt).getTime()) / (1000 * 60 * 60);
  let recencyBonus = 0;
  
  if (ageInHours < 24) {
    // Less than 24 hours: +7 to +10 (very recent)
    recencyBonus = 10 - (ageInHours / 24) * 3;
  } else if (ageInHours < 168) {
    // 1-7 days: +2 to +7
    const days = ageInHours / 24;
    recencyBonus = 7 - (days / 7) * 5;
  } else if (ageInHours < 720) {
    // 1-4 weeks: -2 to +2
    const weeks = ageInHours / 168;
    recencyBonus = 2 - (weeks / 4) * 4;
  } else {
    // Over 1 month: -10 to -2
    const months = ageInHours / 720;
    recencyBonus = -2 - Math.min(months, 3) * (8 / 3); // Cap at 3 months
  }
  
  score += recencyBonus;
  
  return score;
};

/**
 * Get personalized feed for user
 */
const getPersonalizedFeed = async (userId, page = 1, pageSize = 10) => {
  const preference = await getUserPreference(userId);
  
  // Calculate skip for pagination
  const skip = (page - 1) * pageSize;
  
  // If algorithm is disabled, return chronological feed
  if (!preference.algorithmEnabled) {
    const sightings = await Sighting.find({ isPrivate: { $ne: true } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('user', 'username profilePictureUrl')
      .populate('animal', 'commonName scientificName imageUrl category');
    
    const total = await Sighting.countDocuments({ isPrivate: { $ne: true } });
    
    return {
      items: sightings,
      page,
      pageSize,
      total,
    };
  }
  
  // Get liked sighting IDs to exclude them from feed
  const likedSightings = await Like.find({ user: userId }).select('sighting').lean();
  const likedSightingIds = likedSightings.map(like => like.sighting.toString());
  
  // Get ALL recent sightings EXCEPT liked ones
  const sightings = await Sighting.find({
    _id: { $nin: likedSightingIds }, // Exclude liked sightings
    isPrivate: { $ne: true } // Exclude private sightings
  })
    .sort({ createdAt: -1 })
    .limit(1000) // Get last 1000 non-liked sightings for scoring
    .populate('user', 'username profilePictureUrl')
    .populate('animal', 'commonName scientificName imageUrl category')
    .lean();
  
  // If user has no preferences yet, return chronological with basic bonuses
  if (preference.totalInteractions === 0) {
    console.log('[ALGORITHM SERVICE] User has no interactions, returning chronological feed');
    
    // Get following list even for new users
    const followingDocs = await Follow.find({ follower: userId }).select('following').lean();
    const followedUserIds = followingDocs.map(f => f.following.toString());
    
    const chronological = sightings.slice(skip, skip + pageSize);
    
    // Add scores with following and recency bonuses
    const withScores = chronological.map(sighting => {
      let score = 10.0; // Base score
      
      // Following bonus
      if (sighting.user && followedUserIds.includes(sighting.user._id.toString())) {
        score += 10;
      }
      
      // Recency bonus
      const ageInHours = (Date.now() - new Date(sighting.createdAt).getTime()) / (1000 * 60 * 60);
      let recencyBonus = 0;
      
      if (ageInHours < 24) {
        recencyBonus = 10 - (ageInHours / 24) * 3;
      } else if (ageInHours < 168) {
        const days = ageInHours / 24;
        recencyBonus = 7 - (days / 7) * 5;
      } else if (ageInHours < 720) {
        const weeks = ageInHours / 168;
        recencyBonus = 2 - (weeks / 4) * 4;
      } else {
        const months = ageInHours / 720;
        recencyBonus = -2 - Math.min(months, 3) * (8 / 3);
      }
      
      score += recencyBonus;
      
      return {
        ...sighting,
        algorithmScore: Math.round(score * 100) / 100
      };
    });
    
    return {
      items: withScores,
      page,
      pageSize,
      total: sightings.length,
    };
  }
  
  console.log('[ALGORITHM SERVICE] User has', preference.totalInteractions, 'interactions, calculating personalized scores');
  
  // Get list of users the current user is following
  const followingDocs = await Follow.find({ follower: userId }).select('following').lean();
  const followedUserIds = followingDocs.map(f => f.following.toString());
  
  // Calculate personalized scores for ALL non-liked sightings
  const scoredSightings = sightings.map(sighting => {
    const score = calculateSightingScore(sighting, preference, followedUserIds);
    
    return {
      ...sighting,
      _personalizedScore: score
    };
  });
  
  // Probability-based selection instead of strict sorting
  // Higher scores have higher probability of being selected first
  const probabilitySelected = [];
  const pool = [...scoredSightings];
  
  // Calculate total weight for probability distribution
  const calculateWeight = (score) => {
    // Convert score to weight using exponential function
    // Higher exponent = more aggressive preference for high scores
    // score/7 instead of score/10 makes differences more pronounced
    // e.g., score 30 is now ~100x more likely than score 10
    return Math.pow(Math.E, score / 7);
  };
  
  // Select items probabilistically until we have enough for all pages
  while (pool.length > 0 && probabilitySelected.length < scoredSightings.length) {
    const totalWeight = pool.reduce((sum, item) => sum + calculateWeight(item._personalizedScore), 0);
    
    // Generate random number between 0 and totalWeight
    const random = Math.random() * totalWeight;
    
    // Find which item this random number corresponds to
    let cumulativeWeight = 0;
    let selectedIndex = 0;
    
    for (let i = 0; i < pool.length; i++) {
      cumulativeWeight += calculateWeight(pool[i]._personalizedScore);
      if (random <= cumulativeWeight) {
        selectedIndex = i;
        break;
      }
    }
    
    // Add selected item and remove from pool
    probabilitySelected.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }
  
  // Paginate from probability-ordered results
  const paginatedSightings = probabilitySelected.slice(skip, skip + pageSize);
  
  // Always include score for debugging/development
  const cleanedSightings = paginatedSightings.map(({ _personalizedScore, ...sighting }) => {
    const itemWithScore = { ...sighting, algorithmScore: Math.round(_personalizedScore * 100) / 100 };
    console.log('[ALGORITHM] Adding score:', _personalizedScore, '-> rounded:', itemWithScore.algorithmScore);
    return itemWithScore;
  });
  
  // Debug log to verify scores are being added
  console.log('[ALGORITHM SERVICE] First item keys:', Object.keys(cleanedSightings[0] || {}));
  console.log('[ALGORITHM SERVICE] First item has algorithmScore:', cleanedSightings[0]?.algorithmScore);
  
  return {
    items: cleanedSightings,
    page,
    pageSize,
    total: scoredSightings.length,
  };
};

/**
 * Get user's algorithm statistics
 */
const getUserAlgorithmStats = async (userId) => {
  console.log('[ALGORITHM SERVICE] Getting preference for user:', userId);
  
  const preference = await getUserPreference(userId);
  
  console.log('[ALGORITHM SERVICE] Preference found/created, populating...');
  
  await preference.populate([
    { path: 'animalPreferences.animal', select: 'commonName scientificName imageUrl' },
    { path: 'userInteractions.targetUser', select: 'username profilePicture' },
  ]);
  
  console.log('[ALGORITHM SERVICE] Populated, building stats...');
  
  const stats = {
    enabled: preference.algorithmEnabled,
    totalInteractions: preference.totalInteractions,
    lastUpdated: preference.lastUpdated,
    topAnimals: preference.getTopAnimals(10),
    topCategories: preference.getTopCategories(5),
    topUsers: preference.userInteractions
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(u => ({ user: u.targetUser, score: u.score })),
    recentInteractions: preference.interactionHistory.slice(-20).reverse(),
  };
  
  console.log('[ALGORITHM SERVICE] Stats built successfully');
  
  return stats;
};

/**
 * Toggle algorithm on/off for user
 */
const toggleAlgorithm = async (userId, enabled) => {
  const preference = await getUserPreference(userId);
  preference.algorithmEnabled = enabled;
  await preference.save();
  return preference;
};

/**
 * Reset user's algorithm preferences
 */
const resetUserPreferences = async (userId) => {
  const preference = await getUserPreference(userId);
  preference.resetAlgorithm();
  await preference.save();
  return preference;
};

/**
 * Get personalized Following feed (posts from users you follow, ranked by algorithm)
 */
const getPersonalizedFollowingFeed = async (userId, page = 1, pageSize = 10) => {
  const preference = await getUserPreference(userId);
  const skip = (page - 1) * pageSize;
  
  // Get list of users the current user is following
  const followingDocs = await Follow.find({ follower: userId }).select('following').lean();
  const followedUserIds = followingDocs.map(f => f.following.toString());
  
  if (followedUserIds.length === 0) {
    return {
      items: [],
      page,
      pageSize,
      total: 0,
    };
  }
  
  // Get liked sighting IDs to exclude
  const likedSightings = await Like.find({ user: userId }).select('sighting').lean();
  const likedSightingIds = likedSightings.map(like => like.sighting.toString());
  
  // Get sightings only from followed users, excluding liked ones
  const sightings = await Sighting.find({
    user: { $in: followedUserIds },
    _id: { $nin: likedSightingIds },
    isPrivate: { $ne: true }
  })
    .sort({ createdAt: -1 })
    .limit(1000)
    .populate('user', 'username profilePictureUrl')
    .populate('animal', 'commonName scientificName imageUrl category')
    .lean();
  
  // Score and use probability-based ordering
  const scoredSightings = sightings.map(sighting => {
    const score = calculateSightingScore(sighting, preference, followedUserIds);
    return { ...sighting, _personalizedScore: score };
  });
  
  // Probability-based selection
  const probabilitySelected = [];
  const pool = [...scoredSightings];
  
  const calculateWeight = (score) => Math.pow(Math.E, score / 7);
  
  while (pool.length > 0 && probabilitySelected.length < scoredSightings.length) {
    const totalWeight = pool.reduce((sum, item) => sum + calculateWeight(item._personalizedScore), 0);
    const random = Math.random() * totalWeight;
    
    let cumulativeWeight = 0;
    let selectedIndex = 0;
    
    for (let i = 0; i < pool.length; i++) {
      cumulativeWeight += calculateWeight(pool[i]._personalizedScore);
      if (random <= cumulativeWeight) {
        selectedIndex = i;
        break;
      }
    }
    
    probabilitySelected.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }
  
  // Paginate
  const paginatedSightings = probabilitySelected.slice(skip, skip + pageSize);
  
  // Add algorithm scores
  const cleanedSightings = paginatedSightings.map(({ _personalizedScore, ...sighting }) => ({
    ...sighting,
    algorithmScore: Math.round(_personalizedScore * 100) / 100
  }));
  
  return {
    items: cleanedSightings,
    page,
    pageSize,
    total: scoredSightings.length,
  };
};

/**
 * Get personalized Local feed (nearby posts ranked by algorithm)
 */
const getPersonalizedLocalFeed = async (userId, longitude, latitude, radiusMeters, page = 1, pageSize = 10) => {
  const preference = await getUserPreference(userId);
  const skip = (page - 1) * pageSize;
  
  // Get list of users the current user is following
  const followingDocs = await Follow.find({ follower: userId }).select('following').lean();
  const followedUserIds = followingDocs.map(f => f.following.toString());
  
  // Get liked sighting IDs to exclude
  const likedSightings = await Like.find({ user: userId }).select('sighting').lean();
  const likedSightingIds = likedSightings.map(like => like.sighting.toString());
  
  // Get nearby sightings excluding liked ones
  const sightings = await Sighting.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: radiusMeters
      }
    },
    _id: { $nin: likedSightingIds },
    isPrivate: { $ne: true }
  })
    .limit(1000)
    .populate('user', 'username profilePictureUrl')
    .populate('animal', 'commonName scientificName imageUrl category')
    .lean();
  
  // Score and use probability-based ordering
  const scoredSightings = sightings.map(sighting => {
    const score = calculateSightingScore(sighting, preference, followedUserIds);
    return { ...sighting, _personalizedScore: score };
  });
  
  // Probability-based selection
  const probabilitySelected = [];
  const pool = [...scoredSightings];
  
  const calculateWeight = (score) => Math.pow(Math.E, score / 7);
  
  while (pool.length > 0 && probabilitySelected.length < scoredSightings.length) {
    const totalWeight = pool.reduce((sum, item) => sum + calculateWeight(item._personalizedScore), 0);
    const random = Math.random() * totalWeight;
    
    let cumulativeWeight = 0;
    let selectedIndex = 0;
    
    for (let i = 0; i < pool.length; i++) {
      cumulativeWeight += calculateWeight(pool[i]._personalizedScore);
      if (random <= cumulativeWeight) {
        selectedIndex = i;
        break;
      }
    }
    
    probabilitySelected.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }
  
  // Paginate
  const paginatedSightings = probabilitySelected.slice(skip, skip + pageSize);
  
  // Add algorithm scores
  const cleanedSightings = paginatedSightings.map(({ _personalizedScore, ...sighting }) => ({
    ...sighting,
    algorithmScore: Math.round(_personalizedScore * 100) / 100
  }));
  
  return {
    items: cleanedSightings,
    page,
    pageSize,
    total: scoredSightings.length,
  };
};

export const algorithmService = {
  getUserPreference,
  trackInteraction,
  calculateSightingScore,
  getPersonalizedFeed,
  getPersonalizedFollowingFeed,
  getPersonalizedLocalFeed,
  getUserAlgorithmStats,
  toggleAlgorithm,
  resetUserPreferences,
};
