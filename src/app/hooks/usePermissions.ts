import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { hasPageAccess, hasFeatureAccess, ROLE_PERMISSIONS, UserRole } from '../config/permissions';

export interface PermissionsHookResult {
  role: UserRole | string;
  isSystemAdmin: boolean;
  canAccessPage: (pageId: string) => boolean;
  canPerform: (feature: keyof typeof ROLE_PERMISSIONS.admin.features) => boolean;
  canManageUsers: boolean;
  canGenerateReports: boolean;
  canUpload: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canViewAllDepartments: boolean;
}

/**
 * usePermissions — Declarative hook for evaluating user role capabilities and page access.
 */
export function usePermissions(): PermissionsHookResult {
  const { user } = useAuth();
  const { isSystemAdmin } = useSystemConfig();

  const role = user?.role || 'faculty';
  const effectiveIsAdmin = Boolean(
    isSystemAdmin ||
    user?.isSystemAdmin ||
    String(role).toLowerCase() === 'admin' ||
    String(role).toLowerCase() === 'system_admin'
  );

  return useMemo(() => {
    return {
      role,
      isSystemAdmin: effectiveIsAdmin,
      canAccessPage: (pageId: string) => hasPageAccess(role, pageId, effectiveIsAdmin),
      canPerform: (feature: keyof typeof ROLE_PERMISSIONS.admin.features) =>
        hasFeatureAccess(role as any, feature),
      canManageUsers: hasFeatureAccess(role as any, 'canManageUsers'),
      canGenerateReports: hasFeatureAccess(role as any, 'canGenerateReports'),
      canUpload: hasFeatureAccess(role as any, 'canUpload'),
      canEdit: hasFeatureAccess(role as any, 'canEdit'),
      canDelete: hasFeatureAccess(role as any, 'canDelete'),
      canApprove: hasFeatureAccess(role as any, 'canApprove'),
      canViewAllDepartments: hasFeatureAccess(role as any, 'canViewAllDepartments'),
    };
  }, [role, effectiveIsAdmin]);
}
