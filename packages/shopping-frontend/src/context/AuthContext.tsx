import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import type { User } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (data: any) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  isAdmin: boolean;
  isSupport: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('shoppyToken');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const currentUser = await api.me();
      setUser(currentUser);
      localStorage.setItem('shoppyUserId', currentUser.id);
      localStorage.setItem('shoppyUserName', `${currentUser.firstName} ${currentUser.lastName}`);
      localStorage.setItem('shoppyPermission', (currentUser.permissions || []).join(','));
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (credentials: any) => {
    const res = await api.logIn(credentials);
    localStorage.setItem('shoppyToken', res.token);
    await fetchCurrentUser();
  };

  const logout = async () => {
    try {
      if (localStorage.getItem('shoppyToken')) {
        await api.logOut();
      }
    } catch {
      // ignore API errors during logout
    }
    localStorage.removeItem('shoppyToken');
    localStorage.removeItem('shoppyUserId');
    localStorage.removeItem('shoppyUserName');
    localStorage.removeItem('shoppyPermission');
    setUser(null);
  };

  const signUp = async (data: any) => {
    await api.signUp(data);
    await login({ email: data.email, password: data.password });
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    await api.updateUser(user.id, data);
    await fetchCurrentUser();
  };

  const isAdmin =
    user?.permissions?.includes('SuperAdminAccess') ||
    user?.permissions?.includes('AdministratorAccess') ||
    false;

  const isSupport =
    user?.permissions?.includes('SupportAccess') ||
    false;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        signUp,
        updateProfile,
        isAdmin,
        isSupport,
      }}
    >
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
