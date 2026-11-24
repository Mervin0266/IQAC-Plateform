'use strict';

/**
 * Storage Controller — CHRIST (Deemed to be University) IQAC Platform
 * Handles private file download authentication, signed URL validation, and streaming.
 */

const path = require('path');
const fs = require('fs');
const { verifyDownloadToken } = require('../services/fileStorageService');
const { logAction } = require('../middleware/auditLogger');

/**
 * GET /api/storage/download/:token
 * Serves a private document using a cryptographically signed one-time token.
 */
exports.downloadPrivateFile = async (req, res) => {
  try {
    const { token } = req.params;
    const verification = verifyDownloadToken(token);

    if (!verification.valid) {
      return res.status(403).json({
        success: false,
        message: verification.error || 'Unauthorized file access.'
      });
    }

    const filePath = verification.storagePath;
    const fileName = path.basename(filePath).replace(/^[0-9a-f-]+_/, '');

    // Audit log the file download
    logAction({
      action: 'FILE_DOWNLOADED',
      module: 'Storage',
      affectedRecordId: fileName,
      title: `Private file downloaded: ${fileName}`,
      user: req.user,
      details: { fileName, ip: req.ip }
    }).catch(() => {});

    // Stream the file with secure headers
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    console.error('[StorageController] Download error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to stream document.'
    });
  }
};
