import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';

export interface DataScopeHookResult {
  isUniversityScope: boolean;
  userDepartment: string | null;
  userCampus: string | null;
  userSchool: string | null;
  allowedDepartments: string[];
  canAccessDepartment: (deptName?: string | null) => boolean;
  enforceScopeFilter: (currentFilter: string) => string;
}

/**
 * useDataScope — Enforces institutional organizational boundaries across Campus, School, and Department.
 */
export function useDataScope(): DataScopeHookResult {
  const { user } = useAuth();
  const { isSystemAdmin } = useSystemConfig();

  return useMemo(() => {
    if (!user) {
      return {
        isUniversityScope: false,
        userDepartment: null,
        userCampus: null,
        userSchool: null,
        allowedDepartments: [],
        canAccessDepartment: () => false,
        enforceScopeFilter: (f) => f,
      };
    }

    const roleStr = String(user.role || '').toLowerCase();
    const scopes = Array.isArray(user.assignedScopes) ? user.assignedScopes : [];

    const isUniversityScope = Boolean(
      isSystemAdmin ||
      user.isSystemAdmin ||
      roleStr === 'admin' ||
      roleStr === 'system_admin' ||
      roleStr === 'authority' ||
      roleStr === 'iqac_admin' ||
      scopes.some((s) => s.scopeType === 'university')
    );

    const allowedDeptsSet = new Set<string>();
    if (user.department && user.department.trim() !== '' && user.department !== 'All') {
      allowedDeptsSet.add(user.department);
    }
    scopes.forEach((s) => {
      if (s.departmentName && s.departmentName.trim() !== '') {
        allowedDeptsSet.add(s.departmentName);
      }
    });

    const allowedDepartments = Array.from(allowedDeptsSet);

    const canAccessDepartment = (deptName?: string | null): boolean => {
      if (isUniversityScope) return true;
      if (!deptName || deptName === 'All' || deptName === 'all') return false;

      const norm = deptName.toLowerCase().replace(/[^a-z0-9]/g, '');
      return allowedDepartments.some(
        (d) => d.toLowerCase().replace(/[^a-z0-9]/g, '') === norm
      );
    };

    const enforceScopeFilter = (currentFilter: string): string => {
      if (isUniversityScope) return currentFilter;
      if (!currentFilter || currentFilter === 'All') {
        return user.department || (allowedDepartments[0] || 'All');
      }
      return canAccessDepartment(currentFilter) ? currentFilter : (user.department || 'All');
    };

    return {
      isUniversityScope,
      userDepartment: user.department || null,
      userCampus: user.campus || null,
      userSchool: user.school || null,
      allowedDepartments,
      canAccessDepartment,
      enforceScopeFilter,
    };
  }, [user, isSystemAdmin]);
}
