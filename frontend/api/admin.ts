// ==================================================================
// File: api/admin.ts
// ==================================================================
import { fetchWithAuth } from './client';

export const apiGetAllUsers = async (token: string) => {
  return fetchWithAuth('/users', token); 
};

// You will need a '/users/register' or similar endpoint in your backend for this
export const apiCreateUser = async (token: string, userData: any) => {
    return fetchWithAuth('/users/register', token, {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};

export const apiLoginUser = async (credentials: { email?: string; username?: string; password: string }) => {
  return fetchWithAuth('/users/login', '', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};

export const apiLogoutUser = async (token: string) => {
  return fetchWithAuth('/users/logout', token, { method: 'POST' });
};

export const apiGetCurrentUser = async (token: string) => {
  return fetchWithAuth('/users/me', token);
};

export const apiUpdateCurrentUser = async (token: string, updateData: any) => {
  return fetchWithAuth('/users/me', token, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  });
};

export const apiDeleteCurrentUser = async (token: string) => {
  return fetchWithAuth('/users/me', token, { method: 'DELETE' });
};

// Public getters for individual user fields
export const apiGetUserUsername = async (userId: string) => {
  return fetchWithAuth(`/users/${userId}/username`, '');
};

export const apiGetUserProfilePicture = async (userId: string) => {
  return fetchWithAuth(`/users/${userId}/profile-picture`, '');
};

export const apiGetUserBio = async (userId: string) => {
  return fetchWithAuth(`/users/${userId}/bio`, '');
};

export const apiGetUserExperience = async (userId: string) => {
  return fetchWithAuth(`/users/${userId}/experience`, '');
};

// Secured setters for the current authenticated user
export const apiSetUserUsername = async (token: string, username: string) => {
  return fetchWithAuth('/users/me/username', token, {
    method: 'PATCH',
    body: JSON.stringify({ username }),
  });
};

export const apiSetUserEmail = async (token: string, email: string) => {
  return fetchWithAuth('/users/me/email', token, {
    method: 'PATCH',
    body: JSON.stringify({ email }),
  });
};

export const apiSetUserProfilePicture = async (token: string, profilePictureUrl: string) => {
  return fetchWithAuth('/users/me/profile-picture', token, {
    method: 'PATCH',
    body: JSON.stringify({ profilePictureUrl }),
  });
};

export const apiSetUserBio = async (token: string, bio: string) => {
  return fetchWithAuth('/users/me/bio', token, {
    method: 'PATCH',
    body: JSON.stringify({ bio }),
  });
};

// --- Admin management helpers (require admin token) ---
export const apiAdminGetUser = async (token: string, userId: string) => {
  return fetchWithAuth(`/users/${userId}`, token);
};

export const apiAdminUpdateUser = async (token: string, userId: string, updateData: any) => {
  return fetchWithAuth(`/users/${userId}`, token, { method: 'PATCH', body: JSON.stringify(updateData) });
};

export const apiAdminDeleteUser = async (token: string, userId: string) => {
  return fetchWithAuth(`/users/${userId}`, token, { method: 'DELETE' });
};

export const apiAdminForceLogoutUser = async (token: string, userId: string) => {
  return fetchWithAuth(`/users/${userId}/force-logout`, token, { method: 'POST' });
};

// Promote a regular user to an admin (requires super-admin token)
export const apiAdminPromoteUser = async (token: string, userId: string, permissionLevel = 1) => {
  return fetchWithAuth('/admins/promote', token, {
    method: 'POST',
    body: JSON.stringify({ userId, permissionLevel }),
  });
};

