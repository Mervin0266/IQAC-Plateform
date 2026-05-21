import React from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { hasFeatureAccess } from '../config/permissions';

export function AddProjectButton() {
  const { user } = useAuth();
  
  // Only show button if user has edit permission
  if (!user || !hasFeatureAccess(user.role, 'canEdit')) {
    return null;
  }
  
  return (
    <button className="fixed bottom-6 left-80 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-colors z-50 flex items-center space-x-2">
      <Plus className="w-5 h-5" />
      <span>Add New Project</span>
    </button>
  );
}