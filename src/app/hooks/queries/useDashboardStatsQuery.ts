import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface DashboardStatsData {
  sysStats: any;
  hStats: any;
}

export function useDashboardStatsQuery() {
  const { user, logout } = useAuth();

  return useQuery<DashboardStatsData>({
    queryKey: ['dashboardSystemStats', user?.id || 'anonymous'],
    queryFn: async ({ signal }) => {
      if (!user?.token) {
        return { sysStats: null, hStats: null };
      }
      const headers = { Authorization: `Bearer ${user.token}` };
      const opts = { headers, signal };

      const [resSysStats, resHierarchy] = await Promise.all([
        fetch(`${API_BASE}/api/system/dashboard-stats`, opts),
        fetch(`${API_BASE}/api/hierarchy/stats`, opts),
      ]);

      if (resSysStats.status === 401 || resHierarchy.status === 401) {
        logout();
        throw new Error('Unauthorized');
      }

      const [sysStatsData, hierarchyData] = await Promise.all([
        resSysStats.ok ? resSysStats.json() : { success: false },
        resHierarchy.ok ? resHierarchy.json() : { success: false },
      ]);

      return {
        sysStats: sysStatsData.success ? sysStatsData.data : null,
        hStats: hierarchyData.success ? hierarchyData.data : null,
      };
    },
    enabled: !!user?.token,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
}
