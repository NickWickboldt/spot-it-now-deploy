// File: api/auth.ts
import { BASE_URL } from './client';

export const apiLoginUser = async (credentials: {email: string, password: string}) => {
  const response = await fetch(`${BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
     const errorData = await response.json();
     throw new Error(errorData.message || 'Login failed');
  }
  return response.json();
};

// Add apiLogoutUser and apiRegisterUser here when you need them.