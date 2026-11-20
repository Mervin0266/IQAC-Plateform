const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { auth, authorize } = require('../middleware/auth');

// @route   POST /api/system/clear-database
// @desc    Clear all database tables and seed data
// @access  Private (Admin)
router.post('/clear-database', auth, authorize('admin'), systemController.clearDatabase);

// @route   GET /api/system/dashboard-stats
// @desc    Get real-time dynamic dashboard statistics
// @access  Private
router.get('/dashboard-stats', auth, systemController.getDashboardStats);

// @route   GET /api/system/runtime-config
// @desc    Get centralized runtime configuration for authenticated user
// @access  Private
router.get('/runtime-config', auth, systemController.getRuntimeConfig);

// @route   GET /api/system/exchange-rate
// @desc    Get effective USD to INR exchange rate
// @access  Private
router.get('/exchange-rate', auth, systemController.getExchangeRate);

// @route   POST /api/system/exchange-rate/override
// @desc    Set manual administrator override for exchange rate
// @access  Private (Admin)
router.post('/exchange-rate/override', auth, authorize('admin'), systemController.overrideExchangeRate);

// @route   POST /api/system/exchange-rate/reset
// @desc    Reset manual override to automated reference exchange rate
// @access  Private (Admin)
router.post('/exchange-rate/reset', auth, authorize('admin'), systemController.resetExchangeRate);

module.exports = router;
