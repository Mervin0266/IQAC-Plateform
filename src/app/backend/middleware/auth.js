const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    // 1. Extract Bearer token from header
    const authHeader = (typeof req.header === 'function' ? req.header('Authorization') : null) ||
      (req.headers && (req.headers.authorization || req.headers.Authorization));
    let token;

    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // 2. Verify token with algorithm pinning
    const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test_secret' : undefined);
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    
    // 3. Retrieve user from database
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        errorCode: 'ACCOUNT_DEACTIVATED',
        message: 'Your account has been deactivated.'
      });
    }

    // 4. Token Version & Session Revocation Verification (Missing claim explicitly rejected)
    const currentTokenVersion = user.tokenVersion !== undefined && user.tokenVersion !== null ? user.tokenVersion : 0;
    if (decoded.tokenVersion === undefined || decoded.tokenVersion === null || decoded.tokenVersion !== currentTokenVersion) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_REVOKED',
        errorCode: 'TOKEN_REVOKED',
        message: 'Session has been invalidated or expired due to credential rotation. Please log in again.'
      });
    }

    // 5. Mandatory First-Login Password Change Enforcement
    if (user.mustChangePassword) {
      const currentPath = req.path || req.url || '';
      const isAllowed = 
        (req.baseUrl === '/api/auth' && req.path === '/password' && req.method === 'PUT') ||
        (req.baseUrl === '/api/auth' && req.path === '/me' && req.method === 'GET') ||
        (req.originalUrl === '/api/auth/password' && req.method === 'PUT') ||
        (req.originalUrl === '/api/auth/me' && req.method === 'GET') ||
        (currentPath.includes('/password') && req.method === 'PUT') ||
        (currentPath.includes('/me') && req.method === 'GET');

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          code: 'PASSWORD_CHANGE_REQUIRED',
          errorCode: 'PASSWORD_CHANGE_REQUIRED',
          message: 'Security Policy: You must change your temporary password before accessing the platform.'
        });
      }
    }

    // 6. Attach user, dynamic RBAC context, and enforced scope to request
    req.user = user;
    try {
      const { resolveUserAuthorizationContext } = require('../services/configPropagationService');
      const authCtx = await resolveUserAuthorizationContext(user);
      if (authCtx) {
        req.user.isSystemAdmin = authCtx.isSystemAdmin;
        req.user.effectivePermissions = authCtx.effectivePermissions;
        req.user.assignedScopes = authCtx.scopes;
        req.user.roleRecord = authCtx.roleRecord;
      } else {
        req.user.isSystemAdmin = user.role === 'admin' || user.role === 'system_admin';
      }
    } catch (ctxErr) {
      // Safe fallback for isolated unit tests
      req.user.isSystemAdmin = user.role === 'admin' || user.role === 'system_admin';
      req.user.assignedScopes = [];
    }

    const hasUniversityScope = req.user.isSystemAdmin ||
      user.role === 'admin' ||
      user.role === 'authority' ||
      user.role === 'iqac_admin' ||
      (Array.isArray(req.user.assignedScopes) && req.user.assignedScopes.some(s => s.scopeType === 'university'));

    req.enforcedDepartment = hasUniversityScope ? null : user.department;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        errorCode: 'TOKEN_EXPIRED',
        message: 'Token expired.'
      });
    }
    console.error('Authentication middleware error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    const userRole = req.user.role;
    const isPermitted = roles.includes(userRole) ||
      (req.user.isSystemAdmin && roles.includes('admin')) ||
      (userRole === 'iqac_admin' && roles.includes('admin'));

    if (!isPermitted) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    next();
  };
};

/**
 * Strict authorization gate for System Administration V2.0 routes.
 * Accessible EXCLUSIVELY to authenticated System Administrators.
 */
const requireSystemAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }
  if (!req.user.isSystemAdmin) {
    return res.status(403).json({
      success: false,
      code: 'SYSTEM_ADMIN_REQUIRED',
      message: 'Access denied. System Administrator privileges are required for this operation.'
    });
  }
  next();
};

/**
 * Granular module permission evaluator (Role + User Overrides).
 */
const requireModulePermission = (moduleKey, permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (req.user.isSystemAdmin) return next();

    const perms = req.user.effectivePermissions;
    if (perms && perms[moduleKey] && perms[moduleKey][permission] === true) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Missing '${permission}' permission on module '${moduleKey}'.`
    });
  };
};

const checkDepartment = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const scopes = Array.isArray(req.user.assignedScopes) ? req.user.assignedScopes : [];
  const hasUnivScope = req.user.isSystemAdmin ||
    req.user.role === 'admin' ||
    req.user.role === 'authority' ||
    req.user.role === 'iqac_admin' ||
    scopes.some(s => s.scopeType === 'university');

  // Admins, IQAC Admins, and Institutional Authorities with university scope have oversight
  if (hasUnivScope) {
    return next();
  }

  // Collect all authorized departments from user.department + assigned multi-org scopes
  const allowedDepts = new Set();
  if (req.user.department && req.user.department.trim() !== '' && req.user.department !== 'All') {
    allowedDepts.add(req.user.department.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }
  scopes.forEach(s => {
    if (s.departmentName) {
      allowedDepts.add(s.departmentName.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  });

  if (allowedDepts.size === 0 && scopes.length === 0) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: User account is not assigned to a valid department or organizational scope.'
    });
  }

  const reqDept = (req.query && req.query.department) || (req.body && req.body.department);

  if (reqDept && reqDept !== 'all' && reqDept !== 'All') {
    const normReqDept = reqDept.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!allowedDepts.has(normReqDept)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You can only access records from your assigned department(s).`
      });
    }
  }

  req.enforcedDepartment = req.user.department;
  next();
};

module.exports = {
  auth,
  protect: auth,
  authorize,
  requireSystemAdmin,
  requireModulePermission,
  checkDepartment
};

