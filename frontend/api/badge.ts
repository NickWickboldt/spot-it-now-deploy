import { fetchWithAuth } from './client';

export interface Badge {
  _id: string;
  name: string;
  description: string;
  iconUrl: string;
  xpReward: number;
  category: 'category_mastery' | 'rarity_hunting' | 'milestones' | 'challenges' | 'special' | 'social';
  tier: number;
  threshold: number;
  trackingType: string;
  trackingValue: string | null;
  isSecret: boolean;
  isEarned: boolean;
  progress: number;
  current: number;
  earnedAt: string | null;
}

export interface BadgeProgressResponse {
  badges: {
    category_mastery: Badge[];
    rarity_hunting: Badge[];
    milestones: Badge[];
    challenges: Badge[];
    special: Badge[];
    social: Badge[];
  };
  all: Badge[];
  summary: {
    totalBadges: number;
    earnedCount: number;
    totalXPFromBadges: number;
    completionPercentage: number;
  };
}

/**
 * Get the current user's badge progress
 */
export const apiGetMyBadgeProgress = async (): Promise<BadgeProgressResponse> => {
  return fetchWithAuth('/userAchievements/me/badges');
};

/**
 * Get all badges for a specific user (public)
 */
export const apiGetUserBadges = async (userId: string): Promise<any[]> => {
  return fetchWithAuth(`/userAchievements/user/${userId}`);
};

/**
 * Map badge category to display icon
 */
export const getBadgeCategoryIcon = (category: string): string => {
  switch (category) {
    case 'category_mastery': return 'paw';
    case 'rarity_hunting': return 'diamond';
    case 'milestones': return 'trophy';
    case 'challenges': return 'flag';
    case 'special': return 'star';
    case 'social': return 'users';
    default: return 'certificate';
  }
};

/**
 * Map badge category to display color
 */
export const getBadgeCategoryColor = (category: string): string => {
  switch (category) {
    case 'category_mastery': return '#40743dff';
    case 'rarity_hunting': return '#9B59B6';
    case 'milestones': return '#F39C12';
    case 'challenges': return '#3498DB';
    case 'special': return '#E74C3C';
    case 'social': return '#1ABC9C';
    default: return '#666';
  }
};

/**
 * Map badge tier to display info
 */
export const getBadgeTierInfo = (tier: number): { name: string; color: string } => {
  switch (tier) {
    case 1: return { name: 'Bronze', color: '#CD7F32' };
    case 2: return { name: 'Silver', color: '#C0C0C0' };
    case 3: return { name: 'Gold', color: '#FFD700' };
    case 4: return { name: 'Platinum', color: '#E5E4E2' };
    case 5: return { name: 'Diamond', color: '#B9F2FF' };
    default: return { name: '', color: '#666' };
  }
};

/**
 * Get a FontAwesome icon name for a badge based on its category and tracking
 */
export const getBadgeIcon = (badge: Badge): string => {
  // Category-specific icons
  if (badge.trackingType === 'category_sightings') {
    switch (badge.trackingValue) {
      case 'Birds': return 'twitter';
      case 'Mammals': return 'paw';
      case 'Reptiles and Amphibians': return 'bug';
      case 'Insects and Arachnids': return 'bug';
      case 'Marine Animals': return 'anchor';
      default: return 'paw';
    }
  }
  
  // Rarity icons
  if (badge.trackingType === 'rarity_sightings') {
    switch (badge.trackingValue) {
      case 'Common': return 'circle';
      case 'Uncommon': return 'star-half-o';
      case 'Rare': return 'star';
      case 'Legendary': return 'diamond';
      default: return 'star';
    }
  }
  
  // Milestone icons
  if (badge.trackingType === 'unique_animals') {
    return 'trophy';
  }
  
  // Challenge icons
  if (badge.trackingType === 'challenges_completed') {
    return 'flag-checkered';
  }
  
  // Streak icons
  if (badge.trackingType === 'streak_days') {
    return 'fire';
  }
  
  // Special icons
  if (badge.trackingValue === 'early_morning') return 'sun-o';
  if (badge.trackingValue === 'late_night') return 'moon-o';
  
  return 'certificate';
};
