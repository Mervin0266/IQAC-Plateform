const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Resolves and strictly validates the JWT expiration duration.
 * Standard institutional policy: 1h (60 minutes).
 * 
 * Guards:
 * - Missing, null, undefined, or empty string -> strictly '1h'
 * - Malformed format (e.g. 'unlimited', 'never', non-time string) -> strictly '1h'
 * - In production mode (NODE_ENV === 'production'):
 *   Prevents silent escalation beyond the 1h security threshold. If configured > 3600s,
 *   logs a security warning and clamps to '1h'.
 */
const resolveJwtExpiry = () => {
  const raw = process.env.JWT_EXPIRE;
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return '1h';
  }
  const clean = raw.trim();
  const timeRegex = /^(\d+)([smhdwy]?)$/i;
  const match = clean.match(timeRegex);
  if (!match) {
    console.warn(`[SECURITY WARNING] Malformed JWT_EXPIRE "${raw}". Falling back to canonical policy "1h".`);
    return '1h';
  }

  const value = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();

  let seconds = value;
  if (unit === 'm') seconds *= 60;
  else if (unit === 'h') seconds *= 3600;
  else if (unit === 'd') seconds *= 86400;
  else if (unit === 'w') seconds *= 604800;
  else if (unit === 'y') seconds *= 31536000;

  if (process.env.NODE_ENV === 'production') {
    if (seconds > 3600) {
      console.warn(`[SECURITY POLICY] Configured JWT_EXPIRE "${raw}" (${seconds}s) exceeds institutional 1-hour policy in production. Clamping to "1h".`);
      return '1h';
    }
  }

  return clean;
};

// Generate JWT Token with tokenVersion claim for reliable session invalidation
const generateToken = (user) => {
  const tokenVersion = user.tokenVersion !== undefined && user.tokenVersion !== null ? user.tokenVersion : 0;
  return jwt.sign(
    {
      id: user.id,
      tokenVersion
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: resolveJwtExpiry()
    }
  );
};

// Password Complexity Validator (NIST-aligned: minimum 10 characters, mixed case, number, symbol or 16+ char passphrase)
const isStrongPassword = (pwd) => {
  if (!pwd || typeof pwd !== 'string') return false;
  if (pwd.length >= 16) return true; // Long passphrases permitted
  if (pwd.length < 10) return false;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSpecial = /[@$!%*?&#^_\-]/.test(pwd);
  return hasUpper && hasLower && hasDigit && hasSpecial;
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        errorCode: 'ACCOUNT_DEACTIVATED',
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate token with tokenVersion
    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          employeeId: user.employeeId,
          mustChangePassword: !!user.mustChangePassword
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be identical to current password'
      });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 10 characters with uppercase, lowercase, digit, and special character, or a passphrase of at least 16 characters.'
      });
    }

    const user = await User.findByPk(req.user.id);

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password, increment tokenVersion (revoking prior sessions), clear mustChangePassword
    user.password = newPassword;
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Generate fresh token with updated tokenVersion
    const freshToken = generateToken(user);

    res.json({
      success: true,
      message: 'Password updated successfully.',
      token: freshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        mustChangePassword: false
      }
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Export helper utilities for automated security test verification
exports.resolveJwtExpiry = resolveJwtExpiry;
exports.generateToken = generateToken;


