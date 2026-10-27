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
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    
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

    // 6. Attach user and enforced department scope to request
    req.user = user;
    req.enforcedDepartment = (user.role === 'admin' || user.role === 'authority') ? null : user.department;
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
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    next();
  };
};

const checkDepartment = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  // Admins and Institutional Authorities have university-wide oversight
  if (req.user.role === 'admin' || req.user.role === 'authority') {
    return next();
  }

  const userDept = req.user.department;
  if (!userDept || userDept.trim() === '' || userDept === 'All') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: User account is not assigned to a valid department.'
    });
  }

  const reqDept = req.query.department || req.body.department;

  if (reqDept && reqDept !== 'all' && reqDept !== 'All') {
    // Normalise department strings for comparison (remove spaces/dashes/special chars)
    const normUserDept = userDept.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normReqDept = reqDept.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (normUserDept !== normReqDept) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You can only access records from your own department (${userDept}).`
      });
    }
  }

  // Bind the validated department
  req.enforcedDepartment = userDept;
  next();
};

module.exports = { auth, protect: auth, authorize, checkDepartment };

