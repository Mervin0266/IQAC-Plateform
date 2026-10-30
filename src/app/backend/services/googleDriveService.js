'use strict';

/**
 * Google Drive Storage & Hierarchy Service for Patents & IP Proof Documents.
 * 
 * Hierarchy:
 * CHRIST University — IQAC Shared Drive /
 * └── Patents & IP /
 *     ├── <Year> / (or "Pending Grant")
 *     │   └── <Department> /
 *     │       └── <Patent-ID> /
 *     │           └── <Proof Files>
 * 
 * Supports:
 * - Google Workspace Service Account (RS256 JWT assertion)
 * - Google Shared Drives (supportsAllDrives: true, includeItemsFromAllDrives: true)
 * - Safe folder hierarchy navigation & caching
 * - Folder relocation when grant year changes or status becomes Granted
 * - URL extraction and accessibility validation for external Drive links
 */

const crypto = require('crypto');

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Check if Google Drive integration is configured in environment variables.
 */
function isDriveConfigured() {
  const email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const key = process.env.GOOGLE_DRIVE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  return Boolean(email && key);
}

/**
 * Sanitize folder/file names to prevent invalid characters in Drive.
 */
function sanitizeName(name) {
  if (!name) return 'General';
  return String(name)
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

/**
 * Extract Google Drive file ID from arbitrary Google Drive URLs.
 */
function extractDriveFileId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Pattern 1: /file/d/{id}/...
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch) return fileDMatch[1];

  // Pattern 2: id={id} query parameter
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) return idParamMatch[1];

  // Pattern 3: /folders/{id}
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  // Pattern 4: /document/d/{id}/ or /spreadsheets/d/{id}/
  const docMatch = trimmed.match(/\/(?:document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return docMatch[1];

  return null;
}

/**
 * Validate that a URL is a valid HTTPS Google Drive / Google Docs URL.
 */
function validateDriveUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) {
    return { valid: false, error: 'Google Drive URL must use secure HTTPS protocol' };
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const isGoogleHost = host === 'drive.google.com' ||
      host === 'docs.google.com' ||
      host.endsWith('.drive.google.com') ||
      host.endsWith('.docs.google.com');

    if (!isGoogleHost) {
      return { valid: false, error: 'URL host must be drive.google.com or docs.google.com' };
    }

    const fileId = extractDriveFileId(trimmed);
    if (!fileId) {
      return { valid: false, error: 'Could not extract a valid Google Drive file or document ID from URL' };
    }

    return { valid: true, fileId, sanitizedUrl: trimmed };
  } catch (err) {
    return { valid: false, error: 'Malformed URL format' };
  }
}

/**
 * Obtain an OAuth2 Bearer token from Google using Service Account JWT.
 */
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiresAt > now + 300) {
    return cachedToken;
  }

  const clientEmail = (process.env.GOOGLE_DRIVE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || '').trim();
  let privateKey = (process.env.GOOGLE_DRIVE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '').trim();

  if (!clientEmail || !privateKey) {
    throw new Error('Google Drive credentials are not configured. Set GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY on Render.');
  }

  // Handle escaped newlines in environment variable
  privateKey = privateKey.replace(/\\n/g, '\n');

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodeBase64Url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const unsignedToken = `${encodeBase64Url(header)}.${encodeBase64Url(payload)}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  const signature = signer.sign(privateKey, 'base64url');

  const jwtAssertion = `${unsignedToken}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtAssertion
    })
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text();
    throw new Error(`Failed to obtain Google Drive access token: ${tokenRes.status} ${errorBody}`);
  }

  const tokenData = await tokenRes.json();
  cachedToken = tokenData.access_token;
  tokenExpiresAt = now + (tokenData.expires_in || 3600);
  return cachedToken;
}

/**
 * Execute an authenticated Google Drive REST API v3 request.
 */
