
import { Platform } from 'react-native';

// Dynamically determine backend base URL so same code works on web and on Expo Go.
// Order of attempts:
// 1. Web -> use window.location
// 2. Expo -> read the debuggerHost from expo-constants manifest to extract dev machine IP
// 3. Fallback -> localhost:8000
export let BASE_URL = 'http://localhost:8000/api/v1';

const computeBaseUrl = () => {
  console.log(Platform.OS);
  if (Platform?.OS === 'web') {
    return 'http://localhost:8000/api/v1';
  }

  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location as any;
    return `${protocol}//${hostname}:8000/api/v1`;
  }

  return 'http://localhost:8000/api/v1';
};

BASE_URL = computeBaseUrl();

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