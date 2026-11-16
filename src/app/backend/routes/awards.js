'use strict';

const express = require('express');
const router = express.Router();
const awardsController = require('../controllers/awardsController');
const { auth } = require('../middleware/auth');

// Options & Faculty directory
router.get('/agency-types', auth, awardsController.getAgencyTypeOptions);
router.get('/faculty-search', auth, awardsController.searchFacultyDirectory);
router.get('/stats', auth, awardsController.getAwardStats);

// Bulk operations
router.post('/bulk/validate', auth, awardsController.validateBulkAwards);
router.post('/bulk/import', auth, awardsController.bulkImportAwards);

// CRUD operations
router.get('/', auth, awardsController.getAwards);
router.get('/:id', auth, awardsController.getAwardById);
router.post('/', auth, awardsController.createAward);
router.put('/:id', auth, awardsController.updateAward);
router.delete('/:id', auth, awardsController.deleteAward);

module.exports = router;
