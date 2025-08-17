export const BASE_URL = 'http://localhost:8000/api/v1';

export const fetchWithAuth = async (endpoint: string, token: string, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'API request failed');
  }
  // Handle cases where the response body might be empty (e.g., DELETE requests)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  return {}; // Return an empty object for non-json responses
};