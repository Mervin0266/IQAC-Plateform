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

module.exports = router;
