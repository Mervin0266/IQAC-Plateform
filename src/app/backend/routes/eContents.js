'use strict';

const express = require('express');
const router = express.Router();
const eContentsController = require('../controllers/eContentsController');
const { auth } = require('../middleware/auth');

// Options & Stats
router.get('/dropdown-options', auth, eContentsController.getDropdownOptions);
router.get('/stats', auth, eContentsController.getEContentStats);

// Bulk operations
router.post('/bulk/validate', auth, eContentsController.validateBulkEContents);
router.post('/bulk/import', auth, eContentsController.bulkImportEContents);

// CRUD operations
router.get('/', auth, eContentsController.getEContents);
router.get('/:id', auth, eContentsController.getEContentById);
router.post('/', auth, eContentsController.createEContent);
router.put('/:id', auth, eContentsController.updateEContent);
router.delete('/:id', auth, eContentsController.deleteEContent);

module.exports = router;
