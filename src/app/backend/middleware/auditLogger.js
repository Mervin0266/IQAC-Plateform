const { AuditLog } = require('../models');

/**
 * Standardized audit logger for institutional operations.
 * Supports both destructured options object and legacy positional arguments.
 */
const logAction = async (...args) => {
  let recordId = null;
  let achievementTitle = null;
  let title = null;
  let user = null;
  let action = 'UNKNOWN_ACTION';
  let previousValue = null;
  let updatedValue = null;
  let remarks = null;
  let ipAddress = null;

  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    const opts = args[0];
    recordId = opts.recordId || null;
    achievementTitle = opts.achievementTitle || null;
    title = opts.title || null;
    user = opts.user || null;
    action = opts.action || 'UNKNOWN_ACTION';
    previousValue = opts.previousValue || null;
    updatedValue = opts.updatedValue || null;
    remarks = opts.remarks || opts.details || null;
    ipAddress = opts.ipAddress || null;
  } else if (args.length > 1) {
    // Legacy positional arguments: (userIdOrUser, action, titleOrResource, remarksOrDiff, ipAddress)
    const firstArg = args[0];
    if (typeof firstArg === 'object' && firstArg !== null) {
      user = firstArg;
    } else {
      user = { name: String(firstArg), role: 'system', department: null };
    }
    action = args[1] || 'UNKNOWN_ACTION';
    title = args[2] || null;
    remarks = typeof args[3] === 'string' ? args[3] : JSON.stringify(args[3] || '');
    ipAddress = args[4] || null;
  }

  const userName = (user && user.name) || (typeof user === 'string' ? user : 'System');
  const userRole = (user && user.role) || 'system';
  const department = (user && user.department) || null;

  try {
    const entry = await AuditLog.create({
      recordId,
      achievementTitle: title || achievementTitle || null,
      userName,
      userRole,
      department,
      action,
      previousValue,
      updatedValue,
      ipAddress,
      remarks
    });
    return entry;
  } catch (error) {
    console.error('✗ Audit logging failed:', error.message);
    throw error;
  }
};

/**
 * Safe, best-effort audit logger that logs errors to stderr without re-throwing.
 */
const logActionSafe = async (...args) => {
  try {
    return await logAction(...args);
  } catch (err) {
    return null;
  }
};

module.exports = { logAction, logActionSafe };

