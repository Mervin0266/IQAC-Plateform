'use strict';

/**
 * Data Sanitizer & Sensitive Field Protection Utility
 * Enforces field-level confidentiality per Phase A5 and VULN-P0-03 remediation.
 */

// Statutory / sensitive personal fields in Student records
const SENSITIVE_STUDENT_FIELDS = [
  'caste',
  'handicappedDescription',
  'disability',
  'parentMobileNo',
  'guardianPhone'
];

/**
 * Strips or masks sensitive student fields based on the caller's role.
 * - Admin, Authority, HOD: Full record access for official/statutory compliance.
 * - Coordinator, Faculty, Unauthenticated: Sensitive personal fields stripped.
 *
 * @param {Object|Array} data - Student object or array of student objects
 * @param {Object} user - Authenticated user from req.user
 * @returns {Object|Array} Sanitized student data
 */
exports.sanitizeStudentData = (data, user) => {
  if (!data) return data;

  const isPrivileged = user && (user.role === 'admin' || user.role === 'authority' || user.role === 'hod');
  if (isPrivileged) {
    return data;
  }

  const sanitizeSingle = (record) => {
    const raw = typeof record.toJSON === 'function' ? record.toJSON() : { ...record };
    for (const field of SENSITIVE_STUDENT_FIELDS) {
      delete raw[field];
    }
    return raw;
  };

  if (Array.isArray(data)) {
    return data.map(sanitizeSingle);
  }
  return sanitizeSingle(data);
};

/**
 * Strips PAN Card Number and confidential personal attributes from Faculty records.
 * Per Phase A5: Never expose PAN in ordinary faculty list responses, including administrative list endpoints.
 *
 * @param {Object|Array} data - Faculty object or array of faculty objects
 * @param {Object} user - Authenticated user from req.user
 * @param {Boolean} allowPanForAdmin - Only true when viewing an explicit individual profile by Admin
 * @returns {Object|Array} Sanitized faculty data
 */
exports.sanitizeFacultyData = (data, user, allowPanForAdmin = false) => {
  if (!data) return data;

  const canViewPan = allowPanForAdmin && user && user.role === 'admin';

  const sanitizeSingle = (record) => {
    const raw = typeof record.toJSON === 'function' ? record.toJSON() : { ...record };
    if (!canViewPan) {
      delete raw.panCardNo;
    }
    return raw;
  };

  if (Array.isArray(data)) {
    return data.map(sanitizeSingle);
  }
  return sanitizeSingle(data);
};
