// ==================================================================
// File: context/AuthContext.tsx
// ==================================================================
import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiLoginUser } from '../api/auth';
import { useRouter, useSegments } from "expo-router";

interface AuthContextType {
  user: any | null;
  token: string | null;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
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
      setToken('local-admin-fake-token'); // Use a fake token
      setIsLoading(false);
      return;
    }
    // --- END LOCAL ADMIN BYPASS ---

    try {
      const response = await apiLoginUser(credentials);
      const { user: userData, accessToken } = response.data;
      
      userData.role = userData.email.includes('admin') ? 'admin' : 'user';

      setToken(accessToken);
      setUser(userData);
    } catch (error) {
      console.error("Login failed:", error);
      alert(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
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
