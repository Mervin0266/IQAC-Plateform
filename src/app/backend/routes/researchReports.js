'use strict';

/**
 * Research & Innovation Reports Routes
 * CHRIST University IQAC Platform
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getReportConfig,
  previewReport,
  exportReport
} = require('../controllers/researchReportController');

// All report generation endpoints require authentication
router.use(auth);

// Configuration options (periods, statuses, scopes)
router.get('/config', getReportConfig);

// Interactive preview & validation
router.post('/preview', previewReport);

// Excel and PDF file exports
router.post('/export', exportReport);

module.exports = router;

