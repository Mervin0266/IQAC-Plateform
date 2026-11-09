'use strict';

/**
 * Institutional Analytics & Complete Report Routes
 * CHRIST (Deemed to be University) — IQAC Platform
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getDashboardAnalytics,
  getReportConfig,
  previewReport,
  exportReport
} = require('../controllers/institutionalAnalyticsController');

// All endpoints require authentication
router.use(auth);

// Dashboard live analytics
router.get('/dashboard', getDashboardAnalytics);

// Report configuration metadata
router.get('/report-config', getReportConfig);

// Interactive preview
router.post('/preview', previewReport);

// Export (Excel, PDF, Word)
router.post('/export', exportReport);

module.exports = router;
