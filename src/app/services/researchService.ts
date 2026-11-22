import { apiClient, ApiResponse } from './apiClient';

export interface ResearchFilterParams {
  department?: string;
  academicYear?: string;
  indexing?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const researchService = {
  /**
   * Retrieves publications list with filters.
   */
  getPublications: async (params: ResearchFilterParams = {}): Promise<ApiResponse<any[]>> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== 'All') query.append(k, String(v));
    });
    const qs = query.toString();
    return apiClient.get<any[]>(`/api/publications${qs ? `?${qs}` : ''}`);
  },

  /**
   * Retrieves patents list with filters.
   */
  getPatents: async (params: ResearchFilterParams = {}): Promise<ApiResponse<any[]>> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== 'All') query.append(k, String(v));
    });
    const qs = query.toString();
    return apiClient.get<any[]>(`/api/patents${qs ? `?${qs}` : ''}`);
  },

  /**
   * Retrieves copyrights list with filters.
   */
  getCopyrights: async (params: ResearchFilterParams = {}): Promise<ApiResponse<any[]>> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== 'All') query.append(k, String(v));
    });
    const qs = query.toString();
    return apiClient.get<any[]>(`/api/copyrights${qs ? `?${qs}` : ''}`);
  },

  /**
   * Retrieves consultancy projects list with dual INR/USD values.
   */
  getConsultancyProjects: async (params: Record<string, any> = {}): Promise<ApiResponse<any>> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== 'All') query.append(k, String(v));
    });
    const qs = query.toString();
    return apiClient.get(`/api/consultancy-projects${qs ? `?${qs}` : ''}`);
  },

  /**
   * Retrieves sponsored research projects list with filters.
   */
  getSponsoredProjects: async (params: Record<string, any> = {}): Promise<ApiResponse<any>> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== 'All') query.append(k, String(v));
    });
    const qs = query.toString();
    return apiClient.get(`/api/sponsored-projects${qs ? `?${qs}` : ''}`);
  },

  /**
   * Retrieves institutional analytics dashboard dataset.
   */
  getDashboardAnalytics: async (filters: Record<string, any> = {}): Promise<ApiResponse<any>> => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== 'All') {
        if (Array.isArray(v)) {
          v.forEach((val) => query.append(k, val));
        } else {
          query.append(k, String(v));
        }
      }
    });
    const qs = query.toString();
    return apiClient.get(`/api/institutional-analytics/dashboard${qs ? `?${qs}` : ''}`);
  },
};
