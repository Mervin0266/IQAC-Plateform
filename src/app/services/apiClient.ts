/**
 * Centralized API Client — CHRIST (Deemed to be University) IQAC Platform
 * 
 * Provides:
 * - Unified HTTP request execution with error transformation.
 * - Automatic Bearer token extraction and injection.
 * - Request correlation tracking (X-Request-ID).
 * - Automatic 401 Unauthorized detection and session invalidation event dispatch.
 * - Production/Development API URL resolution.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
  total?: number;
  totalPages?: number;
  currentPage?: number;
  code?: string;
  errorCode?: string;
  error?: string;
  details?: any;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: any;

  constructor(message: string, status: number, code?: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/**
 * Resolves API Base URL according to current deployment environment.
 */
export function getApiBaseUrl(): string {
  const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  const isProductionHost =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  return rawApiUrl || (isProductionHost ? '' : 'http://localhost:5000');
}

/**
 * Retrieves the currently active JWT token from localStorage.
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const directToken = localStorage.getItem('token');
    if (directToken) return directToken;

    const storedUser = localStorage.getItem('iqac_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      return parsed?.token || null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Generates a lightweight unique request correlation ID.
 */
function generateRequestId(): string {
  return 'req_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
}

/**
 * Core Request Dispatcher.
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const token = getAuthToken();
  const requestId = generateRequestId();

  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (!headers.has('X-Request-ID')) {
    headers.set('X-Request-ID', requestId);
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set Content-Type only if body is not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized globally
    if (response.status === 401) {
      if (typeof window !== 'undefined' && !cleanEndpoint.includes('/api/auth/login')) {
        console.warn(`[ApiClient] 401 Unauthorized on ${cleanEndpoint}. Session expired or revoked.`);
        window.dispatchEvent(new CustomEvent('iqac-auth-logout'));
      }
    }

    const contentType = response.headers.get('content-type') || '';
    let responseData: any;

    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      responseData = { success: response.ok, message: text };
    }

    if (!response.ok) {
      const message =
        responseData?.message ||
        responseData?.error ||
        `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, responseData?.errorCode || responseData?.code, responseData);
    }

    return responseData as ApiResponse<T>;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error?.message || 'Network connection error. Please verify backend availability.',
      0,
      'NETWORK_ERROR'
    );
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, { method: 'GET', headers }),

  post: <T = any>(endpoint: string, body?: any, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers,
    }),

  put: <T = any>(endpoint: string, body?: any, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers,
    }),

  patch: <T = any>(endpoint: string, body?: any, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers,
    }),

  delete: <T = any>(endpoint: string, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, { method: 'DELETE', headers }),
};
