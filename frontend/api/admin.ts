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
