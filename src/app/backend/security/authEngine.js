/**
 * Centralized Authorization Engine — CHRIST (Deemed to be University) IQAC Platform
 *
 * Enforces:
 * 1. Role-based Access Control (RBAC)
 * 2. Granular Module Permissions
 * 3. Campus, School, and Department Data Scopes
 * 4. System Administrator Authorization Gates
 */

const ROLE_PERMISSIONS = {
  admin: {
    canEdit: true,
    canDelete: true,
    canUpload: true,
    canManageUsers: true,
    canViewAllDepartments: true,
    canApprove: true,
    canGenerateReports: true,
    canAccessSettings: true
  },
  authority: {
    canEdit: false,
    canDelete: false,
    canUpload: false,
    canManageUsers: false,
    canViewAllDepartments: true,
    canApprove: false,
    canGenerateReports: true,
    canAccessSettings: false
  },
  hod: {
    canEdit: true,
    canDelete: true,
    canUpload: true,
    canManageUsers: false,
    canViewAllDepartments: false,
    canApprove: true,
    canGenerateReports: true,
    canAccessSettings: false
  },
  coordinator: {
    canEdit: true,
    canDelete: false,
    canUpload: true,
    canManageUsers: false,
    canViewAllDepartments: false,
    canApprove: false,
    canGenerateReports: true,
    canAccessSettings: false
  },
  faculty: {
    canEdit: true,
    canDelete: false,
    canUpload: true,
    canManageUsers: false,
    canViewAllDepartments: false,
    canApprove: false,
    canGenerateReports: false,
    canAccessSettings: false
  }
};

/**
 * Checks if actor possesses the required role.
 */
function hasRole(actor, ...roles) {
  if (!actor || !actor.role) return false;
  const userRole = String(actor.role).toLowerCase();
  
  // System administrators satisfy 'admin' role checks
  if ((actor.isSystemAdmin || userRole === 'admin' || userRole === 'system_admin') && roles.includes('admin')) {
    return true;
  }
  return roles.map(r => r.toLowerCase()).includes(userRole);
}

/**
 * Verifies if actor is an authorized System Administrator.
 */
function validateAdminAuthority(actor) {
  if (!actor) return false;
  return Boolean(
    actor.isSystemAdmin ||
    String(actor.role).toLowerCase() === 'admin' ||
    String(actor.role).toLowerCase() === 'system_admin'
  );
}

/**
 * Retrieves effective permissions for actor, taking into account role defaults and dynamic overrides.
 */
function getEffectivePermissions(actor) {
  if (!actor) return {};
  if (validateAdminAuthority(actor)) {
    return ROLE_PERMISSIONS.admin;
  }
  const roleKey = String(actor.role).toLowerCase();
  const base = ROLE_PERMISSIONS[roleKey] || ROLE_PERMISSIONS.faculty;
  
  if (actor.effectivePermissions && typeof actor.effectivePermissions === 'object') {
    return { ...base, ...actor.effectivePermissions };
  }
  return base;
}

/**
 * Checks if actor has permission for a specific module action.
 */
function hasPermission(actor, moduleKey, action) {
  if (!actor) return false;
  if (validateAdminAuthority(actor)) return true;

  if (actor.effectivePermissions && actor.effectivePermissions[moduleKey]) {
    const perm = actor.effectivePermissions[moduleKey];
    if (perm[action] !== undefined) return Boolean(perm[action]);
  }

  const roleKey = String(actor.role).toLowerCase();
  const base = ROLE_PERMISSIONS[roleKey] || ROLE_PERMISSIONS.faculty;

  const actionMap = {
    read: true,
    view: true,
    create: base.canUpload,
    upload: base.canUpload,
    update: base.canEdit,
    edit: base.canEdit,
    delete: base.canDelete,
    approve: base.canApprove,
    manage: base.canManageUsers,
    export: base.canGenerateReports
  };

  return actionMap[action] !== undefined ? actionMap[action] : false;
}

/**
 * Verifies whether actor has university-wide scope.
 */
function isUniversityScoped(actor) {
  if (!actor) return false;
  if (validateAdminAuthority(actor)) return true;

  const role = String(actor.role).toLowerCase();
  if (role === 'admin' || role === 'authority' || role === 'iqac_admin') {
    return true;
  }

  if (Array.isArray(actor.assignedScopes)) {
    return actor.assignedScopes.some(s => s.scopeType === 'university');
  }

  return false;
}

/**
 * Checks if a specific department is accessible by actor.
 */
function isDepartmentAllowed(actor, targetDepartment) {
  if (!actor) return false;
  if (isUniversityScoped(actor)) return true;
  if (!targetDepartment || targetDepartment === 'All' || targetDepartment === 'all') {
    return false;
  }

  const normTarget = targetDepartment.toLowerCase().replace(/[^a-z0-9]/g, '');
  const allowed = new Set();

  if (actor.department && actor.department.trim() !== '' && actor.department !== 'All') {
    allowed.add(actor.department.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }

  if (Array.isArray(actor.assignedScopes)) {
    actor.assignedScopes.forEach(s => {
      if (s.departmentName) {
        allowed.add(s.departmentName.toLowerCase().replace(/[^a-z0-9]/g, ''));
      }
    });
  }

  return allowed.has(normTarget);
}

/**
 * Authorizes a requested data scope against actor credentials.
 */
function authorizeDataScope(actor, requestedScope = {}) {
  if (!actor) {
    return { authorized: false, reason: 'Unauthenticated actor' };
  }

  if (isUniversityScoped(actor)) {
    return { authorized: true, enforcedDepartment: null };
  }

  if (requestedScope.department && requestedScope.department !== 'All') {
    if (!isDepartmentAllowed(actor, requestedScope.department)) {
      return {
        authorized: false,
        reason: `Access restricted. You cannot access department '${requestedScope.department}'.`
      };
    }
  }

  return {
    authorized: true,
    enforcedDepartment: actor.department || null
  };
}

module.exports = {
  ROLE_PERMISSIONS,
  hasRole,
  validateAdminAuthority,
  getEffectivePermissions,
  hasPermission,
  isUniversityScoped,
  isDepartmentAllowed,
  authorizeDataScope
};
