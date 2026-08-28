const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { auth, authorize } = require('../middleware/auth');

// @route   POST /api/system/clear-database
// @desc    Clear all database tables and seed data
// @access  Private (Admin)
router.post('/clear-database', auth, authorize('admin'), systemController.clearDatabase);

module.exports = router;
