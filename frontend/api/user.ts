// ==================================================================
// File: api/user.ts
// ==================================================================
import { fetchWithAuth } from './client';

// UPDATED to match backend route: GET /users/me
export const apiGetCurrentUser = async (token: string) => {
  return fetchWithAuth('/users/me', token);
};

// UPDATED to match backend route: PATCH /users/me
export const apiUpdateUserDetails = async (token: string, updates: any) => {
  return fetchWithAuth('/users/me', token, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
};

// UPDATED to match backend route: DELETE /users/me
export const apiDeleteUserAccount = async (token: string) => {
  return fetchWithAuth('/users/me', token, {
    method: 'DELETE',
  });
};

// Public getters for another user's basic profile fields
export const apiGetUsernameByUserId = async (userId: string) => {
  return fetchWithAuth(`/users/${userId}/username`, '', { method: 'GET' });
};

export const apiGetProfilePictureByUserId = async (userId: string) => {
  return fetchWithAuth(`/users/${userId}/profile-picture`, '', { method: 'GET' });
};

export const apiGetBioByUserId = async (userId: string) => {
  return fetchWithAuth(`/users/${userId}/bio`, '', { method: 'GET' });
};

export const apiGetExperienceByUserId = async (userId: string) => {
  return fetchWithAuth(`/users/${userId}/experience`, '', { method: 'GET' });
};
