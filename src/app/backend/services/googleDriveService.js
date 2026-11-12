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
  const hasServiceAccount = Boolean(
    (process.env.GOOGLE_DRIVE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL) &&
    (process.env.GOOGLE_DRIVE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY)
  );
  const hasUserOAuth = Boolean(
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN &&
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_CLIENT_SECRET
  );
  return hasServiceAccount || hasUserOAuth;
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
 * Obtain an OAuth2 Bearer token from Google.
 * Supports:
 *   1. User OAuth2 Refresh Token (for personal @gmail.com accounts; files are owned by the user with full 15GB quota)
 *   2. Service Account JWT assertion (for Google Workspace Shared Drives in university production)
 */
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiresAt > now + 300) {
    return cachedToken;
  }

  // 1. User OAuth2 Refresh Token mode (for personal accounts)
  const refreshToken = (process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '').trim();
  const clientId = (process.env.GOOGLE_DRIVE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_DRIVE_CLIENT_SECRET || '').trim();

  if (refreshToken && clientId && clientSecret) {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      throw new Error(`Failed to refresh Google Drive user token: ${tokenRes.status} ${errorBody}`);
    }

    const tokenData = await tokenRes.json();
    cachedToken = tokenData.access_token;
    tokenExpiresAt = now + (tokenData.expires_in || 3600);
    return cachedToken;
  }

  // 2. Service Account JWT mode (for Workspace Shared Drives)
  const clientEmail = (process.env.GOOGLE_DRIVE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || '').trim();
  let privateKey = (process.env.GOOGLE_DRIVE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '').trim();

  if (!clientEmail || !privateKey) {
    throw new Error('Google Drive credentials are not configured. Set GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY (or GOOGLE_DRIVE_REFRESH_TOKEN, GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET) in .env.');
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
  console.log(`[GoogleDrive Debug] 1. Ensuring folder hierarchy for Patent ID: ${patentId}, Dept: ${department}, Year: ${year}`);
  const hierarchy = await ensurePatentFolderHierarchy({
    year,
    department,
    patentId
  });

  const parentFolderId = hierarchy.patentFolderId;
  const safeFileName = sanitizeName(fileName);
  console.log(`[GoogleDrive Debug] 2. Target patent folder confirmed: ${parentFolderId}`);
  console.log(`[GoogleDrive Debug] 3. Sending file '${safeFileName}' (${fileBuffer.length} bytes, type: ${mimeType || 'octet-stream'}) to Google Drive...`);

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
    console.error(`\n[GoogleDrive ERROR] File upload failed! HTTP Status: ${uploadRes.status}`);
    console.error(`[GoogleDrive ERROR] Raw response from Google: ${errorText}`);

    if (errorText.includes('storageQuotaExceeded') || errorText.includes('Service Accounts do not have storage quota')) {
      console.error('────────────────────────────────────────────────────────────────────────');
      console.error('⚠️ [DIAGNOSIS]: GOOGLE DRIVE 0-BYTE SERVICE ACCOUNT QUOTA LIMIT');
      console.error('Reason: The target folder is located in a personal or user "My Drive".');
      console.error('Google allocates 0 bytes of storage quota to Service Accounts in "My Drive".');
      console.error('Solution A: Move the root folder to an official Google Workspace "Shared Drive".');
      console.error('Solution B: Use Method B (upload directly to Drive and paste the link).');
      console.error('────────────────────────────────────────────────────────────────────────\n');
      throw new Error(`Google Drive Quota Error: Service Accounts have 0MB personal storage in user "My Drive". Move folder to a Google Workspace "Shared Drive" or use Method B (Drive Links). Full Google error: ${errorText}`);
    }

    throw new Error(`Google Drive file upload failed (${uploadRes.status}): ${errorText}`);
  }

  const fileData = await uploadRes.json();
  const driveUrl = fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`;
  console.log(`[GoogleDrive Debug] 4. File upload SUCCESS! File ID: ${fileData.id}, URL: ${driveUrl}`);

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

/**
 * Ensure folder hierarchy exists for a Sponsored Research Project.
 * Hierarchy: Sponsored Research / <Sanction Year or 'Pending Sanction Year'> / <Department> / PROJECT-<Project-ID> / <Category>
 */
async function ensureSponsoredFolderHierarchy({ sanctionYear, department, projectId, category }) {
  if (!isDriveConfigured()) {
    throw new Error('Google Drive integration is not configured. Missing credentials in backend environment.');
  }

  const rootParentId = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '').trim() || null;

  // 1. Root folder: Sponsored Research
  const sponsoredRootFolderId = await findOrCreateFolder('Sponsored Research', rootParentId);

  // 2. Sanction Year folder (e.g. "2024", "2025") or "Pending Sanction Year"
  const yearFolderName = sanctionYear && String(sanctionYear).trim() ? String(sanctionYear).trim() : 'Pending Sanction Year';
  const yearFolderId = await findOrCreateFolder(yearFolderName, sponsoredRootFolderId);

  // 3. Department folder
  const deptFolderName = sanitizeName(department || 'General');
  const deptFolderId = await findOrCreateFolder(deptFolderName, yearFolderId);

  // 4. Project ID folder
  const projectFolderName = `PROJECT-${projectId}`;
  const projectFolderId = await findOrCreateFolder(projectFolderName, deptFolderId);

  // 5. Category folder (Agreement Letter or Payment Receipt)
  let categoryFolderId = projectFolderId;
  if (category) {
    const categoryFolderName = category === 'payment_receipt' ? 'Payment Receipt' : 'Agreement Letter';
    categoryFolderId = await findOrCreateFolder(categoryFolderName, projectFolderId);
  }

  return {
    sponsoredRootFolderId,
    yearFolderId,
    deptFolderId,
    projectFolderId,
    categoryFolderId
  };
}

/**
 * Move a sponsored project folder to a new hierarchy when its Sanction Year or Department changes.
 */
async function relocateSponsoredProjectFolder({ currentProjectFolderId, newSanctionYear, department, projectId }) {
  if (!isDriveConfigured() || !currentProjectFolderId) return null;

  try {
    const targetHierarchy = await ensureSponsoredFolderHierarchy({
      sanctionYear: newSanctionYear,
      department,
      projectId
    });

    const targetDeptFolderId = targetHierarchy.deptFolderId;

    const fileRes = await driveRequest(`/files/${currentProjectFolderId}?fields=parents&supportsAllDrives=true`);
    if (!fileRes.ok) return null;

    const fileData = await fileRes.json();
    const oldParents = (fileData.parents || []).join(',');

    if (fileData.parents && fileData.parents.includes(targetDeptFolderId)) {
      return targetHierarchy.projectFolderId;
    }

    const patchParams = new URLSearchParams({
      addParents: targetDeptFolderId,
      removeParents: oldParents,
      supportsAllDrives: 'true'
    });

    const moveRes = await driveRequest(`/files/${currentProjectFolderId}?${patchParams.toString()}`, {
      method: 'PATCH'
    });

    if (moveRes.ok) {
      console.log(`[GoogleDrive] Relocated sponsored project folder ${currentProjectFolderId} to Sanction Year: ${newSanctionYear || 'Pending Sanction Year'}, Dept: ${department}`);
      return currentProjectFolderId;
    }
  } catch (err) {
    console.warn('[GoogleDrive] Failed to relocate sponsored project folder (non-fatal):', err.message);
  }

  return currentProjectFolderId;
}

/**
 * Upload a document file directly into the project's category Google Drive folder.
 */
async function uploadSponsoredDocumentFile({ projectId, department, sanctionYear, category, fileBuffer, fileName, mimeType }) {
  if (!isDriveConfigured()) {
    throw new Error('Google Drive integration is not configured. Direct uploads cannot be saved to institutional storage.');
  }

  const hierarchy = await ensureSponsoredFolderHierarchy({
    sanctionYear,
    department,
    projectId,
    category
  });

  const parentFolderId = hierarchy.categoryFolderId;
  const safeFileName = sanitizeName(fileName);

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
    throw new Error(`Google Drive upload failed with HTTP ${uploadRes.status}: ${errorText}`);
  }

  const uploadedFile = await uploadRes.json();
  const driveUrl = uploadedFile.webViewLink || `https://drive.google.com/file/d/${uploadedFile.id}/view`;

  return {
    driveFileId: uploadedFile.id,
    driveFolderId: parentFolderId,
    driveUrl,
    fileName: uploadedFile.name || safeFileName,
    mimeType: uploadedFile.mimeType || mimeType,
    fileSize: uploadedFile.size ? parseInt(uploadedFile.size, 10) : fileBuffer.length
  };
}

