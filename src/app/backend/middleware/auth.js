const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
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

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated.'
      });
    }

    // Attach user to request
    req.user = user;
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
        message: 'Token expired.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    next();
  };
};

const checkDepartment = (req, res, next) => {
  // Admins and Institutional Authorities have bypass access
  if (req.user.role === 'admin' || req.user.role === 'authority') {
    return next();
  }

  const userDept = req.user.department;
  const reqDept = req.query.department || req.body.department;

  if (reqDept && reqDept !== 'all') {
    // Normalise department strings for comparison (remove spaces/dashes)
    const normUserDept = userDept.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normReqDept = reqDept.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (normUserDept !== normReqDept) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access records from your own department.'
      });
    }
  }
  next();
};

module.exports = { auth, protect: auth, authorize, checkDepartment };
