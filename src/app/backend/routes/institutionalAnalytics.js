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
  exportReport,
  getIprAnalytics,
  getIprDrilldown
} = require('../controllers/institutionalAnalyticsController');

// All endpoints require authentication
router.use(auth);

// Dashboard live analytics
router.get('/dashboard', getDashboardAnalytics);

// IPR (Patents & Copyrights) Analytics & Drill-Down
router.get('/ipr', getIprAnalytics);
router.get('/ipr/drilldown', getIprDrilldown);

// Report configuration metadata
router.get('/report-config', getReportConfig);

// Interactive preview
router.post('/preview', previewReport);

// Export (Excel, PDF, Word)
router.post('/export', exportReport);

module.exports = router;
