'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/professionalDevelopmentsController');
const { auth } = require('../middleware/auth');

router.get('/stats', auth, controller.getProfessionalDevelopmentStats);
router.post('/bulk/validate', auth, controller.validateBulkProfessionalDevelopments);
router.post('/bulk/import', auth, controller.bulkImportProfessionalDevelopments);

router.get('/', auth, controller.getProfessionalDevelopments);
router.post('/', auth, controller.createProfessionalDevelopment);
router.put('/:id', auth, controller.updateProfessionalDevelopment);
router.delete('/clear-all', auth, controller.clearAllProfessionalDevelopments);
router.delete('/:id', auth, controller.deleteProfessionalDevelopment);

module.exports = router;
