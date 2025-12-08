// ==================================================================
// File: api/search.ts
// Search API endpoints for users, animals, and sightings
// ==================================================================
import { fetchWithAuth } from './client';

export interface SearchUser {
  _id: string;
  username: string;
  profilePictureUrl?: string;
  bio?: string;
  experiencePoints?: number;
}

export interface SearchAnimal {
  _id: string;
  commonName: string;
  scientificName?: string;
  category?: string;
  rarityLevel?: string;
  imageUrls?: string[];
}

export interface SearchSighting {
  _id: string;
  caption?: string;
  mediaUrls: string[];
  aiIdentification?: string;
  user: {
    _id: string;
    username: string;
    profilePictureUrl?: string;
  };
  animalId?: {
    _id: string;
    commonName: string;
    scientificName?: string;
  };
  createdAt: string;
  likes: number;
  comments: number;
  isLikedByUser?: boolean;
}

export interface SearchResults {
  users: SearchUser[];
  animals: SearchAnimal[];
  sightings: SearchSighting[];
}

/**
 * Search across users, animals, and sightings
 * GET /api/v1/search?q=term&type=all|users|animals|sightings
 */
export const apiSearch = async (
  query: string,
  type: 'all' | 'users' | 'animals' | 'sightings' = 'all',
  page = 1,
  pageSize = 20,
  token?: string
): Promise<SearchResults> => {
  const params = new URLSearchParams();
  params.append('q', query);
  params.append('type', type);
  params.append('page', String(page));
  params.append('pageSize', String(pageSize));
  
  const response = await fetchWithAuth(`/search?${params.toString()}`, token || '');
  return response?.data || { users: [], animals: [], sightings: [] };
};

/**
 * Search users only
 */
export const apiSearchUsers = async (query: string, page = 1, pageSize = 20, token?: string) => {
  return apiSearch(query, 'users', page, pageSize, token);
};

/**
 * Search animals only  
 */
export const apiSearchAnimalsOnly = async (query: string, page = 1, pageSize = 20, token?: string) => {
  return apiSearch(query, 'animals', page, pageSize, token);
};

/**
 * Search sightings only
 */
export const apiSearchSightings = async (query: string, page = 1, pageSize = 20, token?: string) => {
  return apiSearch(query, 'sightings', page, pageSize, token);
};

/**
 * Get trending searches (popular search terms)
 */
export const apiGetTrendingSearches = async (token?: string): Promise<string[]> => {
  try {
    const response = await fetchWithAuth('/search/trending', token || '');
    return response?.data || [];
  } catch {
    return [];
  }
};
