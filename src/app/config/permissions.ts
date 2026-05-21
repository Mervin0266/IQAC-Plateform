import { UserRole } from '../contexts/AuthContext';

// Define what each role can access
export const ROLE_PERMISSIONS = {
  admin: {
    pages: [
      'dashboard',
      'achievements',
      'course-files',
      'strategic-plan',
      'naac-accreditation',
      'nba-tracking',
      'event-logs',
      'user-roles',
      'research-innovation',
      'ranking',
      'incubations',
      'industry-connects',
      'consultancy-projects',
      'international-interactions',
      'centre-excellence',
      'infrastructure-facilities',
      'placements-internships',
    ],
    features: {
      canEdit: true,
      canDelete: true,
      canUpload: true,
      canManageUsers: true,
      canViewAllDepartments: true,
      canApprove: true,
      canGenerateReports: true,
      canAccessSettings: true,
    },
  },
  faculty: {
    pages: [
      'dashboard',
      'achievements',
      'course-files',
      'strategic-plan',
      'naac-accreditation',
      'research-innovation',
      'ranking',
      'incubations',
      'industry-connects',
      'consultancy-projects',
      'international-interactions',
      'infrastructure-facilities',
      'placements-internships',
    ],
    features: {
      canEdit: true,
      canDelete: false,
      canUpload: true,
      canManageUsers: false,
      canViewAllDepartments: false,
      canApprove: false,
      canGenerateReports: true,
      canAccessSettings: false,
    },
  },
  coordinator: {
    pages: [
      'dashboard',
      'achievements',
      'course-files',
      'strategic-plan',
      'nba-tracking',
      'event-logs',
      'research-innovation',
      'ranking',
      'incubations',
      'industry-connects',
      'consultancy-projects',
      'international-interactions',
      'centre-excellence',
      'infrastructure-facilities',
      'placements-internships',
    ],
    features: {
      canEdit: true,
      canDelete: false,
      canUpload: true,
      canManageUsers: false,
      canViewAllDepartments: true,
      canApprove: true,
      canGenerateReports: true,
      canAccessSettings: false,
    },
  },
};

export function hasPageAccess(role: UserRole, page: string): boolean {
  // Check if page is a department tracking page
  if (page.startsWith('strategic-plan-')) {
    return ROLE_PERMISSIONS[role].pages.includes('strategic-plan');
  }
  
  return ROLE_PERMISSIONS[role].pages.includes(page);
}

export function hasFeatureAccess(role: UserRole, feature: keyof typeof ROLE_PERMISSIONS.admin.features): boolean {
  return ROLE_PERMISSIONS[role].features[feature];
}

export function getRoleDisplayName(role: UserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}