import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getRoleDisplayName } from '../config/permissions';
import { Shield, User, Users, Info } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

export function RoleIndicator() {
  const { user } = useAuth();

  if (!user) return null;

  const roleConfig = {
    admin: {
      icon: Shield,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      iconColor: 'text-blue-600',
      description: 'You have full system access and can manage all features.',
    },
    faculty: {
      icon: User,
      color: 'bg-green-50 border-green-200 text-green-800',
      iconColor: 'text-green-600',
      description: 'You can view and edit academic content and generate reports.',
    },
    coordinator: {
      icon: Users,
      color: 'bg-purple-50 border-purple-200 text-purple-800',
      iconColor: 'text-purple-600',
      description: 'You can coordinate departments, approve content, and generate reports.',
    },
  };

  const config = roleConfig[user.role];
  const Icon = config.icon;

  return (
    <Alert className={`${config.color} border mb-6`}>
      <Icon className={`h-4 w-4 ${config.iconColor}`} />
      <AlertDescription>
        <span className="font-semibold">Role: {getRoleDisplayName(user.role)}</span>
        <span className="ml-2">— {config.description}</span>
      </AlertDescription>
    </Alert>
  );
}