/**
 * Delete a document file from Google Drive.
 */
async function deleteSponsoredDocumentFile(driveFileId) {
  if (!isDriveConfigured() || !driveFileId) return false;
  try {
    const res = await driveRequest(`/files/${driveFileId}?supportsAllDrives=true`, {
      method: 'DELETE'
    });
    return res.ok || res.status === 404;
  } catch (err) {
    console.warn(`[GoogleDrive] Could not delete sponsored file ${driveFileId}:`, err.message);
    return false;
  }
}

/**
 * Ensure folder hierarchy exists for a Consultancy Project.
 * Hierarchy:
 * CHRIST University — IQAC Shared Drive /
 * └── Consultancy Projects /
 *     ├── <Consultancy Start Year or 'Pending Start Year'> /
 *     │   └── <Department> /
 *     │       └── PROJECT-<Project-ID> /
 *     │           └── <Agreement - Work Order | Invoice | Payment Receipt>
 */
async function ensureConsultancyFolderHierarchy({ startYear, department, projectId, category }) {
  if (!isDriveConfigured()) {
    throw new Error('Google Drive integration is not configured. Missing credentials in backend environment.');
  }

  const rootParentId = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '').trim() || null;

  // 1. Root folder: Consultancy Projects
  const consultancyRootFolderId = await findOrCreateFolder('Consultancy Projects', rootParentId);

  // 2. Start Year folder (e.g. "2024", "2025") or "Pending Start Year"
  const yearFolderName = startYear && String(startYear).trim() ? String(startYear).trim() : 'Pending Start Year';
  const yearFolderId = await findOrCreateFolder(yearFolderName, consultancyRootFolderId);

  // 3. Department folder
  const deptFolderName = sanitizeName(department || 'General');
  const deptFolderId = await findOrCreateFolder(deptFolderName, yearFolderId);

  // 4. Project ID folder
  const projectFolderName = `PROJECT-${projectId}`;
  const projectFolderId = await findOrCreateFolder(projectFolderName, deptFolderId);

  // 5. Category folder (Agreement - Work Order, Invoice, or Payment Receipt)
  let categoryFolderId = projectFolderId;
  if (category) {
    let categoryFolderName = 'Agreement - Work Order';
    if (category === 'invoice') {
      categoryFolderName = 'Invoice';
    } else if (category === 'payment_receipt') {
      categoryFolderName = 'Payment Receipt';
    }
    categoryFolderId = await findOrCreateFolder(categoryFolderName, projectFolderId);
  }

  return {
    consultancyRootFolderId,
    yearFolderId,
    deptFolderId,
    projectFolderId,
    categoryFolderId
  };
}

