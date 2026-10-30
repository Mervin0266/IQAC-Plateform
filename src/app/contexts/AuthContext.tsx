import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'authority' | 'hod' | 'coordinator' | 'faculty';

export interface User {
  id: string;
  username: string;
  name?: string;
  email: string;
  role: UserRole;
  department: string | null;
  token: string;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  isColdStart?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => Promise<LoginResult>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('iqac_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('iqac_user');
      }
    }
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<LoginResult> => {
    const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
    const isProductionHost = typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    if (isProductionHost && !rawApiUrl) {
      console.warn(
        '[IQAC Auth] ⚠️ VITE_API_URL is missing in Vercel environment variables! ' +
        'Please configure VITE_API_URL in your Vercel Project Settings and redeploy.'
      );
    }

    const baseUrl = rawApiUrl || (isProductionHost ? '' : 'http://localhost:5000');

    // Render Free Tier instances spin down on idle. Cold starts can take 60-80 seconds.
    // Allow 90 seconds timeout with explicit reason so it never aborts prematurely with a cryptic error.
    const controller = new AbortController();
    const timeoutMs = 90000;
    const timeoutId = setTimeout(() => {
      controller.abort(new DOMException(
        'Backend connection timed out after 90 seconds (Render Free Tier cold start).',
        'TimeoutError'
      ));
    }, timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);

      if (fetchErr?.name === 'AbortError' || fetchErr?.name === 'TimeoutError') {
        console.warn('[IQAC Auth] Request timed out or was aborted:', fetchErr.message || fetchErr);
        return {
          success: false,
          isColdStart: true,
          error: 'The backend server took longer than expected to respond (Render Free Tier cold start). The service is spinning up now—please wait 15 seconds and try again.'
        };
      }

      if (fetchErr instanceof TypeError && (fetchErr.message?.includes('Failed to fetch') || fetchErr.message?.includes('NetworkError'))) {
        console.error('[IQAC Auth] Network connection error:', fetchErr);
        if (!rawApiUrl && isProductionHost) {
          return {
            success: false,
            error: 'Backend API URL (VITE_API_URL) is not configured in Vercel. Please add VITE_API_URL in Vercel Project Settings > Environment Variables and redeploy.'
          };
        }
        return {
          success: false,
          error: `Unable to connect to backend server at ${baseUrl || 'origin'}. Please check if the Render backend service is awake and running.`
        };
      }

      console.error('[IQAC Auth] Fetch error:', fetchErr);
      return {
        success: false,
        error: fetchErr?.message || 'A network error occurred while connecting to the authentication server.'
      };
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      let serverMessage = '';
      try {
        const errorJson = await response.json();
        serverMessage = errorJson?.message || errorJson?.error || '';
      } catch {
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          return {
            success: false,
            isColdStart: true,
            error: `Render backend is still booting (HTTP ${response.status}). Please wait 15 seconds and try again.`
          };
        }
      }
      return {
        success: false,
        error: serverMessage || `Authentication failed (HTTP ${response.status}). Please verify your credentials.`
      };
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      return {
        success: false,
        error: 'Received non-JSON response from server. Please verify VITE_API_URL points to the Render backend and not the static frontend.'
      };
    }

    if (data?.success && data?.data) {
      const newUser: User = {
        id: data.data.user.id,
        username: data.data.user.name,
        email: data.data.user.email,
        role: data.data.user.role as UserRole,
        department: data.data.user.department,
        token: data.data.token
      };
      setUser(newUser);
      localStorage.setItem('iqac_user', JSON.stringify(newUser));
      return { success: true };
    }

    return {
      success: false,
      error: data?.message || 'Login failed. Please verify credentials.'
    };
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
