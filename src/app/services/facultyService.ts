import { apiClient, ApiResponse } from './apiClient';

export interface FacultyFilterParams {
  department?: string;
  campus?: string;
  school?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const facultyService = {
  /**
   * Retrieves paginated faculty intelligence records with active filters.
   */
  getFacultyList: async (params: FacultyFilterParams = {}): Promise<ApiResponse<any[]>> => {
    const query = new URLSearchParams();
    if (params.department && params.department !== 'All') query.append('department', params.department);
    if (params.campus && params.campus !== 'All') query.append('campus', params.campus);
    if (params.school && params.school !== 'All') query.append('school', params.school);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const qs = query.toString();
    return apiClient.get<any[]>(`/api/faculty${qs ? `?${qs}` : ''}`);
  },

  /**
   * Retrieves single faculty details by ID.
   */
  getFacultyById: async (id: string | number): Promise<ApiResponse<any>> => {
    return apiClient.get(`/api/faculty/${id}`);
  },

  /**
   * Retrieves full-time faculty count reconciled across academic year filters.
   */
  getFullTimeCount: async (params: Record<string, any> = {}): Promise<ApiResponse<{ count: number }>> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== 'All') query.append(k, String(v));
    });
    const qs = query.toString();
    return apiClient.get<{ count: number }>(`/api/faculty/stats/full-time${qs ? `?${qs}` : ''}`);
  },

  /**
   * Creates or updates a faculty profile.
   */
  saveFaculty: async (data: any, id?: string | number): Promise<ApiResponse<any>> => {
    if (id) {
      return apiClient.put(`/api/faculty/${id}`, data);
    }
    return apiClient.post('/api/faculty', data);
  },

  /**
   * Deletes a faculty profile.
   */
  deleteFaculty: async (id: string | number): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/api/faculty/${id}`);
  },
};
