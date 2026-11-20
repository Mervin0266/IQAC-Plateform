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
  getIprDrilldown,
  getFacultyDirectory,
  builderPreview,
  builderExport,
  getSavedConfigs,
  saveConfig,
  deleteSavedConfig,
  getReportHistory,
  deleteReportHistory,
  getMetricCatalog,
  queryAnalytics,
  compareAnalytics,
  getGovernanceData,
  getCustomDashboards,
  createCustomDashboard,
  updateCustomDashboard,
  deleteCustomDashboard,
  createCustomMetric,
  deleteCustomMetric
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

// Interactive preview (legacy)
router.post('/preview', previewReport);

// Export (legacy Excel, PDF, Word)
router.post('/export', exportReport);

// Institutional Report Builder API Endpoints
router.get('/faculty-directory', getFacultyDirectory);
router.post('/builder-preview', builderPreview);
router.post('/builder-export', builderExport);
router.get('/saved-configs', getSavedConfigs);
router.post('/saved-configs', saveConfig);
router.delete('/saved-configs/:id', deleteSavedConfig);
router.get('/history', getReportHistory);
router.delete('/history/:id', deleteReportHistory);

// Dynamic Institutional Analytics Engine Endpoints
router.get('/metric-catalog', getMetricCatalog);
router.post('/query', queryAnalytics);
router.post('/compare', compareAnalytics);
router.get('/governance', getGovernanceData);

// Custom Dashboards CRUD
router.get('/custom-dashboards', getCustomDashboards);
router.post('/custom-dashboards', createCustomDashboard);
router.put('/custom-dashboards/:id', updateCustomDashboard);
router.delete('/custom-dashboards/:id', deleteCustomDashboard);

// Custom Metrics CRUD
router.post('/custom-metrics', createCustomMetric);
router.delete('/custom-metrics/:id', deleteCustomMetric);

module.exports = router;
