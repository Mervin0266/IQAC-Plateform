import { apiClient, ApiResponse } from './apiClient';
import { User, UserRole } from '../contexts/AuthContext';

export interface LoginCredentials {
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginResponseData {
  user: User;
  token: string;
  mustChangePassword?: boolean;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

export const authService = {
  /**
   * Submits credentials to authenticates user.
   */
  login: async (credentials: LoginCredentials): Promise<ApiResponse<LoginResponseData>> => {
    return apiClient.post<LoginResponseData>('/api/auth/login', credentials);
  },

  /**
   * Retrieves current authenticated user profile and verifies session validity.
   */
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    return apiClient.get<User>('/api/auth/me');
  },

  /**
   * Changes password (required on temporary first-login passwords).
   */
  changePassword: async (data: PasswordChangeData): Promise<ApiResponse<void>> => {
    return apiClient.put<void>('/api/auth/password', data);
  },

  /**
   * Requests password reset email.
   */
  forgotPassword: async (email: string): Promise<ApiResponse<void>> => {
    return apiClient.post<void>('/api/auth/forgot-password', { email });
  },

  /**
   * Pings the server health endpoint to pre-warm cold backend instances.
   */
  prewarmBackend: async (): Promise<void> => {
    try {
      await apiClient.get('/health');
    } catch {
      // Non-fatal pre-warming probe
    }
  },
};
