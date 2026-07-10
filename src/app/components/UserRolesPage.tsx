import React from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Shield, User, Users, Check, X } from 'lucide-react';
import { ROLE_PERMISSIONS } from '../config/permissions';
import { Badge } from './ui/badge';

interface UserRolesPageProps {
  onNavigate: (page: string) => void;
}

export function UserRolesPage({ onNavigate }: UserRolesPageProps) {
  const roles = [
    {
      role: 'admin',
      title: 'Administrator',
      icon: Shield,
      color: 'bg-blue-600',
      description: 'Full system access and management capabilities',
    },
    {
      role: 'faculty',
      title: 'Faculty',
      icon: User,
      color: 'bg-green-600',
      description: 'Access to academic content and report generation',
    },
    {
      role: 'coordinator',
      title: 'Coordinator',
      icon: Users,
      color: 'bg-purple-600',
      description: 'Department coordination and approval capabilities',
    },
  ];

  const featureLabels = {
    canEdit: 'Edit Content',
    canDelete: 'Delete Content',
    canUpload: 'Upload Files',
    canManageUsers: 'Manage Users',
    canViewAllDepartments: 'View All Departments',
    canApprove: 'Approve Content',
    canGenerateReports: 'Generate Reports',
    canAccessSettings: 'Access Settings',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage="user-roles" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">User Roles & Permissions</h1>
            <p className="text-gray-600">
              Understand the different user roles and their access permissions in the IQAC platform.
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {roles.map((roleInfo) => {
              const Icon = roleInfo.icon;
              const permissions = ROLE_PERMISSIONS[roleInfo.role as keyof typeof ROLE_PERMISSIONS];
              
              return (
                <Card key={roleInfo.role} className="overflow-hidden">
                  <CardHeader className={`${roleInfo.color} text-white`}>
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-white">{roleInfo.title}</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-white text-opacity-90">
                      {roleInfo.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Page Access:</p>
                        <div className="flex flex-wrap gap-1">
                          {permissions.pages.slice(0, 4).map((page) => (
                            <Badge key={page} variant="secondary" className="text-xs">
                              {page.replace(/-/g, ' ')}
                            </Badge>
                          ))}
                          {permissions.pages.length > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{permissions.pages.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Permissions Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Permissions Matrix</CardTitle>
              <CardDescription>
                Detailed breakdown of permissions for each role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Permission</th>
                      <th className="text-center py-3 px-4 font-semibold text-blue-700">Admin</th>
                      <th className="text-center py-3 px-4 font-semibold text-green-700">Faculty</th>
                      <th className="text-center py-3 px-4 font-semibold text-purple-700">Coordinator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(featureLabels).map(([key, label]) => (
                      <tr key={key} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-700">{label}</td>
                        <td className="py-3 px-4 text-center">
                          {ROLE_PERMISSIONS.admin.features[key as keyof typeof ROLE_PERMISSIONS.admin.features] ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-red-400 mx-auto" />
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {ROLE_PERMISSIONS.faculty.features[key as keyof typeof ROLE_PERMISSIONS.faculty.features] ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-red-400 mx-auto" />
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {ROLE_PERMISSIONS.coordinator.features[key as keyof typeof ROLE_PERMISSIONS.coordinator.features] ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-red-400 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Page Access Details */}
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {roles.map((roleInfo) => {
              const Icon = roleInfo.icon;
              const permissions = ROLE_PERMISSIONS[roleInfo.role as keyof typeof ROLE_PERMISSIONS];
              
              return (
                <Card key={`pages-${roleInfo.role}`}>
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Icon className={`w-5 h-5 ${roleInfo.color.replace('bg-', 'text-')}`} />
                      <CardTitle className="text-base">{roleInfo.title} Pages</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {permissions.pages.map((page) => (
                        <li key={page} className="flex items-center text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                          <span className="capitalize">{page.replace(/-/g, ' ')}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
