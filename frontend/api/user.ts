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
