import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    // Retain origin location for post-login redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
