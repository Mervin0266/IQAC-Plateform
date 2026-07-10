import { UserRole } from '../contexts/AuthContext';

// Define what each role can access
export const ROLE_PERMISSIONS = {
  admin: {
    pages: [
      'dashboard',
      'academics',
      'faculty-details',
      'student-details',
      'department-details',
      'accreditation',
      'achievements',
      'course-files',
      'strategic-plan',
      'naac-accreditation',
      'nba-tracking',
      'event-logs',
      'user-roles',
      'user-management',
      'research-innovation',
      'publications',
      'sponsored-research',
      'ranking',
      'nirf-ranking',
      'india-today-ranking',
      'the-world-ranking',
      'qs-india-ranking',
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
  authority: {
    pages: [
      'dashboard',
      'achievements',
      'ranking',
      'naac-accreditation',
      'nba-tracking',
      'research-innovation',
      'publications',
      'sponsored-research',
      'incubations',
      'industry-connects',
      'consultancy-projects',
      'international-interactions',
      'centre-excellence',
      'infrastructure-facilities',
      'placements-internships',
      'department-details',
    ],
    features: {
      canEdit: false,
      canDelete: false,
      canUpload: false,
      canManageUsers: false,
      canViewAllDepartments: true,
      canApprove: false,
      canGenerateReports: true,
      canAccessSettings: false,
    },
  },
  hod: {
    pages: [
      'dashboard',
      'achievements',
      'course-files',
      'strategic-plan',
      'research-innovation',
      'publications',
      'sponsored-research',
      'ranking',
      'incubations',
      'industry-connects',
      'consultancy-projects',
      'international-interactions',
      'centre-excellence',
      'infrastructure-facilities',
      'placements-internships',
      'department-details',
    ],
    features: {
      canEdit: true,
      canDelete: true,
      canUpload: true,
      canManageUsers: false,
      canViewAllDepartments: false,
      canApprove: true,
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
      'research-innovation',
      'publications',
      'sponsored-research',
      'ranking',
      'incubations',
      'industry-connects',
      'consultancy-projects',
      'international-interactions',
      'centre-excellence',
      'infrastructure-facilities',
      'placements-internships',
      'department-details',
    ],
    features: {
      canEdit: true,
      canDelete: true,
      canUpload: true,
      canManageUsers: false,
      canViewAllDepartments: false,
      canApprove: true,
      canGenerateReports: true,
      canAccessSettings: false,
    },
  },
  faculty: {
    pages: [
      'dashboard',
      'achievements',
      'course-files',
      'research-innovation',
      'publications',
      'sponsored-research',
      'ranking',
      'incubations',
      'industry-connects',
      'consultancy-projects',
      'international-interactions',
      'infrastructure-facilities',
      'placements-internships',
      'department-details',
    ],
    features: {
      canEdit: true, // Conditionally allowed for own draft/reopened submissions
      canDelete: false,
      canUpload: true,
      canManageUsers: false,
      canViewAllDepartments: false,
      canApprove: false,
      canGenerateReports: false,
      canAccessSettings: false,
    },
  },
};

export function hasPageAccess(role: UserRole, page: string): boolean {
  if (!ROLE_PERMISSIONS[role]) return false;
  // Check if page is a department tracking page
  if (page.startsWith('strategic-plan-')) {
    return ROLE_PERMISSIONS[role].pages.includes('strategic-plan');
  }
  
  return ROLE_PERMISSIONS[role].pages.includes(page);
}

export function hasFeatureAccess(role: UserRole, feature: keyof typeof ROLE_PERMISSIONS.admin.features): boolean {
  if (!ROLE_PERMISSIONS[role]) return false;
  return ROLE_PERMISSIONS[role].features[feature];
}

export function getRoleDisplayName(role: UserRole): string {
  if (role === 'admin') return 'System Administrator';
  if (role === 'authority') return 'Institutional Authority';
  if (role === 'hod') return 'Head of Department';
  if (role === 'coordinator') return 'Department Coordinator';
  return role.charAt(0).toUpperCase() + role.slice(1);
}