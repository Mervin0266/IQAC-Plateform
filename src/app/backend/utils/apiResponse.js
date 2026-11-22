/**
 * Standardized API Response Utilities — CHRIST (Deemed to be University) IQAC Platform
 *
 * Guarantees consistent response structures across all endpoints:
 * Success: { success: true, data: ..., message?: ..., ...meta }
 * Error:   { success: false, message: ..., code?: ..., errorCode?: ..., details?: ... }
 */

function apiSuccess(res, data = null, message = null, meta = {}) {
  const response = {
    success: true,
    ...(data !== null && data !== undefined && { data }),
    ...(message && { message }),
    ...meta
  };
  return res.status(200).json(response);
}

function apiCreated(res, data = null, message = 'Resource created successfully') {
  return res.status(201).json({
    success: true,
    ...(data !== null && data !== undefined && { data }),
    message
  });
}

function apiPaginated(res, data = [], page = 1, limit = 10, total = 0, message = null) {
  const totalPages = Math.ceil(total / limit) || 1;
  return res.status(200).json({
    success: true,
    data,
    total,
    count: data.length,
    currentPage: parseInt(page, 10),
    totalPages,
    limit: parseInt(limit, 10),
    ...(message && { message })
  });
}

function apiError(res, message = 'Internal Server Error', status = 500, code = null, details = null) {
  const isProd = process.env.NODE_ENV === 'production';
  const safeMessage = (isProd && status === 500)
    ? 'An internal server error occurred. Please contact the system administrator.'
    : message;

  return res.status(status).json({
    success: false,
    message: safeMessage,
    ...(code && { code, errorCode: code }),
    ...(!isProd && details && { details })
  });
}

module.exports = {
  apiSuccess,
  apiCreated,
  apiPaginated,
  apiError
};
