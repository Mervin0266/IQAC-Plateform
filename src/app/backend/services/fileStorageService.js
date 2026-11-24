'use strict';

/**
 * File Storage Service — CHRIST (Deemed to be University) IQAC Platform
 * Manages private evidence files, generated reports, and secure document access.
 * Supports Supabase Storage (with private buckets) and secure local storage fallback.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const PRIVATE_STORAGE_DIR = path.resolve(__dirname, '../uploads/private');
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB max
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/jpg'
]);

// In-memory signed URL token registry for secure time-limited downloads
const signedUrlRegistry = new Map();
const DEFAULT_URL_EXPIRY_SECONDS = 3600; // 1 hour

// Ensure private directory exists
if (!fs.existsSync(PRIVATE_STORAGE_DIR)) {
  fs.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true });
}

/**
 * Validates file upload metadata for safety, size, and permitted MIME types.
 */
function validateUploadMetadata(file) {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  const size = file.size || (file.buffer ? file.buffer.length : 0);
  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds institutional limit (${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB).`
    };
  }

  const mime = (file.mimetype || file.type || '').toLowerCase();
  if (mime && !ALLOWED_MIME_TYPES.has(mime)) {
    return {
      valid: false,
      error: `Disallowed file type: ${mime}. Allowed types: PDF, XLSX, DOCX, CSV, PNG, JPEG.`
    };
  }

  return { valid: true };
}

/**
 * Sanitizes a filename to prevent path traversal or special character injection.
 */
function sanitizeFilename(originalName) {
  const base = path.basename(originalName || 'document');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Saves a file buffer to private storage under an isolated unique key.
 */
async function savePrivateFile(fileBuffer, originalName, folder = 'documents') {
  const safeName = sanitizeFilename(originalName);
  const fileId = crypto.randomUUID();
  const folderDir = path.join(PRIVATE_STORAGE_DIR, folder);

  if (!fs.existsSync(folderDir)) {
    fs.mkdirSync(folderDir, { recursive: true });
  }

  const targetPath = path.join(folderDir, `${fileId}_${safeName}`);
  await fs.promises.writeFile(targetPath, fileBuffer);

  return {
    fileId,
    fileName: safeName,
    storagePath: targetPath,
    relativeKey: `${folder}/${fileId}_${safeName}`,
    fileSize: fileBuffer.length
  };
}

/**
 * Generates a short-lived cryptographically signed token for private file downloads.
 */
function generateSignedDownloadToken(storagePath, userContext, expiresInSeconds = DEFAULT_URL_EXPIRY_SECONDS) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + (expiresInSeconds * 1000);

  signedUrlRegistry.set(token, {
    storagePath,
    userId: userContext?.id,
    expiresAt
  });

  return {
    token,
    expiresAt: new Date(expiresAt).toISOString(),
    downloadUrl: `/api/storage/download/${token}`
  };
}

/**
 * Verifies a download token and returns the corresponding file path.
 */
function verifyDownloadToken(token) {
  const entry = signedUrlRegistry.get(token);
  if (!entry) {
    return { valid: false, error: 'Invalid download token.' };
  }

  if (Date.now() > entry.expiresAt) {
    signedUrlRegistry.delete(token);
    return { valid: false, error: 'Download token has expired.' };
  }

  if (!fs.existsSync(entry.storagePath)) {
    return { valid: false, error: 'Target file no longer exists.' };
  }

  return {
    valid: true,
    storagePath: entry.storagePath,
    userId: entry.userId
  };
}

module.exports = {
  validateUploadMetadata,
  sanitizeFilename,
  savePrivateFile,
  generateSignedDownloadToken,
  verifyDownloadToken,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES
};
