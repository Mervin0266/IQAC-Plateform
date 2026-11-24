'use strict';

/**
 * Native Response Compression Middleware — CHRIST IQAC Platform
 *
 * Implements:
 * 1. Zero-dependency HTTP payload compression using native Node.js zlib.
 * 2. Content negotiation (Gzip and Deflate).
 * 3. Threshold check (>= 1,024 bytes) to avoid CPU overhead on small responses.
 * 4. Whitelist filtering: compresses JSON, text, and CSV; skips images, zip, and PDF.
 * 5. Accurate Content-Encoding and Vary: Accept-Encoding headers.
 */

const zlib = require('zlib');

const COMPRESSION_THRESHOLD_BYTES = 1024; // 1 KB
const SKIPPED_CONTENT_TYPES = /image\/|video\/|application\/zip|application\/gzip|application\/pdf/i;

function compressionMiddleware(req, res, next) {
  const acceptEncoding = req.headers['accept-encoding'] || '';

  // If client does not accept gzip or deflate, proceed without compression
  if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) {
    return next();
  }

  const originalSend = res.send;

  res.send = function (body) {
    if (!body) {
      return originalSend.call(this, body);
    }

    const contentType = res.getHeader('Content-Type') || '';
    if (typeof contentType === 'string' && SKIPPED_CONTENT_TYPES.test(contentType)) {
      return originalSend.call(this, body);
    }

    // Convert string/object to Buffer if needed
    let buffer;
    if (Buffer.isBuffer(body)) {
      buffer = body;
    } else if (typeof body === 'string') {
      buffer = Buffer.from(body);
    } else {
      try {
        buffer = Buffer.from(JSON.stringify(body));
      } catch {
        return originalSend.call(this, body);
      }
    }

    // Check size threshold
    if (buffer.length < COMPRESSION_THRESHOLD_BYTES) {
      return originalSend.call(this, body);
    }

    res.setHeader('Vary', 'Accept-Encoding');

    // Prefer Gzip if accepted
    if (acceptEncoding.includes('gzip')) {
      try {
        const compressed = zlib.gzipSync(buffer, { level: 6 });
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Length', compressed.length);
        return originalSend.call(this, compressed);
      } catch (err) {
        console.warn('[Compression] Gzip failed, sending uncompressed:', err.message);
        return originalSend.call(this, buffer);
      }
    } else if (acceptEncoding.includes('deflate')) {
      try {
        const compressed = zlib.deflateSync(buffer, { level: 6 });
        res.setHeader('Content-Encoding', 'deflate');
        res.setHeader('Content-Length', compressed.length);
        return originalSend.call(this, compressed);
      } catch (err) {
        console.warn('[Compression] Deflate failed, sending uncompressed:', err.message);
        return originalSend.call(this, buffer);
      }
    }

    return originalSend.call(this, body);
  };

  next();
}

module.exports = {
  compressionMiddleware,
  COMPRESSION_THRESHOLD_BYTES
};
