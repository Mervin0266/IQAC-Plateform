import React from 'react';
import { PatentsPage } from './PatentsPage';
import { useAuth } from '../contexts/AuthContext';

interface ResearchInnovationPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
  hideSidebar?: boolean;
}

export function ResearchInnovationPage({ onNavigate, hideSidebar = false }: ResearchInnovationPageProps) {
  const { user } = useAuth();
  return (
    <PatentsPage
      onNavigate={onNavigate}
      hideSidebar={hideSidebar}
      token={user?.token}
      userRole={user?.role}
    />
  );
}