// ==================================================================
// File: api/algorithm.ts
// ==================================================================
import { fetchWithAuth } from './client';

/**
 * Get personalized feed for the current user
 * Uses the algorithm to rank sightings based on user preferences
 */
export const apiGetPersonalizedFeed = async (
  token: string,
  page: number = 1,
  pageSize: number = 10
) => {
  // Add cache-busting timestamp to prevent 304 responses
  const cacheBuster = Date.now();
  return fetchWithAuth(
    `/algorithm/feed?page=${page}&pageSize=${pageSize}&_=${cacheBuster}`,
    token
  );
};

/**
 * Get algorithm statistics for the current user
 */
export const apiGetUserAlgorithmStats = async (token: string) => {
  return fetchWithAuth('/algorithm/stats', token);
};

/**
 * Toggle algorithm on/off for current user
 */
export const apiToggleAlgorithm = async (enabled: boolean, token: string) => {
  return fetchWithAuth('/algorithm/toggle', token, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
};

/**
 * Reset algorithm preferences for current user
 */
export const apiResetAlgorithm = async (token: string) => {
  return fetchWithAuth('/algorithm/reset', token, {
    method: 'POST',
  });
};

/**
 * Track sighting view (for algorithm learning)
 */
export const apiTrackSightingView = async (
  sightingId: string,
  durationSeconds: number,
  token: string
) => {
  return fetchWithAuth('/algorithm/track/view', token, {
    method: 'POST',
    body: JSON.stringify({ sightingId, durationSeconds }),
  });
};

/**
 * Track sighting like (for algorithm learning)
 */
export const apiTrackSightingLike = async (
  sightingId: string,
  token: string
) => {
  return fetchWithAuth('/algorithm/track/like', token, {
    method: 'POST',
    body: JSON.stringify({ sightingId }),
  });
};

/**
 * Track sighting comment (for algorithm learning)
 */
export const apiTrackSightingComment = async (
  sightingId: string,
  token: string
) => {
  return fetchWithAuth('/algorithm/track/comment', token, {
    method: 'POST',
    body: JSON.stringify({ sightingId }),
  });
};
