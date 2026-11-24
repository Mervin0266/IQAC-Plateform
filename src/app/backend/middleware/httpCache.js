'use strict';

/**
 * HTTP Caching, ETag & Multi-Layer Response Cache Middleware — CHRIST IQAC Platform
 *
 * Implements:
 * 1. Cryptographic ETag calculation (weak ETag W/"<hash>") for idempotent GET responses.
 * 2. If-None-Match header comparison -> short-circuits with 304 Not Modified (zero payload transfer).
 * 3. Context-sensitive Cache-Control headers:
 *    - Master Data (/api/campuses, /api/schools, etc.): public, max-age=300
 *    - Analytics Summaries (/api/system/dashboard-stats): private, max-age=60
 *    - Sensitive/Mutating Requests: no-store, private
 * 4. Vary: Accept-Encoding, Authorization to prevent CDN/browser cache pollution.
 * 5. In-memory scope-isolated backend cache store with pattern-based invalidation.
 */

const crypto = require('crypto');

// In-Memory Backend Shared Cache Layer
class BackendCacheManager {
  constructor() {
    this.store = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value;
  }

  set(key, value, ttlMs = 60000) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now()
    });
  }

  del(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  invalidatePattern(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  getMetrics() {
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(1) + '%'
        : '0.0%'
    };
  }
}

const backendCache = new BackendCacheManager();

/**
 * Express middleware for ETag generation and 304 Not Modified short-circuiting.
 */
function httpEtagMiddleware(req, res, next) {
  // Only evaluate GET and HEAD operations
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  const originalSend = res.send;

  res.send = function (body) {
    // Only calculate ETag for successful 200 OK responses with a valid body
    if (res.statusCode === 200 && body) {
      const content = typeof body === 'string' ? body : (Buffer.isBuffer(body) ? body : JSON.stringify(body));
      const hash = crypto.createHash('md5').update(content).digest('hex');
      const etag = `W/"${hash}"`;

      res.setHeader('ETag', etag);
      res.setHeader('Vary', 'Accept-Encoding, Authorization');

      // Check If-None-Match header sent by browser/client
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag && (clientEtag === etag || clientEtag === hash || clientEtag === `"${hash}"`)) {
        res.status(304);
        return res.end();
      }
    }

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Middleware configuring context-aware Cache-Control headers based on route sensitivity.
 */
function cacheControlMiddleware(req, res, next) {
  const url = req.originalUrl || req.url || '';

  // 1. Institutional Master Data: Campuses, Schools, Departments, Courses, Program Levels
  if (url.startsWith('/api/campuses') || url.startsWith('/api/schools') ||
      url.startsWith('/api/departments') || url.startsWith('/api/program-levels') ||
      url.startsWith('/api/courses') || url.startsWith('/api/hierarchy')) {
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  }
  // 2. Dashboard Live Stats & Hierarchy Counters
  else if (url.startsWith('/api/system/dashboard-stats') || url.startsWith('/api/hierarchy/stats')) {
    res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=30');
  }
  // 3. User, Auth, Reports, and Admin Routes: strictly private, no-store
  else {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }

  next();
}

module.exports = {
  backendCache,
  httpEtagMiddleware,
  cacheControlMiddleware
};
