import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { hasFeatureAccess, ROLE_PERMISSIONS } from '../config/permissions';

export type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'upload' | 'export' | 'approve' | 'manage';

/**
 * useCan — Lightweight declarative permission guard hook.
 * Example:
 *   const { can } = useCan();
 *   if (can('delete', 'publications')) { ... }
 */
export function useCan() {
  const { user } = useAuth();
  const { isSystemAdmin } = useSystemConfig();

  const can = useCallback(
    (action: ActionType, resource?: string): boolean => {
      if (!user) return false;

      const roleStr = String(user.role || '').toLowerCase();
      const isAdmin = Boolean(
        isSystemAdmin ||
        user.isSystemAdmin ||
        roleStr === 'admin' ||
        roleStr === 'system_admin'
      );

      // System Administrators have universal permission across operational resources
      if (isAdmin) return true;

      // Check user effective overrides if present
      if (resource && user.effectivePermissions && user.effectivePermissions[resource]) {
        const modulePerms = user.effectivePermissions[resource];
        if (modulePerms[action] !== undefined) {
          return Boolean(modulePerms[action]);
        }
      }

      // Map action to standard feature permissions
      switch (action) {
        case 'edit':
          return hasFeatureAccess(user.role as any, 'canEdit');
        case 'delete':
          return hasFeatureAccess(user.role as any, 'canDelete');
        case 'upload':
        case 'create':
          return hasFeatureAccess(user.role as any, 'canUpload');
        case 'approve':
          return hasFeatureAccess(user.role as any, 'canApprove');
        case 'manage':
          return hasFeatureAccess(user.role as any, 'canManageUsers');
        case 'export':
          return hasFeatureAccess(user.role as any, 'canGenerateReports');
        case 'view':
        default:
          return true;
      }
    },
    [user, isSystemAdmin]
  );

  return { can };
}
