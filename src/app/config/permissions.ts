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
      'system-admin',
      'research-innovation',
      'copyrights',
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
      'copyrights',
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
      'copyrights',
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
      'copyrights',
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
      'copyrights',
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

export function hasPageAccess(role: UserRole | string, page: string, isSystemAdmin?: boolean): boolean {
  if (!role) return true;

  // System Administration V2.0 is exclusively accessible to System Administrators
  if (page === 'system-admin' || page.startsWith('system-admin-')) {
    return Boolean(isSystemAdmin || String(role).toLowerCase() === 'admin' || String(role).toLowerCase() === 'system_admin');
  }

  // Normalize role string to handle capitalization or alternate names
  const roleStr = String(role).toLowerCase();
  const targetRole: keyof typeof ROLE_PERMISSIONS = ROLE_PERMISSIONS[roleStr as keyof typeof ROLE_PERMISSIONS]
    ? (roleStr as keyof typeof ROLE_PERMISSIONS)
    : (roleStr === 'admin' || roleStr === 'system_admin' || roleStr === 'iqac_admin') ? 'admin'
    : roleStr.includes('authority') || roleStr.includes('dean') ? 'authority'
    : roleStr.includes('hod') || roleStr.includes('head') ? 'hod'
    : roleStr.includes('coord') ? 'coordinator'
    : 'faculty';

  const permissions = ROLE_PERMISSIONS[targetRole];
  if (!permissions) return true;

  // Admin and Institutional Authority have universal view access to operational pages
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
  const key = String(role).toLowerCase() === 'iqac_admin' ? 'admin' : (role as keyof typeof ROLE_PERMISSIONS);
  if (!ROLE_PERMISSIONS[key]) return false;
  return ROLE_PERMISSIONS[key].features[feature];
}

export function getRoleDisplayName(role: UserRole): string {
  if (role === 'admin' || role === 'system_admin') return 'System Administrator';
  if (role === 'iqac_admin') return 'IQAC Administrator';
  if (role === 'authority') return 'Institutional Authority';
  if (role === 'hod') return 'Head of Department';
  if (role === 'coordinator') return 'Department Coordinator';
  return String(role).charAt(0).toUpperCase() + String(role).slice(1);
}