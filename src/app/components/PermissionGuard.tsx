import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasFeatureAccess, ROLE_PERMISSIONS } from '../config/permissions';

interface PermissionGuardProps {
  feature: keyof typeof ROLE_PERMISSIONS.admin.features;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ feature, children, fallback = null }: PermissionGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  if (!hasFeatureAccess(user.role, feature)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
