'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/invitedTalksController');
const { auth } = require('../middleware/auth');

router.get('/stats', auth, controller.getInvitedTalkStats);
router.post('/bulk/validate', auth, controller.validateBulkInvitedTalks);
router.post('/bulk/import', auth, controller.bulkImportInvitedTalks);

router.get('/', auth, controller.getInvitedTalks);
router.post('/', auth, controller.createInvitedTalk);
router.put('/:id', auth, controller.updateInvitedTalk);
router.delete('/clear-all', auth, controller.clearAllInvitedTalks);
router.delete('/:id', auth, controller.deleteInvitedTalk);

module.exports = router;
