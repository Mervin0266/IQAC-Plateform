const path = require('path');

/**
 * File Security & Upload Hardening — CHRIST (Deemed to be University) IQAC Platform
 *
 * Enforces:
 * - Strict MIME-type pinning and extension verification.
 * - Path traversal mitigation (null bytes, directory climbing `../`).
 * - Configurable size bounds to prevent resource exhaustion.
 */

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const EXTENSION_MIME_MAP = {
  '.pdf': ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.doc': ['application/msword'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.xls': ['application/vnd.ms-excel'],
  '.csv': ['text/csv', 'text/plain', 'application/vnd.ms-excel'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp']
};

const DEFAULT_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Sanitizes an uploaded filename to prevent directory traversal and execution vulnerabilities.
 */
function sanitizeFilename(originalName) {
  if (!originalName || typeof originalName !== 'string') {
    return `upload_${Date.now()}`;
  }

  // 1. Remove null bytes and control chars
  let cleaned = originalName.replace(/[\x00-\x1f\x7f]/g, '');

  // 2. Extract base name without leading path or directory components
  cleaned = path.basename(cleaned);

  // 3. Remove dangerous sequences like ../ or ..\
  cleaned = cleaned.replace(/\.\./g, '');

  // 4. Normalize whitespace and special characters
  cleaned = cleaned.replace(/[^a-zA-Z0-9._-]/g, '_');

  // 5. Ensure non-empty
  if (!cleaned || cleaned === '.' || cleaned.startsWith('.')) {
    cleaned = `file_${Date.now()}${path.extname(originalName) || '.dat'}`;
  }

  return cleaned;
}

/**
 * Validates file properties against security policies.
 */
function validateUploadedFile(file, options = {}) {
  const maxSize = options.maxSizeBytes || DEFAULT_MAX_SIZE_BYTES;
  const allowedMimes = options.allowedMimes || ALLOWED_MIME_TYPES;

  if (!file) {
    return { valid: false, error: 'No file was provided for upload.' };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File size exceeds the maximum limit of ${maxMb} MB.` };
  }

  // Check MIME type
  const mimeType = (file.mimetype || '').toLowerCase();
  if (!allowedMimes.has(mimeType)) {
    return { valid: false, error: `File type '${mimeType}' is not permitted for institutional uploads.` };
  }

  // Check extension against claimed MIME type
  const ext = path.extname(file.originalname || '').toLowerCase();
  const validMimesForExt = EXTENSION_MIME_MAP[ext];
  if (validMimesForExt && !validMimesForExt.includes(mimeType)) {
    return {
      valid: false,
      error: `File extension '${ext}' does not match uploaded file content type '${mimeType}'.`
    };
  }

  return { valid: true, sanitizedName: sanitizeFilename(file.originalname) };
}

module.exports = {
  ALLOWED_MIME_TYPES,
  DEFAULT_MAX_SIZE_BYTES,
  sanitizeFilename,
  validateUploadedFile
};
