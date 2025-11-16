// ==================================================================
// File: context/AuthContext.tsx
// ==================================================================
import { useRouter, useSegments } from "expo-router";
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  completeOnboarding: (onboardingData: any) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    // Try to restore token from storage ONLY on app startup
    // Use ref to ensure this NEVER runs more than once, even if component remounts
    if (hasRestoredRef.current) {
      console.log('Restore: Already restored, skipping');
      return;
    }
    
    const restore = async () => {
      hasRestoredRef.current = true;
      try {
        let storedToken: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          storedToken = window.localStorage.getItem('authToken');
          console.log('Restore: Checked web localStorage for token', { hasToken: !!storedToken, tokenPrefix: storedToken?.substring(0, 20) });
        } else if (AsyncStorage) {
          storedToken = await AsyncStorage.getItem('authToken');
          console.log('Restore: Checked AsyncStorage for token', { hasToken: !!storedToken, tokenPrefix: storedToken?.substring(0, 20) });
        }
        if (storedToken) {
          console.log('Restored token from storage on app startup', { tokenPrefix: storedToken.substring(0, 20) });
          console.log('SETTING TOKEN (restore):', storedToken.substring(0, 20));
          setToken(storedToken);
          setAuthToken(storedToken);
        } else {
          console.log('No token found in storage on startup - user will need to login');
        }
      } catch (e) {
        console.warn('Failed to restore auth token', e);
      }
    };
    restore();
    // Empty dependency array means this only runs once on mount
  }, []);

  // DEBUG: Log whenever token changes
  useEffect(() => {
    console.log('TOKEN STATE CHANGED:', { 
      hasToken: !!token, 
      tokenPrefix: token?.substring(0, 20),
      timestamp: new Date().toISOString()
    });
  }, [token]);

  useEffect(() => {
    const inTabsGroup = segments[0] === '(tabs)';
    const inUserGroup = segments[0] === '(user)';
    const inAdminGroup = segments[0] === '(admin)';
    
    // Check if the current route is the login/index page.
    // We're on login if we're not in any of the main groups
    const onLoginPage = !inTabsGroup && !inUserGroup && !inAdminGroup;

    // Only redirect if we have a definitive state
    if (token === null && inTabsGroup) {
      router.replace('/');
    } 
    else if (token && user && onLoginPage) {
      // If onboarding is not complete, go to registration flow
      if (!user.onboardingCompleted) {
        router.navigate({ pathname: '/(user)/onboarding_register' } as any);
      } else {
        router.navigate({ pathname: '/(tabs)/feed' } as any);
      }
    }
  }, [token, segments, user?.onboardingCompleted]);

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

      console.log('SETTING TOKEN (login):', accessToken.substring(0, 20));
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

  const register = async (credentials: {username: string, email: string, password: string}) => {
    setIsLoading(true);
    try {
      // CRITICAL: Clear any old token from storage before registering new user
      // This prevents old tokens from being restored on app remount
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('authToken');
          console.log('Register: Cleared old token from web localStorage');
        } else if (AsyncStorage) {
          await AsyncStorage.removeItem('authToken');
          console.log('Register: Cleared old token from AsyncStorage');
        }
      } catch (e) {
        console.warn('Failed to clear old token before registration', e);
      }

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
      
      console.log('Extracted from registration:', { hasUser: !!userData, hasToken: !!accessToken, userId: userData._id });
      
      // Set in-memory token first
      console.log('SETTING TOKEN (register):', accessToken.substring(0, 20));
      setToken(accessToken);
      setAuthToken(accessToken);
      
      // Then persist new token to storage
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('authToken', accessToken);
          console.log('Register: Saved new token to web localStorage');
        } else if (AsyncStorage) {
          await AsyncStorage.setItem('authToken', accessToken);
          console.log('Register: Saved new token to AsyncStorage');
        }
      } catch (e) {
        console.warn('Failed to persist auth token', e);
      }
      
      setUser(userData);
      console.log('User and token set successfully after registration', { 
        userId: userData._id,
        username: userData.username,
        tokenPrefix: accessToken.substring(0, 20)
      });
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

  const logout = async () => {
    console.log('Logout: Starting logout process');
    
    // CRITICAL: Clear AsyncStorage FIRST before clearing state or navigating
    // This prevents restore() from finding an old token if the app remounts during navigation
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('authToken');
        console.log('Logout: Removed token from web localStorage');
      } else if (AsyncStorage) {
        await AsyncStorage.removeItem('authToken');
        console.log('Logout: Removed token from AsyncStorage');
        
        // Verify it's actually gone
        const verifyRemoval = await AsyncStorage.getItem('authToken');
        console.log('Logout: Verified removal from AsyncStorage', { stillExists: !!verifyRemoval });
      }
    } catch (e) {
      console.warn('Failed to remove auth token on logout', e);
    }
    
    // Reset the restore flag so a new login can work properly
    hasRestoredRef.current = false;
    console.log('Logout: Reset restore flag for next session');
    
    // NOW clear in-memory state
    console.log('SETTING TOKEN (logout): null');
    setToken(null);
    setUser(null);
    setAuthToken(null);
    console.log('Logout: Cleared in-memory token and user');
    
    // Finally, navigate to login
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
