import { apiClient, ApiResponse, getApiBaseUrl, getAuthToken } from './apiClient';

export interface ReportGenerationRequest {
  reportType: 'comprehensive' | 'department' | 'faculty' | 'research';
  format: 'excel' | 'pdf' | 'docx';
  academicYear?: string;
  department?: string;
  campus?: string;
  school?: string;
}

export const reportService = {
  /**
   * Generates an institutional report and downloads the resulting artifact.
   */
  downloadReport: async (options: ReportGenerationRequest): Promise<void> => {
    const baseUrl = getApiBaseUrl();
    const token = getAuthToken();

    const query = new URLSearchParams();
    query.append('format', options.format);
    if (options.academicYear) query.append('academicYear', options.academicYear);
    if (options.department && options.department !== 'All') query.append('department', options.department);
    if (options.campus && options.campus !== 'All') query.append('campus', options.campus);
    if (options.school && options.school !== 'All') query.append('school', options.school);

    const url = `${baseUrl}/api/research-reports/generate/${options.reportType}?${query.toString()}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      throw new Error(`Report generation failed with status ${res.status}`);
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `IQAC_Report_${options.reportType}_${Date.now()}.${options.format === 'excel' ? 'xlsx' : options.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Retrieves generated report history.
   */
  getReportHistory: async (): Promise<ApiResponse<any[]>> => {
    return apiClient.get<any[]>('/api/research-reports/history');
  },
};
