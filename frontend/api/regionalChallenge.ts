import { fetchWithAuth } from './client';

/**
 * Animal in a regional challenge with probability and progress info
 */
export interface RegionalChallengeAnimal {
  name: string;
  probability: number; // 0-100 likelihood of spotting
  count: number; // Number required to spot
  progress?: number; // Number spotted so far
}

/**
 * Daily or Weekly challenge section
 */
export interface ChallengeSection {
  animals: RegionalChallengeAnimal[];
  expires_at: string;
  completed: boolean;
  xp_potential?: number; // XP that will/can be earned on completion
  xp_awarded?: number; // XP actually awarded on completion
}

/**
 * User-specific regional challenge data returned from the API
 */
export interface UserChallengeDTO {
  region_key: string;
  location: string;
  cached: boolean;
  daily?: ChallengeSection;
  weekly?: ChallengeSection;
}

/**
 * Regional challenge data returned from the API (legacy, generates new each time)
 */
export interface RegionalChallengeDTO {
  region_key: string;
  location: string;
  daily: RegionalChallengeAnimal[];
  weekly: RegionalChallengeAnimal[];
  manifest_size: number;
}

/**
 * Animal in the probability manifest
 */
export interface ManifestAnimal {
  name: string;
  probability: number;
}

/**
 * Region manifest data (admin)
 */
export interface RegionManifestDTO {
  region_key: string;
  location: string;
  center: {
    latitude: number;
    longitude: number;
  };
  animal_manifest: ManifestAnimal[];
  created_at: string;
}

/**
 * Regional challenge list item for admin
 */
export interface RegionalChallengeListItem {
  _id: string;
  region_key: string;
  location: string;
  center: {
    latitude: number;
    longitude: number;
  };
  manifest_size: number;
  high_probability_count: number;
  createdAt: string;
}

/**
 * Get or create user-specific regional challenges.
 * These persist until they expire (daily: end of day, weekly: end of week).
 * 
 * @param lat - Latitude coordinate
 * @param lng - Longitude coordinate
 * @returns User challenge data including daily and weekly with progress
 */
export const apiGetUserChallenges = async (
  lat: number,
  lng: number
): Promise<{ data: UserChallengeDTO; message: string }> => {
  return fetchWithAuth(
    `/regional-challenges/user?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
  );
};

/**
 * Get user's current active challenges without creating new ones.
 * 
 * @returns Active challenges or null if none
 */
export const apiGetActiveUserChallenges = async (): Promise<{ data: UserChallengeDTO & { active: boolean }; message: string }> => {
  return fetchWithAuth('/regional-challenges/user/active');
};

/**
 * Get regional challenges based on user's geolocation (legacy - generates new each time).
 * Use apiGetUserChallenges for persisted challenges.
 * 
 * @param lat - Latitude coordinate
 * @param lng - Longitude coordinate
 * @returns Regional challenge data including daily and weekly challenges
 */
export const apiGetRegionalChallenges = async (
  lat: number,
  lng: number
): Promise<{ data: RegionalChallengeDTO; message: string }> => {
  return fetchWithAuth(
    `/regional-challenges?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
  );
};

/**
 * Get the full probability manifest for a region (admin only).
 * 
 * @param lat - Latitude coordinate
 * @param lng - Longitude coordinate
 * @returns Full region manifest with all animal probabilities
 */
export const apiGetRegionManifest = async (
  lat: number,
  lng: number
): Promise<{ data: RegionManifestDTO; message: string }> => {
  return fetchWithAuth(
    `/regional-challenges/manifest?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
  );
};

/**
 * Force regenerate the probability manifest for a region (admin only).
 * This deletes the existing manifest and creates a new one with fresh AI data.
 * 
 * @param lat - Latitude coordinate
 * @param lng - Longitude coordinate
 * @returns Newly generated regional challenge data
 */
export const apiRegenerateRegionalChallenges = async (
  lat: number,
  lng: number
): Promise<{ data: RegionalChallengeDTO; message: string }> => {
  return fetchWithAuth('/regional-challenges/regenerate', undefined, {
    method: 'POST',
    body: JSON.stringify({ lat, lng }),
  });
};

/**
 * List all regional manifests (admin only).
 * Returns all cached region manifests sorted by creation date.
 * 
 * @returns List of all regional manifests
 */
export const apiListAllRegionalChallenges = async (): Promise<{
  data: { count: number; challenges: RegionalChallengeListItem[] };
  message: string;
}> => {
  return fetchWithAuth('/regional-challenges/all');
};

/**
 * Clear all regional manifests (admin only).
 * Deletes all cached region data from the database.
 * 
 * @returns Number of deleted manifests
 */
export const apiClearAllRegionalChallenges = async (): Promise<{
  data: { deleted: number };
  message: string;
}> => {
  return fetchWithAuth('/regional-challenges/clear-all', undefined, {
    method: 'DELETE',
  });
};

/**
 * Delete a single regional manifest by ID (admin only).
 * 
 * @param id - The manifest ID to delete
 * @returns Deleted manifest info
 */
export const apiDeleteRegionalChallenge = async (
  id: string
): Promise<{
  data: { deleted: string; location: string };
  message: string;
}> => {
  return fetchWithAuth(`/regional-challenges/${id}`, undefined, {
    method: 'DELETE',
  });
};