async function driveRequest(endpoint, options = {}) {
  const token = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {})
  };

  const url = endpoint.startsWith('https://')
    ? endpoint
    : `https://www.googleapis.com/drive/v3${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers
  });

  return res;
}

/**
 * Find or create a subfolder with support for Google Shared Drives.
 */
async function findOrCreateFolder(folderName, parentFolderId) {
  const sanitized = sanitizeName(folderName);
  const sharedDriveId = (process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '').trim();

  // 1. Search for existing folder under parent
  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${sanitized.replace(/'/g, "\\'")}' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const params = new URLSearchParams({
    q: query,
    fields: 'files(id, name, parents)',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    pageSize: '10'
  });

  if (sharedDriveId && !parentFolderId) {
    params.set('corpora', 'drive');
    params.set('includeItemsFromAllDrives', 'true');
    params.set('driveId', sharedDriveId);
  }

  const searchRes = await driveRequest(`/files?${params.toString()}`);
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // 2. Folder does not exist, create it
  const metadata = {
    name: sanitized,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentFolderId ? [parentFolderId] : (sharedDriveId ? [sharedDriveId] : undefined)
  };

  const createParams = new URLSearchParams({
    supportsAllDrives: 'true'
  });

  const createRes = await driveRequest(`/files?${createParams.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata)
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Drive folder '${sanitized}': ${createRes.status} ${errText}`);
  }

  const created = await createRes.json();
  return created.id;
}

/**
 * Ensure the full institutional hierarchy for a patent:
 * Root -> Patents & IP -> <Year | "Pending Grant"> -> <Department> -> <Patent ID>
 */
async function ensurePatentFolderHierarchy({ year, department, patentId }) {
  if (!isDriveConfigured()) {
    throw new Error('Google Drive integration is not configured. Missing credentials in backend environment.');
  }

  const rootParentId = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '').trim() || null;

  // 1. Root folder: Patents & IP
  const patentsAndIpFolderId = await findOrCreateFolder('Patents & IP', rootParentId);

  // 2. Year folder (e.g. "2024", "2025") or "Pending Grant"
  const yearFolderName = year && String(year).trim() ? String(year).trim() : 'Pending Grant';
  const yearFolderId = await findOrCreateFolder(yearFolderName, patentsAndIpFolderId);

  // 3. Department folder
  const deptFolderName = sanitizeName(department || 'General');
  const deptFolderId = await findOrCreateFolder(deptFolderName, yearFolderId);

  // 4. Patent ID folder
  const patentFolderName = `PATENT-${patentId}`;
  const patentFolderId = await findOrCreateFolder(patentFolderName, deptFolderId);

  return {
    patentsAndIpFolderId,
    yearFolderId,
    deptFolderId,
    patentFolderId
  };
}

/**
 * Move a patent folder to a new year hierarchy when its grant status or Year changes.
 */
async function relocatePatentFolder({ currentPatentFolderId, newYear, department, patentId }) {
  if (!isDriveConfigured() || !currentPatentFolderId) return null;

  try {
    // 1. Determine target department folder in the new year
    const targetHierarchy = await ensurePatentFolderHierarchy({
      year: newYear,
      department,
      patentId
    });

    const targetDeptFolderId = targetHierarchy.deptFolderId;

    // 2. Get current parents of the patent folder
    const fileRes = await driveRequest(`/files/${currentPatentFolderId}?fields=parents&supportsAllDrives=true`);
    if (!fileRes.ok) return null;

    const fileData = await fileRes.json();
    const oldParents = (fileData.parents || []).join(',');

    // If already in target department folder, no move needed
    if (fileData.parents && fileData.parents.includes(targetDeptFolderId)) {
      return targetHierarchy.patentFolderId;
    }

    // 3. Move folder by adding target parent and removing old parent
    const patchParams = new URLSearchParams({
      addParents: targetDeptFolderId,
      removeParents: oldParents,
      supportsAllDrives: 'true'
    });

    const moveRes = await driveRequest(`/files/${currentPatentFolderId}?${patchParams.toString()}`, {
      method: 'PATCH'
    });

    if (moveRes.ok) {
      console.log(`[GoogleDrive] Relocated patent folder ${currentPatentFolderId} to Year: ${newYear || 'Pending Grant'}, Dept: ${department}`);
      return currentPatentFolderId;
    }
  } catch (err) {
    console.warn('[GoogleDrive] Failed to relocate patent folder (non-fatal):', err.message);
  }

  return currentPatentFolderId;
}

/**
 * Upload a proof file directly into the patent's Google Drive folder.
 */
async function uploadPatentProofFile({ patentId, department, year, fileBuffer, fileName, mimeType }) {
  if (!isDriveConfigured()) {
    throw new Error('Google Drive integration is not configured. Direct uploads cannot be saved to institutional storage.');
  }

  // 1. Ensure folder hierarchy exists
  const hierarchy = await ensurePatentFolderHierarchy({
    year,
    department,
    patentId
  });

  const parentFolderId = hierarchy.patentFolderId;
  const safeFileName = sanitizeName(fileName);

  // 2. Prepare multipart upload for Google Drive API v3
  const boundary = `-------314159265358979323846_${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: safeFileName,
    parents: [parentFolderId]
  };

  const multipartBody = Buffer.concat([
    Buffer.from(
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`
    ),
    fileBuffer,
    Buffer.from(closeDelimiter)
  ]);

  const uploadParams = new URLSearchParams({
    uploadType: 'multipart',
    supportsAllDrives: 'true',
    fields: 'id, name, mimeType, webViewLink, webContentLink, size'
  });

  const uploadRes = await driveRequest(
    `https://www.googleapis.com/upload/drive/v3/files?${uploadParams.toString()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(multipartBody.length)
      },
      body: multipartBody
    }
  );

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Google Drive file upload failed (${uploadRes.status}): ${errorText}`);
  }

  const fileData = await uploadRes.json();
  const driveUrl = fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`;

  return {
    driveFileId: fileData.id,
    driveFolderId: parentFolderId,
    driveUrl,
    fileName: fileData.name,
    mimeType: fileData.mimeType,
    fileSize: parseInt(fileData.size || fileBuffer.length, 10),
    accessStatus: 'verified'
  };
}

