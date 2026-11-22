const { AuditLog } = require('../models');

const SENSITIVE_KEY_REGEX = /password|token|secret|authorization|cookie|privatekey|apikey/i;

function redactSecrets(val) {
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) return val.map(redactSecrets);
  if (typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      if (SENSITIVE_KEY_REGEX.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSecrets(v);
      }
    }
    return out;
  }
  return val;
}

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
  let adminUserId = null;
  let adminIdentity = null;
  let moduleName = null;
  let entity = null;
  let affectedRecordId = null;
  let reason = null;
  let result = 'Success';
  let correlationId = null;

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
    ipAddress = opts.ipAddress || (opts.req && (opts.req.ip || (typeof opts.req.header === 'function' ? opts.req.header('x-forwarded-for') : null))) || null;
    adminUserId = opts.adminUserId || (opts.user && opts.user.id) || (opts.req && opts.req.user && opts.req.user.id) || null;
    adminIdentity = opts.adminIdentity || (opts.user && (opts.user.email || opts.user.name)) || (opts.req && opts.req.user && (opts.req.user.email || opts.req.user.name)) || null;
    moduleName = opts.module || null;
    entity = opts.entity || null;
    affectedRecordId = opts.affectedRecordId || (opts.recordId ? String(opts.recordId) : null);
    reason = opts.reason || null;
    result = opts.result || 'Success';
    correlationId = opts.correlationId || (opts.req && (opts.req.id || opts.req.correlationId)) || null;
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
    adminUserId = (user && user.id) || null;
    adminIdentity = (user && (user.email || user.name)) || null;
  }

  const userName = (user && user.name) || (typeof user === 'string' ? user : 'System');
  const userRole = (user && user.role) || 'system';
  const department = (user && user.department) || null;

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const safeAdminUserId = (adminUserId && UUID_REGEX.test(String(adminUserId))) ? String(adminUserId) : null;
  if (adminUserId && !safeAdminUserId && !adminIdentity) {
    adminIdentity = String(adminUserId);
  }

  try {
    const entry = await AuditLog.create({
      recordId,
      achievementTitle: title || achievementTitle || null,
      userName,
      userRole,
      department,
      action,
      previousValue: redactSecrets(previousValue),
      updatedValue: redactSecrets(updatedValue),
      ipAddress,
      remarks,
      adminUserId: safeAdminUserId,
      adminIdentity,
      module: moduleName,
      entity,
      affectedRecordId,
      reason,
      result,
      correlationId
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

module.exports = { logAction, logActionSafe, redactSecrets };

