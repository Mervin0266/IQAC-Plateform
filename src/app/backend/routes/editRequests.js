const express = require('express');
const router = express.Router();
const { createEditRequest, getEditRequests, updateEditRequest } = require('../controllers/editRequestController');
const { auth, authorize } = require('../middleware/auth');

router.post('/', auth, authorize('faculty'), createEditRequest);
router.get('/', auth, authorize('admin', 'authority', 'hod', 'coordinator'), getEditRequests);
router.put('/:id', auth, authorize('admin', 'hod', 'coordinator'), updateEditRequest);

module.exports = router;
