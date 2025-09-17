// ==================================================================
// File: api/userDiscovery.ts
// ==================================================================
import { fetchWithAuth } from './client';

/**
 * Get user's discovered animals
 * GET /api/v1/users/me/discoveries
 */
export const apiGetUserDiscoveries = async (token: string) => {
  return fetchWithAuth('/users/me/discoveries', token);
};

/**
 * Get user's discovery statistics
 * GET /api/v1/users/me/discovery-stats
 */
export const apiGetDiscoveryStats = async (token: string) => {
  return fetchWithAuth('/users/me/discovery-stats', token);
};

/**
 * Check if user has discovered a specific animal
 * GET /api/v1/users/me/discoveries/check/:animalId
 */
export const apiCheckAnimalDiscovered = async (token: string, animalId: string) => {
  return fetchWithAuth(`/users/me/discoveries/check/${animalId}`, token);
};

/**
 * Manually add a discovery (for testing)
 * POST /api/v1/users/me/discoveries
 */
export const apiAddDiscovery = async (token: string, animalId: string, sightingId: string, verifiedBy = 'USER') => {
  return fetchWithAuth('/users/me/discoveries', token, {
    method: 'POST',
    body: JSON.stringify({ animalId, sightingId, verifiedBy }),
  });
};

/**
 * Get discovery leaderboard
 * GET /api/v1/users/discoveries/leaderboard
 */
export const apiGetDiscoveryLeaderboard = async (token?: string) => {
  return fetchWithAuth('/users/discoveries/leaderboard', token || '');
};