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
    authority: {
      icon: Shield,
      color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      iconColor: 'text-indigo-600',
      description: 'You have read-only access to browse all data and generate reports.',
    },
    hod: {
      icon: Users,
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      iconColor: 'text-amber-600',
      description: 'You have department administration control over your assigned department.',
    },
    coordinator: {
      icon: Users,
      color: 'bg-purple-50 border-purple-200 text-purple-800',
      iconColor: 'text-purple-600',
      description: 'You can verify department entries, review edit requests, and bulk upload records.',
    },
    faculty: {
      icon: User,
      color: 'bg-green-50 border-green-200 text-green-800',
      iconColor: 'text-green-600',
      description: 'You can submit achievement records, track statuses, and request modifications.',
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
