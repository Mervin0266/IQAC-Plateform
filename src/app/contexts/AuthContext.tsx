import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'faculty' | 'coordinator';

export interface User {
  username: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: UserRole) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock credentials for demonstration
const MOCK_CREDENTIALS = {
  admin: { username: 'admin', password: 'admin123' },
  faculty: { username: 'faculty', password: 'faculty123' },
  coordinator: { username: 'coordinator', password: 'coordinator123' },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('iqac_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (username: string, password: string, role: UserRole): boolean => {
    const credentials = MOCK_CREDENTIALS[role];
    
    if (username === credentials.username && password === credentials.password) {
      const newUser = { username, role };
      setUser(newUser);
      localStorage.setItem('iqac_user', JSON.stringify(newUser));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('iqac_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
