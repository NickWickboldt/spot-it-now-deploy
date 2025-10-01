// ==================================================================
// File: api/mapping.ts
// Admin-only endpoints for AI→Animal mappings
// ==================================================================
import { fetchWithAuth } from './client';

/**
 * List unmapped AI names (admin-only)
 * GET /api/v1/mappings/unmapped?limit=50
 */
export const apiGetUnmappedAINames = async (token: string, limit?: number) => {
  const params = new URLSearchParams();
  if (typeof limit === 'number') params.append('limit', String(limit));
  return fetchWithAuth(`/mappings/unmapped${params.toString() ? `?${params.toString()}` : ''}`, token);
};

/**
 * Create or update a mapping for an AI name (admin-only)
 * POST /api/v1/mappings
 * body: { aiName: string, animalId: string, retroactive?: boolean }
 * This endpoint will create or update a mapping keyed by aiName (case-insensitive) and optionally
 * apply the mapping retroactively to past sightings.
 */
export const apiCreateOrUpdateMapping = async (
  token: string,
  aiName: string,
  animalId: string,
  retroactive: boolean = true
) => {
  return fetchWithAuth('/mappings', token, {
    method: 'POST',
    body: JSON.stringify({ aiName, animalId, retroactive }),
  });
};
