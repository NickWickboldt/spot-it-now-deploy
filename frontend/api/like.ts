import { fetchWithAuth } from './client';

export const apiToggleSightingLike = async (token: string, sightingId: string) => {
  return fetchWithAuth(`/likes/toggle/${sightingId}`, token, { method: 'POST' });
};

export const apiGetSightingLikes = async (sightingId: string) => {
  return fetchWithAuth(`/likes/sighting/${sightingId}`, '', { method: 'GET' });
};

export const apiGetLikedSightingsByUser = async (userId: string) => {
  return fetchWithAuth(`/likes/user/${userId}`, '', { method: 'GET' });
};

