'use strict';

const express = require('express');
const router = express.Router();
const { getPublicOverview } = require('../controllers/publicOverviewController');

// Public read-only endpoint — zero auth requirement, zero sensitive PII
router.get('/overview', getPublicOverview);

module.exports = router;
