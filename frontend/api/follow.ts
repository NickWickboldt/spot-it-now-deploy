import { fetchWithAuth } from './client';

export const apiToggleFollow = async (token: string, userIdToFollow: string) => {
  return fetchWithAuth(`/follows/toggle/${userIdToFollow}`, token, { method: 'POST' });
};

export const apiGetFollowCounts = async (userId: string) => {
  return fetchWithAuth(`/follows/${userId}/counts`, '', { method: 'GET' });
};

export const apiGetFollowers = async (userId: string) => {
  return fetchWithAuth(`/follows/${userId}/followers`, '', { method: 'GET' });
};

export const apiGetFollowing = async (userId: string) => {
  return fetchWithAuth(`/follows/${userId}/following`, '', { method: 'GET' });
};