/**
 * Upload a document file directly into the consultancy project's category Google Drive folder.
 */
async function uploadConsultancyDocumentFile({ projectId, department, startYear, category, fileBuffer, fileName, mimeType }) {
  if (!isDriveConfigured()) {
    throw new Error('Google Drive integration is not configured. Direct uploads cannot be saved to institutional storage.');
  }

  const hierarchy = await ensureConsultancyFolderHierarchy({
    startYear,
    department,
    projectId,
    category
  });

  const parentFolderId = hierarchy.categoryFolderId;
  const safeFileName = sanitizeName(fileName);

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

  const token = await getAccessToken();
  const uploadParams = new URLSearchParams({
    uploadType: 'multipart',
    supportsAllDrives: 'true'
  });

  const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files?${uploadParams.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(multipartBody.length)
    },
    body: multipartBody
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Failed to upload consultancy document to Google Drive: ${uploadRes.status} ${errText}`);
  }

  const fileData = await uploadRes.json();
  const fileId = fileData.id;

  // Make readable by anyone with link if personal/service account permissions allow
  try {
    await driveRequest(`/files/${fileId}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (permErr) {
    console.warn('[GoogleDrive] Note: Could not set public permission on consultancy file:', permErr.message);
  }

  const webViewLink = `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

  return {
    driveFileId: fileId,
    driveFolderId: parentFolderId,
    driveUrl: webViewLink,
    fileName: safeFileName
  };
}

/**
 * Delete a consultancy file from Google Drive if needed.
 */
async function deleteConsultancyDocumentFile(driveFileId) {
  if (!isDriveConfigured() || !driveFileId) return false;

  try {
    const res = await driveRequest(`/files/${driveFileId}?supportsAllDrives=true`, {
      method: 'DELETE'
    });
    return res.ok || res.status === 404;
  } catch (err) {
    console.warn(`[GoogleDrive] Could not delete consultancy file ${driveFileId}:`, err.message);
    return false;
  }
}

/**
 * Ensures folder hierarchy for Placements & Internships Offer Letters.
 */
async function ensurePlacementFolderHierarchy({ batch, department }) {
  const rootId = await getSharedDriveRootId();
  const placementsRootFolderId = await findOrCreateFolder('Placements & Internships', rootId);
  const yearFolderId = await findOrCreateFolder(sanitizeName(batch || 'General'), placementsRootFolderId);
  const deptFolderId = await findOrCreateFolder(sanitizeName(department || 'General'), yearFolderId);

  return {
    placementsRootFolderId,
    yearFolderId,
    deptFolderId
  };
}

/**
 * Upload an offer letter document file directly into Google Drive.
 */
async function uploadPlacementOfferLetterFile({ placementId, department, batch, fileBuffer, fileName, mimeType }) {
  if (!isDriveConfigured()) {
    throw new Error('Google Drive integration is not configured. Direct uploads cannot be saved to institutional storage.');
  }

  const hierarchy = await ensurePlacementFolderHierarchy({
    batch,
    department
  });

  const parentFolderId = hierarchy.deptFolderId;
  const safeFileName = sanitizeName(fileName);

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

  const token = await getAccessToken();
  const uploadParams = new URLSearchParams({
    uploadType: 'multipart',
    supportsAllDrives: 'true'
  });

  const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files?${uploadParams.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(multipartBody.length)
    },
    body: multipartBody
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Google Drive API upload failed (${uploadRes.status}): ${errText}`);
  }

  const uploadData = await uploadRes.json();
  const fileId = uploadData.id;

  try {
    await driveRequest(`/files/${fileId}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (permErr) {
    console.warn('[GoogleDrive] Note: Could not set public permission on offer letter file:', permErr.message);
  }

  const webViewLink = `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

  return {
    driveFileId: fileId,
    driveFolderId: parentFolderId,
    driveUrl: webViewLink,
    fileName: safeFileName
  };
}

/**
 * Ensure Google Drive folder hierarchy for Copyrights:
 * Root -> IPRs -> Copyrights -> <Year> -> <Department>
 */
async function ensureCopyrightFolderHierarchy({ year, department }) {
  if (!isDriveConfigured()) {
    throw new Error('Google Drive integration is not configured.');
  }
  const rootParentId = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '').trim() || null;
  const iprFolderId = await findOrCreateFolder('IPRs', rootParentId);
  const copyrightsFolderId = await findOrCreateFolder('Copyrights', iprFolderId);
  const yearFolderId = await findOrCreateFolder(sanitizeName(year || 'General'), copyrightsFolderId);
  const deptFolderId = await findOrCreateFolder(sanitizeName(department || 'General'), yearFolderId);
  return { iprFolderId, copyrightsFolderId, yearFolderId, deptFolderId };
}

