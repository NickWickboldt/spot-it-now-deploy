import { BASE_URL, fetchWithAuth } from './client';

export interface LevelProgress {
  level: number;
  title: string;
  currentXP: number;
  xpInLevel: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
  progressPercentage: number;
  isMaxLevel: boolean;
  nextLevelThreshold: number;
}

export interface UserLevelInfo extends LevelProgress {
  userId: string;
  username: string;
}

export interface XPResult {
  xpAwarded: number;
  isFirstDiscovery: boolean;
  rarityLevel: string;
  animalName: string;
  leveledUp: boolean;
  newLevel: number;
  levelProgress: LevelProgress;
  reason: string;
}

export interface XPConfig {
  firstDiscovery: Record<string, number>;
  repeatSighting: Record<string, number>;
  bonuses: Record<string, number>;
  levelThresholds: number[];
  levelTitles: Record<number, string>;
  maxLevel: number;
}

/**
 * Get the current user's level and XP information
 */
export const getMyLevelInfo = async (token?: string): Promise<UserLevelInfo> => {
  const response = await fetchWithAuth('/experience/me', token);
  
  // fetchWithAuth already parses JSON and returns the full response object
  if (!response || !response.data) {
    throw new Error('Failed to get level info');
  }
  
  return response.data;
};

/**
 * Get another user's level info by userId
 */
export const getUserLevelInfo = async (userId: string): Promise<UserLevelInfo> => {
  const response = await fetchWithAuth(`/experience/user/${userId}`);
  
  // fetchWithAuth already parses JSON and returns the full response object
  if (!response || !response.data) {
    throw new Error('Failed to get user level info');
  }
  
  return response.data;
};

/**
 * Get the XP configuration (level thresholds, rarity XP values, etc.)
 */
export const getXPConfig = async (): Promise<XPConfig> => {
  const response = await fetch(`${BASE_URL}/experience/config`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to get XP config');
  }
  
  return data.data;
};

/**
 * Calculate level from XP amount (utility function)
 */
export const calculateLevel = async (xp: number): Promise<LevelProgress> => {
  const response = await fetch(`${BASE_URL}/experience/calculate?xp=${xp}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to calculate level');
  }
  
  return data.data;
};

/**
 * Get color for rarity level (for UI display)
 */
export const getRarityColor = (rarity: string): string => {
  const colors: Record<string, string> = {
    Common: '#808080',      // Gray
    Uncommon: '#22C55E',    // Green
    Rare: '#3B82F6',        // Blue
    Legendary: '#F59E0B',   // Gold/Amber
  };
  return colors[rarity] || colors.Common;
};

/**
 * Get level tier color based on level
 */
export const getLevelColor = (level: number): string => {
  if (level >= 20) return '#F59E0B';  // Gold for Masters
  if (level >= 15) return '#A855F7';  // Purple for Experts
  if (level >= 10) return '#3B82F6';  // Blue for Veterans
  if (level >= 5) return '#22C55E';   // Green for Scouts
  return '#6B7280';                    // Gray for Beginners
};
