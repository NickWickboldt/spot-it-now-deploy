
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Dynamically determine backend base URL so same code works on web, iOS, Android, and Expo Go.
// For iOS Simulator/Android Emulator, we need to use the dev machine's local IP
export let BASE_URL = 'http://localhost:8000/api/v1';

const computeBaseUrl = () => {
  console.log('[CLIENT] Platform:', Platform.OS);
  
  // Web platform
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      const { protocol, hostname } = window.location;
      return `${protocol}//${hostname}:8000/api/v1`;
    }
    return 'http://localhost:8000/api/v1';
  }

  // iOS/Android - try to get the dev machine IP from Expo
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      // In development, Expo provides the debuggerHost which contains the dev machine IP
      const debuggerHost = Constants.expoConfig?.hostUri;
      
      if (debuggerHost) {
        // debuggerHost is typically like "192.168.1.100:8081" or "192.168.1.100:19000"
        const host = debuggerHost.split(':')[0];
        const url = `http://${host}:8000/api/v1`;
        console.log('[CLIENT] Using dev machine IP:', url);
        return url;
      }
    } catch (e) {
      console.warn('[CLIENT] Could not get debuggerHost:', e);
    }
    
    // Fallback for iOS Simulator - use localhost (works on simulator)
    if (Platform.OS === 'ios') {
      console.log('[CLIENT] iOS fallback to localhost');
      return 'http://localhost:8000/api/v1';
    }
    
    // Fallback for Android Emulator - use 10.0.2.2 (special alias for host machine)
    if (Platform.OS === 'android') {
      console.log('[CLIENT] Android fallback to 10.0.2.2');
      return 'http://10.0.2.2:8000/api/v1';
    }
  }

  return 'http://localhost:8000/api/v1';
};

BASE_URL = computeBaseUrl();
console.log('[CLIENT] Final BASE_URL:', BASE_URL);

// In-memory auth token used by fetch utilities. Call `setAuthToken` after login/logout.
let AUTH_TOKEN: string | null = null;

export const setAuthToken = (token: string | null | undefined) => {
  AUTH_TOKEN = token || null;
};

export const setBaseUrl = (url: string) => {
  BASE_URL = url;
};

export const fetchWithAuth = async (endpoint: string, token?: string, options: RequestInit = {}) => {
  // prefer explicit token argument, fall back to the globally set AUTH_TOKEN
  const effectiveToken = token || AUTH_TOKEN;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (effectiveToken) headers['Authorization'] = `Bearer ${effectiveToken}`;

  // Log request details
  console.log('[API REQUEST]', {
    url: `${BASE_URL}${endpoint}`,
    method: options.method || 'GET',
    headers,
    body: options.body,
  });

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

    // Log response status
    console.log('[API RESPONSE]', {
      url: `${BASE_URL}${endpoint}`,
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      // Try to read and log the response body so we can diagnose 401/403 issues.
      let textBody = '';
      try {
        textBody = await response.text();
      } catch (e) {
        // ignore
      }

      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const parsed = JSON.parse(textBody);
        console.error('[API ERROR - parsed]', parsed);
        errorMessage = parsed?.message || errorMessage;
      } catch (e) {
        console.error('[API ERROR - text]', textBody);
        // if there's plain text, use it in the message
        if (textBody) errorMessage = textBody;
      }

      // Include Authorization header in the console to verify token presence (redact in production)
      console.log('[API ERROR CONTEXT]', { url: `${BASE_URL}${endpoint}`, status: response.status, headers });
      throw new Error(errorMessage);
    }

    // Handle cases where the response body might be empty (e.g., DELETE requests)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.indexOf('application/json') !== -1 ) {
      const data = await response.json();
      console.log('[API DATA]', data);
      return data;
    }
    return {}; // Return an empty object for non-json responses
  } catch (err) {
    console.error('[API FETCH ERROR]', err);
    throw err;
  }
};