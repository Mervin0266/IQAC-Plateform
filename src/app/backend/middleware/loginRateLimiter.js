'use strict';

const rateLimit = require('express-rate-limit');
const { logActionSafe } = require('./auditLogger');

/**
 * Dedicated Authentication Rate Limiter (VULN-P1-07 Remediation)
 * CHRIST University IQAC Platform
 * 
 * Protects POST /api/auth/login against credential stuffing and brute force.
 * 
 * Security Architecture:
 * - Window: 15 minutes (configurable via LOGIN_RATE_LIMIT_WINDOW_MS)
 * - Threshold: 5 failed attempts per window (configurable via LOGIN_RATE_LIMIT_MAX_ATTEMPTS)
 * - Keying: Composite key combining client IP and normalized email address.
 *   Prevents university NAT/shared Wi-Fi IP from locking out all campus users,
 *   while strictly preventing brute-forcing of any individual account.
 * - skipSuccessfulRequests: true (successful logins do not consume failure quota).
 * - Generic error response preventing username enumeration.
 * - Forensic audit logging of rate-limit violations without recording passwords.
 */

const windowMs = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10) || (15 * 60 * 1000);
const maxAttempts = parseInt(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS, 10) || 5;

const loginRateLimiter = rateLimit({
  windowMs,
  limit: maxAttempts,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  keyGenerator: (req) => {
    // Normalize email to prevent casing bypasses
    const rawEmail = (req.body && req.body.email) ? String(req.body.email).trim().toLowerCase() : 'anonymous';
    // Use validated req.ip (Express trust proxy must be configured for reverse proxy topology)
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    return `login:${ip}:${rawEmail}`;
  },
  handler: async (req, res, next, options) => {
    const rawEmail = (req.body && req.body.email) ? String(req.body.email).trim().toLowerCase() : 'unknown';
    const clientIp = req.ip || 'unknown';

    try {
      await logActionSafe({
        user: { name: 'Authentication Rate Limiter', role: 'system', department: 'Cybersecurity' },
        action: 'LOGIN_RATE_LIMIT_EXCEEDED',
        title: 'Login Rate Limit Exceeded',
        remarks: `Too many failed login attempts for account '${rawEmail}' from IP ${clientIp}. Request throttled.`,
        ipAddress: clientIp
      });
    } catch (e) {
      // Non-blocking logging failure
    }

    return res.status(options.statusCode || 429).json({
      success: false,
      code: 'AUTH_RATE_LIMITED',
      message: 'Too many failed login attempts. Please try again after 15 minutes.'
    });
  }
});

module.exports = {
  loginRateLimiter
};
