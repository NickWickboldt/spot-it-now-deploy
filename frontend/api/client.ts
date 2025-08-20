
import { Platform } from 'react-native';

// Dynamically determine backend base URL so same code works on web and on Expo Go.
// Order of attempts:
// 1. Web -> use window.location
// 2. Expo -> read the debuggerHost from expo-constants manifest to extract dev machine IP
// 3. Fallback -> localhost:8000
let BASE_URL = 'http://localhost:8000/api/v1';

const computeBaseUrl = () => {
  // Web (browser) - prefer a local backend host instead of using the frontend dev server origin
  if (Platform?.OS === 'web') {
    return 'http://localhost:8000/api/v1';
  }

  // Fallback: try using window.location if available (rare for native but safe)
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, port } = window.location as any;
    return `${protocol}//${hostname}${port ? `:${port}` : ''}/api/v1`;
  }

  // Native / Expo - attempt to read the debugger host which contains the dev machine IP
  try {
    // require at runtime to avoid bundling expo-constants into web builds
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants: any = require('expo-constants');
    const manifest = Constants?.manifest || Constants?.expoConfig || Constants?.manifest2;
    const debuggerHost = manifest?.debuggerHost || manifest?.hostUri || manifest?.packagerOpts?.devClient?.url;
    if (debuggerHost && typeof debuggerHost === 'string') {
      const ip = debuggerHost.split(':')[0];
      return `http://${ip}:8000/api/v1`;
    }
  } catch (e) {
    // ignore - expo-constants may not be available
  }

  return 'http://localhost:8000/api/v1';
};

BASE_URL = computeBaseUrl();

export const setBaseUrl = (url: string) => {
  BASE_URL = url;
};

export const fetchWithAuth = async (endpoint: string, token?: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

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
      // Try to parse error body if present
      let errorData: any = { message: 'API request failed' };
      try {
        errorData = await response.json();
      } catch (e) {
        // ignore parse errors
      }
      console.error('[API ERROR]', errorData);
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    // Handle cases where the response body might be empty (e.g., DELETE requests)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.indexOf('application/json') !== -1) {
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