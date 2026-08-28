import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

export function useAcademicHierarchy() {
  const { user } = useAuth();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programLevels, setProgramLevels] = useState<ProgramLevel[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHierarchy = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);

    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const opts = { headers };

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

      if (campusesData.success) setCampuses(campusesData.data);
      if (schoolsData.success) setSchools(schoolsData.data);
      if (deptsData.success) setDepartments(deptsData.data);
      if (levelsData.success) setProgramLevels(levelsData.data);
      if (coursesData.success) setCourses(coursesData.data);

    } catch (err: any) {
      console.error('Error fetching academic hierarchy:', err);
      setError('Failed to load academic hierarchy from database.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

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
    return departments.map((d) => d.name);
  }, [departments]);

  const campusList = useMemo(() => {
    return campuses.map((c) => c.name);
  }, [campuses]);

  const schoolList = useMemo(() => {
    return schools.map((s) => s.name);
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
    refetch: fetchHierarchy
  };
}
