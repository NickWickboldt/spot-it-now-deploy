// ==================================================================
// File: context/AuthContext.tsx
// ==================================================================
import { useRouter, useSegments } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { apiLoginUser } from '../api/auth';
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
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Try to restore token from storage on startup
    const restore = async () => {
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
        }
      } catch (e) {
        console.warn('Failed to restore auth token', e);
      }
    };
    restore();

    const inTabsGroup = segments[0] === '(tabs)';
    
    // Check if the current route is the login/index page.
    // An empty segments array means you are at the root.
    const onLoginPage = segments.length === 0;

    // If the user is not signed in and is trying to access a protected route.
    if (!token && inTabsGroup) {
      router.replace('/');
    } 
    // If the user is signed in and is on the login page.
    else if (token && onLoginPage) {
      router.replace('/feed');
    }
  }, [token, segments]);

  const login = async (credentials: {email: string, password: string}) => {
    setIsLoading(true);

    // --- LOCAL ADMIN BYPASS ---
    if (credentials.email === 'admin@local.dev' && credentials.password === 'password') {
      const localAdminUser = {
        username: 'Local Admin',
        email: 'admin@local.dev',
        role: 'admin',
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
      alert(String(error));
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
  };

  return (
  <AuthContext.Provider value={{ user, token, login, logout, isLoading, refreshUser }}>
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
