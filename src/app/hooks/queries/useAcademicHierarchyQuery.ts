import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import type { Campus, School, Department, ProgramLevel, Course } from '../useAcademicHierarchy';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface HierarchyData {
  campuses: Campus[];
  schools: School[];
  departments: Department[];
  programLevels: ProgramLevel[];
  courses: Course[];
}

export function useAcademicHierarchyQuery() {
  const { user } = useAuth();

  return useQuery<HierarchyData>({
    queryKey: ['academicHierarchy', user?.id || 'anonymous'],
    queryFn: async ({ signal }) => {
      if (!user?.token) {
        return { campuses: [], schools: [], departments: [], programLevels: [], courses: [] };
      }
      const headers = { Authorization: `Bearer ${user.token}` };
      const opts = { headers, signal };

      const [resCampuses, resSchools, resDepts, resLevels, resCourses] = await Promise.all([
        fetch(`${API_BASE}/api/campuses`, opts),
        fetch(`${API_BASE}/api/schools`, opts),
        fetch(`${API_BASE}/api/departments`, opts),
        fetch(`${API_BASE}/api/program-levels`, opts),
        fetch(`${API_BASE}/api/courses`, opts),
      ]);

      const [campusesData, schoolsData, deptsData, levelsData, coursesData] = await Promise.all([
        resCampuses.json(),
        resSchools.json(),
        resDepts.json(),
        resLevels.json(),
        resCourses.json(),
      ]);

      return {
        campuses: campusesData.success ? campusesData.data : [],
        schools: schoolsData.success ? schoolsData.data : [],
        departments: deptsData.success ? deptsData.data : [],
        programLevels: levelsData.success ? levelsData.data : [],
        courses: coursesData.success ? coursesData.data : [],
      };
    },
    enabled: !!user?.token,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000,
  });
}
