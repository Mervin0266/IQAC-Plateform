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
      'departmental-activities',
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
      'research-metrics',
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
      'academics',
      'faculty-details',
      'student-details',
      'achievements',
      'ranking',
      'naac-accreditation',
      'nba-tracking',
      'research-innovation',
      'publications',
      'sponsored-research',
      'research-metrics',
      'incubations',
      'industry-connects',
      'consultancy-projects',
      'international-interactions',
      'centre-excellence',
      'infrastructure-facilities',
      'placements-internships',
      'department-details',
      'departmental-activities',
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
      'academics',
      'faculty-details',
      'student-details',
      'achievements',
      'course-files',
      'strategic-plan',
      'research-innovation',
      'publications',
      'sponsored-research',
      'research-metrics',
      'ranking',
      'incubations',
      'industry-connects',
      'consultancy-projects',
      'international-interactions',
      'centre-excellence',
      'infrastructure-facilities',
      'placements-internships',
      'department-details',
      'departmental-activities',
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
      'academics',
      'faculty-details',
      'student-details',
      'achievements',
      'course-files',
      'strategic-plan',
      'research-innovation',
      'publications',
      'sponsored-research',
      'research-metrics',
      'ranking',
      'incubations',
      'industry-connects',
      'consultancy-projects',
      'international-interactions',
      'centre-excellence',
      'infrastructure-facilities',
      'placements-internships',
      'department-details',
      'departmental-activities',
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
      'academics',
      'faculty-details',
      'student-details',
      'achievements',
      'course-files',
      'research-innovation',
      'publications',
      'sponsored-research',
      'research-metrics',
      'ranking',
      'incubations',
      'industry-connects',
      'consultancy-projects',
      'international-interactions',
      'infrastructure-facilities',
      'placements-internships',
      'department-details',
      'departmental-activities',
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

export function hasPageAccess(role: UserRole | string, page: string): boolean {
  if (!role) return true;
  
  // Normalize role string to handle capitalization or alternate names
  const roleStr = String(role).toLowerCase();
  const targetRole: UserRole = ROLE_PERMISSIONS[roleStr as UserRole] 
    ? (roleStr as UserRole)
    : roleStr.includes('admin') ? 'admin'
    : roleStr.includes('authority') || roleStr.includes('dean') ? 'authority'
    : roleStr.includes('hod') || roleStr.includes('head') ? 'hod'
    : roleStr.includes('coord') ? 'coordinator'
    : 'faculty';

  const permissions = ROLE_PERMISSIONS[targetRole];
  if (!permissions) return true;

  // Admin and Institutional Authority have universal view access to all pages
  if (targetRole === 'admin' || targetRole === 'authority') {
    return true;
  }

  // Check grouped page access for strategic plans
  if (page.startsWith('strategic-plan-')) {
    return permissions.pages.includes('strategic-plan');
  }

  // Allow ranking submenu access for roles that can access the main ranking section
  const rankingSubPages = [
    'nirf-ranking',
    'india-today-ranking',
    'the-world-ranking',
    'qs-india-ranking',
  ];
  if (rankingSubPages.includes(page)) {
    return permissions.pages.includes('ranking');
  }
  
  return permissions.pages.includes(page);
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