/**
 * Delete a managed file from Google Drive.
 */
async function deletePatentProofFile(driveFileId) {
  if (!isDriveConfigured() || !driveFileId) return false;

  try {
    const res = await driveRequest(`/files/${driveFileId}?supportsAllDrives=true`, {
      method: 'DELETE'
    });
    return res.ok || res.status === 404;
  } catch (err) {
    console.warn(`[GoogleDrive] Failed to delete file ${driveFileId}:`, err.message);
    return false;
  }
}

/**
 * Verify accessibility of an existing Google Drive link using credentials when possible.
 */
async function verifyDriveLinkAccess(url) {
  const validation = validateDriveUrl(url);
  if (!validation.valid) {
    return {
      accessible: false,
      status: 'access_issue',
      remarks: validation.error
    };
  }

  if (!isDriveConfigured()) {
    // Cannot query Drive API without credentials; mark as pending verification
    return {
      accessible: true,
      status: 'pending_verification',
      fileId: validation.fileId,
      remarks: 'Google Drive credentials not configured on backend; access verified via URL structure only.'
    };
  }

  try {
    const res = await driveRequest(`/files/${validation.fileId}?fields=id,name,mimeType,size,trashed&supportsAllDrives=true`);
    if (res.ok) {
      const data = await res.json();
      if (data.trashed) {
        return {
          accessible: false,
          status: 'access_issue',
          fileId: validation.fileId,
          remarks: 'Target Google Drive file is in the trash.'
        };
      }
      return {
        accessible: true,
        status: 'verified',
        fileId: validation.fileId,
        fileName: data.name,
        mimeType: data.mimeType,
        fileSize: data.size,
        remarks: 'Verified accessible via institutional Google Drive API.'
      };
    } else if (res.status === 404) {
      return {
        accessible: false,
        status: 'access_issue',
        fileId: validation.fileId,
        remarks: 'File not found on Google Drive or sharing permissions do not grant institutional access.'
      };
    } else {
      return {
        accessible: false,
        status: 'access_issue',
        fileId: validation.fileId,
        remarks: `Google Drive returned HTTP ${res.status}.`
      };
    }
  } catch (err) {
    return {
      accessible: false,
      status: 'access_issue',
      fileId: validation.fileId,
      remarks: `Verification check error: ${err.message}`
    };
  }
}

module.exports = {
  isDriveConfigured,
  sanitizeName,
  extractDriveFileId,
  extractFileId: extractDriveFileId,
  validateDriveUrl,
  isValidDriveUrl: (url) => validateDriveUrl(url).valid,
  ensurePatentFolderHierarchy,
  relocatePatentFolder,
  uploadPatentProofFile,
  deletePatentProofFile,
  verifyDriveLinkAccess
};
