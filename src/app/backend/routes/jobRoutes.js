'use strict';

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  enqueueReportJob,
  getJobStatus,
  listJobs,
  cancelJob
} = require('../controllers/jobController');

// All job routes require an authenticated user session
router.use(auth);

router.post('/report-export', enqueueReportJob);
router.get('/', listJobs);
router.get('/:id', getJobStatus);
router.post('/:id/cancel', cancelJob);

module.exports = router;
