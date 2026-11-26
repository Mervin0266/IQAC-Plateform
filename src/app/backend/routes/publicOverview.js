'use strict';

const express = require('express');
const router = express.Router();
const { getPublicOverview } = require('../controllers/publicOverviewController');
const { getPublicResearchAnalytics } = require('../controllers/publicResearchAnalyticsController');

// Public read-only endpoints — zero auth requirement, zero sensitive PII
router.get('/overview', getPublicOverview);
router.get('/research-analytics', getPublicResearchAnalytics);

module.exports = router;
