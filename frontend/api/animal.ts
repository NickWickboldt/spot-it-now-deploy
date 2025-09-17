// ==================================================================
// File: api/animal.ts
// ==================================================================
import { fetchWithAuth } from './client';

/**
 * Get all animals from the database
 * GET /api/v1/animals
 */
export const apiGetAllAnimals = async (token?: string) => {
  return fetchWithAuth('/animals', token || '');
};

/**
 * Get a single animal by ID
 * GET /api/v1/animals/:animalId
 */
export const apiGetAnimalById = async (animalId: string, token?: string) => {
  return fetchWithAuth(`/animals/${animalId}`, token || '');
};

/**
 * Get animals by category
 * GET /api/v1/animals?category=Mammals
 */
export const apiGetAnimalsByCategory = async (category: string, token?: string) => {
  const params = new URLSearchParams();
  params.append('category', category);
  return fetchWithAuth(`/animals?${params.toString()}`, token || '');
};

/**
 * Search animals by common name
 * GET /api/v1/animals?search=tiger
 */
export const apiSearchAnimals = async (searchTerm: string, token?: string) => {
  const params = new URLSearchParams();
  params.append('search', searchTerm);
  return fetchWithAuth(`/animals?${params.toString()}`, token || '');
};

/**
 * Find/match an animal by identification data
 * POST /api/v1/animals/match
 */
export const apiMatchAnimal = async (commonName?: string, scientificName?: string) => {
  return fetchWithAuth('/animals/match', '', {
    method: 'POST',
    body: JSON.stringify({ commonName, scientificName }),
  });
};