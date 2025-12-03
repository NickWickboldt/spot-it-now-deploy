// ==================================================================
// File: context/AuthContext.tsx
// ==================================================================
import { useRouter, useSegments } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { apiCompleteOnboarding, apiLoginUser, apiRegisterUser } from '../api/auth';
import { setAuthToken } from '../api/client';
import { apiGetCurrentUser } from '../api/user';
// AsyncStorage is used on native platforms to persist the token between sessions
let AsyncStorage: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  } catch (e) {
    // If async-storage isn't installed (e.g., web-only dev), we'll skip persistence
    AsyncStorage = null;
  }

}

interface AuthContextType {
  user: any | null;
  token: string | null;
  login: (credentials: any) => Promise<void>;
  register: (credentials: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  completeOnboarding: (onboardingData: any) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with true to prevent flash
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Try to restore token from storage on startup
    const restore = async () => {
      setIsLoading(true);
      try {
        let storedToken: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          storedToken = window.localStorage.getItem('authToken');
        } else if (AsyncStorage) {
          storedToken = await AsyncStorage.getItem('authToken');
        }
        if (storedToken) {
          setToken(storedToken);
          setAuthToken(storedToken);
          
          // Fetch user data with the restored token
          try {
            const resp = await apiGetCurrentUser(storedToken);
            if (resp && resp.data) {
              setUser(resp.data);
            }
          } catch (e) {
            console.warn('Failed to fetch user with stored token, logging out', e);
            // Token might be expired, clear it
            setToken(null);
            setAuthToken(null);
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.removeItem('authToken');
            } else if (AsyncStorage) {
              await AsyncStorage.removeItem('authToken');
            }
          }
        }
      } catch (e) {
        console.warn('Failed to restore auth token', e);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };
    restore();
  }, []); // Only run once on mount

  useEffect(() => {
    // Don't navigate until initialization is complete
    if (!isInitialized) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const inUserGroup = segments[0] === '(user)';
    const inAdminGroup = segments[0] === '(admin)';
    
    // Check if the current route is specifically the login/index page
    // segments will be ['index'] or [] when on the root login page
    const onLoginPage = segments.length === 0 || 
                        (segments.length === 1 && segments[0] === 'index') ||
                        (!inTabsGroup && !inUserGroup && !inAdminGroup && segments[0] !== '+not-found');

    // Only redirect if we have a definitive state
    if (token === null && inTabsGroup) {
      router.replace('/');
    } 
    else if (token && user && onLoginPage && segments.length <= 1) {
      // Only redirect from login page, not when navigating between authenticated routes
      if (!user.onboardingCompleted) {
        router.navigate({ pathname: '/(user)/onboarding_profile' } as any);
      } else {
        router.navigate({ pathname: '/(tabs)/feed' } as any);
      }
    }
  }, [token, segments, user?.onboardingCompleted, isInitialized]);

  const login = async (credentials: {email: string, password: string}) => {
    setIsLoading(true);

    // --- LOCAL ADMIN BYPASS ---
    if (credentials.email === 'admin@local.dev' && credentials.password === 'password') {
      const localAdminUser = {
        username: 'Local Admin',
        email: 'admin@local.dev',
        role: 'admin',
        onboardingCompleted: true,
      };
      setUser(localAdminUser);
      const fake = 'local-admin-fake-token';
      setToken(fake); // Use a fake token
      setAuthToken(fake);
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('authToken', fake);
        } else if (AsyncStorage) {
          await AsyncStorage.setItem('authToken', fake);
        }
      } catch (e) {
        // ignore storage errors for local admin
      }
      setIsLoading(false);
      return;
    }
    // --- END LOCAL ADMIN BYPASS ---

    try {
      const response = await apiLoginUser(credentials);
      const { user: userData, accessToken, refreshToken, role } = response.data;
      console.log(userData)
      console.log(role)
      // Prefer role provided by backend (set by admin lookup); fall back to email check
      if (!userData.role) {
        userData.role = role
      }

      setToken(accessToken);
      setAuthToken(accessToken);
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('authToken', accessToken);
        } else if (AsyncStorage) {
          await AsyncStorage.setItem('authToken', accessToken);
        }
      } catch (e) {
        console.warn('Failed to persist auth token', e);
      }
      setUser(userData);
    } catch (error) {
      console.error("Login failed:", error);
      throw error; // Re-throw to let the login screen handle it
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: {username: string, email: string, password: string}) => {
    setIsLoading(true);
    try {
      const response = await apiRegisterUser(credentials);
      console.log('Register response:', response);
      
      // Backend response structure: { data: { ...user, accessToken, refreshToken }, statusCode, success, message }
      const responseData = response.data;
      
      if (!responseData) {
        throw new Error('Invalid registration response');
      }
      
      // Extract accessToken and refreshToken, rest is user data
      const { accessToken, refreshToken, ...userData } = responseData;
      
      if (!accessToken) {
        throw new Error('No access token received from registration');
      }
      
      console.log('Extracted from registration:', { hasUser: !!userData, hasToken: !!accessToken });
      
      setToken(accessToken);
      setAuthToken(accessToken);
      
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('authToken', accessToken);
        } else if (AsyncStorage) {
          await AsyncStorage.setItem('authToken', accessToken);
        }
      } catch (e) {
        console.warn('Failed to persist auth token', e);
      }
      
      setUser(userData);
      console.log('User and token set successfully after registration');
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async (onboardingData: any) => {
    setIsLoading(true);
    try {
      if (!token) throw new Error('No auth token found');
      
      const response = await apiCompleteOnboarding(onboardingData, token);
      const { data: updatedUser } = response;
      
      setUser(updatedUser);
    } catch (error) {
      console.error("Onboarding completion failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const resp = await apiGetCurrentUser(token);
      if (resp && resp.data) setUser(resp.data);
    } catch (e) {
      console.warn('Failed to refresh user', e);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('authToken');
      } else if (AsyncStorage) {
        AsyncStorage.removeItem('authToken');
      }
    } catch (e) {
      // ignore
    }
    // Navigate to login screen after logout
    router.replace('/');
  };

  return (
  <AuthContext.Provider value={{ user, token, login, logout, isLoading, refreshUser, register, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