/**
 * Upload a Copyright Proof file directly to Google Drive.
 */
async function uploadCopyrightProofFile({ year, department, fileBuffer, fileName, mimeType }) {
  if (!isDriveConfigured()) {
    throw new Error('Google Drive integration is not configured.');
  }
  const hierarchy = await ensureCopyrightFolderHierarchy({ year, department });
  const parentFolderId = hierarchy.deptFolderId;
  const safeFileName = sanitizeName(fileName);
  const boundary = `-------copyright_${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  const metadata = { name: safeFileName, parents: [parentFolderId] };
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

  const token = await getAccessToken();
  const uploadParams = new URLSearchParams({ uploadType: 'multipart', supportsAllDrives: 'true' });
  const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files?${uploadParams.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(multipartBody.length)
    },
    body: multipartBody
  });
  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Google Drive API upload failed (${uploadRes.status}): ${errText}`);
  }
  const uploadData = await uploadRes.json();
  const fileId = uploadData.id;
  try {
    await driveRequest(`/files/${fileId}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });
  } catch (_) {}

  return {
    driveFileId: fileId,
    driveFolderId: parentFolderId,
    driveUrl: `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`,
    fileName: safeFileName
  };
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
  ensureCopyrightFolderHierarchy,
  uploadCopyrightProofFile,
  verifyDriveLinkAccess,
  ensureSponsoredFolderHierarchy,
  relocateSponsoredProjectFolder,
  uploadSponsoredDocumentFile,
  deleteSponsoredDocumentFile,
  ensureConsultancyFolderHierarchy,
  uploadConsultancyDocumentFile,
  deleteConsultancyDocumentFile,
  ensurePlacementFolderHierarchy,
  uploadPlacementOfferLetterFile
};
