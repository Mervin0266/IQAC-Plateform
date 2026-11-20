'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/periodicalsController');
const { auth } = require('../middleware/auth');

router.get('/stats', auth, controller.getPeriodicalStats);
router.post('/bulk/validate', auth, controller.validateBulkPeriodicals);
router.post('/bulk/import', auth, controller.bulkImportPeriodicals);

router.get('/', auth, controller.getPeriodicals);
router.post('/', auth, controller.createPeriodical);
router.put('/:id', auth, controller.updatePeriodical);
router.delete('/clear-all', auth, controller.clearAllPeriodicals);
router.delete('/:id', auth, controller.deletePeriodical);

module.exports = router;
