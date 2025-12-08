/**
 * Badge Checker Service
 * 
 * Automatically checks and awards badges based on user activity.
 * Called after sightings, discoveries, challenge completions, etc.
 */

import { Achievement } from '../models/achievement.model.js';
import { User } from '../models/user.model.js';
import { UserAchievement } from '../models/userAchievement.model.js';
import { UserDiscovery } from '../models/userDiscovery.model.js';

/**
 * Check and award all eligible badges for a user
 * @param {string} userId - The user's ID
 * @param {Object} context - Optional context about what triggered the check
 * @returns {Promise<Array>} Array of newly awarded badges
 */
const checkAndAwardBadges = async (userId, context = {}) => {
  const newlyAwarded = [];
  
  try {
    // Get user's current achievements
    const userAchievements = await UserAchievement.find({ user: userId }).select('achievement');
    const earnedAchievementIds = new Set(userAchievements.map(ua => ua.achievement.toString()));
    
    // Get all achievements that user hasn't earned yet
    const unearnedAchievements = await Achievement.find({
      _id: { $nin: Array.from(earnedAchievementIds) }
    });
    
    if (unearnedAchievements.length === 0) {
      return newlyAwarded;
    }
    
    // Get user's discovery stats
    const userDiscovery = await UserDiscovery.findOne({ user: userId }).populate({
      path: 'discoveredAnimals',
      select: 'category rarityLevel'
    });
    
    if (!userDiscovery) {
      return newlyAwarded;
    }
    
    // Calculate stats
    const stats = await calculateUserStats(userId, userDiscovery, context);
    
    // Check each unearned achievement
    for (const achievement of unearnedAchievements) {
      const isEligible = await checkAchievementEligibility(achievement, stats, context);
      
      if (isEligible) {
        try {
          // Award the achievement
          await UserAchievement.create({
            user: userId,
            achievement: achievement._id,
          });
          
          // Add XP to user
          const xpToAward = achievement.xpReward || achievement.pointsReward || 0;
          if (xpToAward > 0) {
            await User.findByIdAndUpdate(userId, {
              $inc: { experiencePoints: xpToAward }
            });
          }
          
          newlyAwarded.push({
            _id: achievement._id,
            name: achievement.name,
            description: achievement.description,
            iconUrl: achievement.iconUrl,
            xpReward: xpToAward,
            category: achievement.category,
          });
          
          console.log(`[BADGE] Awarded "${achievement.name}" to user ${userId} (+${xpToAward} XP)`);
        } catch (err) {
          // Likely duplicate, skip
          if (err.code !== 11000) {
            console.error(`[BADGE] Error awarding ${achievement.name}:`, err.message);
          }
        }
      }
    }
    
    return newlyAwarded;
  } catch (error) {
    console.error('[BADGE] Error checking badges:', error);
    return newlyAwarded;
  }
};

/**
 * Calculate user stats for badge checking
 */
const calculateUserStats = async (userId, userDiscovery, context) => {
  const stats = {
    totalUniqueAnimals: userDiscovery?.discoveredAnimals?.length || 0,
    
    // Category counts
    categoryCount: {
      'Birds': 0,
      'Mammals': 0,
      'Reptiles and Amphibians': 0,
      'Insects and Arachnids': 0,
      'Marine Animals': 0,
    },
    
    // Rarity counts
    rarityCount: {
      'Common': 0,
      'Uncommon': 0,
      'Rare': 0,
      'Legendary': 0,
    },
    
    // Challenge stats
    challengesCompleted: 0,
    
    // Streak stats
    currentStreak: 0,
    
    // Context from current action
    sightingHour: context.sightingHour,
  };
  
  // Count by category and rarity
  if (userDiscovery?.discoveredAnimals) {
    for (const animal of userDiscovery.discoveredAnimals) {
      if (animal.category && stats.categoryCount[animal.category] !== undefined) {
        stats.categoryCount[animal.category]++;
      }
      if (animal.rarityLevel && stats.rarityCount[animal.rarityLevel] !== undefined) {
        stats.rarityCount[animal.rarityLevel]++;
      }
    }
  }
  
  // Get challenge completion count from user
  const user = await User.findById(userId).select('challengesCompleted sightingStreak');
  if (user) {
    stats.challengesCompleted = user.challengesCompleted || 0;
    stats.currentStreak = user.sightingStreak || 0;
  }
  
  return stats;
};

