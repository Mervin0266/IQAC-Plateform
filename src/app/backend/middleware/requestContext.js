const crypto = require('crypto');

/**
 * Request Context Middleware — CHRIST (Deemed to be University) IQAC Platform
 * 
 * - Injects a unique request correlation ID (X-Request-ID) into every incoming request.
 * - Mirrors the correlation ID on the HTTP response headers.
 * - Tracks request start timestamp for performance auditing.
 * - Attaches correlation ID to req.id for downstream controller and audit logger consumption.
 */
function requestContextMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  const correlationId = incomingId && typeof incomingId === 'string' && incomingId.trim() !== ''
    ? incomingId.trim()
    : (crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  req.id = correlationId;
  req.correlationId = correlationId;
  req.startTime = Date.now();

  res.setHeader('X-Request-ID', correlationId);

  next();
}

module.exports = requestContextMiddleware;
