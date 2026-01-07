// File: api/auth.ts
import { BASE_URL } from './client';

export const apiLoginUser = async (credentials: {email: string, password: string}) => {
  // Backend expects 'username' field (which can be username OR email)
  const loginPayload = { username: credentials.email, password: credentials.password };
  console.log('[AUTH] Login attempt:', { username: loginPayload.username, hasPassword: !!loginPayload.password });
  
  const response = await fetch(`${BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginPayload),
  });
  if (!response.ok) {
     const errorData = await response.json();
     throw new Error(errorData.message || 'Login failed');
  }
  return response.json();
};

export const apiRegisterUser = async (credentials: {username: string, email: string, password: string}) => {
  const response = await fetch(`${BASE_URL}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Registration failed');
  }
  return response.json();
};

export const apiCompleteOnboarding = async (onboardingData: {username: string, bio: string, profilePictureUrl: string, animalPreferences: string[]}, token: string) => {
  console.log('[apiCompleteOnboarding] Called with token:', { tokenPrefix: token.substring(0, 20), dataUsername: onboardingData.username });
  const response = await fetch(`${BASE_URL}/users/onboarding`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(onboardingData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Onboarding completion failed');
  }
  return response.json();
};

export const apiLogoutUser = async (token: string) => {
  const response = await fetch(`${BASE_URL}/users/logout`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Logout failed');
  }
  return response.json();
};