/**
 * Check if user is eligible for a specific achievement
 */
const checkAchievementEligibility = async (achievement, stats, context) => {
  const { trackingType, trackingValue, threshold } = achievement;
  
  switch (trackingType) {
    case 'unique_animals':
      return stats.totalUniqueAnimals >= threshold;
      
    case 'category_sightings':
      return (stats.categoryCount[trackingValue] || 0) >= threshold;
      
    case 'rarity_sightings':
      return (stats.rarityCount[trackingValue] || 0) >= threshold;
      
    case 'challenges_completed':
      return stats.challengesCompleted >= threshold;
      
    case 'streak_days':
      return stats.currentStreak >= threshold;
      
    case 'special':
      return checkSpecialAchievement(achievement, stats, context);
      
    default:
      return false;
  }
};

/**
 * Check special achievements (time-based, etc.)
 */
const checkSpecialAchievement = (achievement, stats, context) => {
  const { trackingValue } = achievement;
  
  switch (trackingValue) {
    case 'early_morning':
      // Sighting before 7 AM
      return context.sightingHour !== undefined && context.sightingHour < 7;
      
    case 'late_night':
      // Sighting after 10 PM
      return context.sightingHour !== undefined && context.sightingHour >= 22;
      
    default:
      return false;
  }
};

/**
 * Quick check for specific badge types after an action
 */
const checkBadgesAfterDiscovery = async (userId, animalId, sightingTime) => {
  const context = {};
  
  // Add sighting hour for time-based badges
  if (sightingTime) {
    const date = new Date(sightingTime);
    context.sightingHour = date.getHours();
  }
  
  return await checkAndAwardBadges(userId, context);
};

/**
 * Check badges after completing a challenge
 */
const checkBadgesAfterChallenge = async (userId) => {
  return await checkAndAwardBadges(userId, { challengeCompleted: true });
};

/**
 * Get user's badge progress for all badges
 */
const getBadgeProgress = async (userId) => {
  // Get user's earned badges
  const userAchievements = await UserAchievement.find({ user: userId })
    .populate('achievement')
    .sort({ createdAt: -1 });
  
  const earnedBadges = userAchievements.map(ua => ({
    ...ua.achievement.toObject(),
    earnedAt: ua.createdAt,
  }));
  
  // Get all badges
  const allBadges = await Achievement.find({}).sort({ category: 1, tier: 1 });
  
  // Get user stats for progress calculation
  const userDiscovery = await UserDiscovery.findOne({ user: userId }).populate({
    path: 'discoveredAnimals',
    select: 'category rarityLevel'
  });
  
  const stats = await calculateUserStats(userId, userDiscovery, {});
  
  // Calculate progress for each badge
  const earnedIds = new Set(earnedBadges.map(b => b._id.toString()));
  
  const badgesWithProgress = allBadges.map(badge => {
    const isEarned = earnedIds.has(badge._id.toString());
    let progress = 0;
    let current = 0;
    
    if (!isEarned) {
      // Calculate progress based on tracking type
      switch (badge.trackingType) {
        case 'unique_animals':
          current = stats.totalUniqueAnimals;
          progress = Math.min(100, (current / badge.threshold) * 100);
          break;
        case 'category_sightings':
          current = stats.categoryCount[badge.trackingValue] || 0;
          progress = Math.min(100, (current / badge.threshold) * 100);
          break;
        case 'rarity_sightings':
          current = stats.rarityCount[badge.trackingValue] || 0;
          progress = Math.min(100, (current / badge.threshold) * 100);
          break;
        case 'challenges_completed':
          current = stats.challengesCompleted;
          progress = Math.min(100, (current / badge.threshold) * 100);
          break;
        case 'streak_days':
          current = stats.currentStreak;
          progress = Math.min(100, (current / badge.threshold) * 100);
          break;
        default:
          progress = 0;
      }
    } else {
      progress = 100;
      current = badge.threshold;
    }
    
    return {
      ...badge.toObject(),
      isEarned,
      progress: Math.round(progress),
      current,
      earnedAt: isEarned ? earnedBadges.find(b => b._id.toString() === badge._id.toString())?.earnedAt : null,
    };
  });
  
  return badgesWithProgress;
};

export const badgeService = {
  checkAndAwardBadges,
  checkBadgesAfterDiscovery,
  checkBadgesAfterChallenge,
  getBadgeProgress,
};
