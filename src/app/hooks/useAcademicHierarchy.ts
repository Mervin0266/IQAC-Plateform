import { useMemo, useCallback, useEffect } from 'react';
import { useAcademicHierarchyQuery } from './queries/useAcademicHierarchyQuery';
import { queryClient } from '../config/queryClient';

export interface Campus {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: 'Active' | 'Inactive';
}

export interface School {
  id: string;
  code: string;
  name: string;
  description?: string;
  campusId: string;
  status: 'Active' | 'Inactive';
  campus?: Campus;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  schoolId?: string;
  hodId?: string;
  hodName?: string;
  hodEmail?: string;
  establishedYear?: number | null;
  phone?: string;
  description?: string;
  status: 'Active' | 'Inactive';
  school?: School;
}

export interface ProgramLevel {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: 'Active' | 'Inactive';
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  departmentId: string;
  programLevelId?: string;
  duration?: string;
  status: 'Active' | 'Inactive';
  programLevel?: ProgramLevel;
}

const DEFAULT_DEPARTMENTS = [
  'Civil Engineering',
  'Computer Science and Engineering',
  'Electronics and Communication Engineering',
  'Electrical and Electronics Engineering',
  'Mechanical and Automobile Engineering',
  'Sciences and Humanities (Engineering)',
  'AI and Data Science Engineering',
  'School of Architecture'
];

const DEFAULT_CAMPUSES = [
  'Kengeri Campus',
  'Central Campus',
  'Bannerghatta Road Campus',
  'Yeshwanthpur Campus',
  'Delhi NCR Campus',
  'Lavasa Campus'
];

const DEFAULT_SCHOOLS = [
  'School of Engineering and Technology',
  'School of Architecture',
  'School of Sciences',
  'School of Commerce, Finance and Accountancy',
  'School of Business and Management',
  'School of Law'
];

export function useAcademicHierarchy() {
  const { data, isLoading, error: queryError, refetch } = useAcademicHierarchyQuery();

  const campuses = data?.campuses || [];
  const schools = data?.schools || [];
  const departments = data?.departments || [];
  const programLevels = data?.programLevels || [];
  const courses = data?.courses || [];
  const loading = isLoading;
  const error = queryError ? (queryError as Error).message || 'Failed to load academic hierarchy' : null;

  // Listen for centralized configuration updates from System Administration V2.0
  useEffect(() => {
    const handleConfigUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['academicHierarchy'] });
    };
    window.addEventListener('iqac:config-updated', handleConfigUpdate);
    return () => window.removeEventListener('iqac:config-updated', handleConfigUpdate);
  }, []);

  // Quick lookups
  const departmentMap = useMemo(() => {
    const map: Record<string, Department> = {};
    departments.forEach((d) => {
      map[d.code] = d;
      map[d.name] = d;
      map[d.id] = d;
    });
    return map;
  }, [departments]);

  // Dropdown list options
  const departmentList = useMemo(() => {
    const list = departments.map((d) => d.name);
    return list.length > 0 ? Array.from(new Set(list)) : DEFAULT_DEPARTMENTS;
  }, [departments]);

  const campusList = useMemo(() => {
    const list = campuses.map((c) => c.name);
    return list.length > 0 ? Array.from(new Set(list)) : DEFAULT_CAMPUSES;
  }, [campuses]);

  const schoolList = useMemo(() => {
    const list = schools.map((s) => s.name);
    return list.length > 0 ? Array.from(new Set(list)) : DEFAULT_SCHOOLS;
  }, [schools]);

  const programLevelList = useMemo(() => {
    return programLevels.map((l) => l.name);
  }, [programLevels]);

  // Dynamic derivation: Program Levels offered by a specific Department
  const getProgramLevelsForDepartment = useCallback((deptIdentifier: string) => {
    const dept = departmentMap[deptIdentifier];
    const deptId = dept ? dept.id : deptIdentifier;
    
    const deptCourses = courses.filter(c => c.departmentId === deptId);
    const levelIds = new Set(deptCourses.map(c => c.programLevelId).filter(Boolean));
    
    return programLevels.filter(l => levelIds.has(l.id));
  }, [departmentMap, courses, programLevels]);

  // Dynamic derivation: Courses belonging to Department + Program Level
  const getCoursesByDeptAndLevel = useCallback((deptIdentifier: string, levelIdentifier: string) => {
    const dept = departmentMap[deptIdentifier];
    const deptId = dept ? dept.id : deptIdentifier;

    const level = programLevels.find(l => l.id === levelIdentifier || l.code === levelIdentifier || l.name === levelIdentifier);
    const levelId = level ? level.id : levelIdentifier;

    return courses.filter(c => c.departmentId === deptId && c.programLevelId === levelId);
  }, [departmentMap, programLevels, courses]);

  return {
    campuses,
    schools,
    departments,
    programLevels,
    courses,
    loading,
    error,
    departmentMap,
    departmentList,
    campusList,
    schoolList,
    programLevelList,
    getProgramLevelsForDepartment,
    getCoursesByDeptAndLevel,
    refetch,
  };
}
