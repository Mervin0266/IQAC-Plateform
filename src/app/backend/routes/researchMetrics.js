const express = require('express');
const router = express.Router();
const {
  getMetrics,
  bulkUpsertMetrics
} = require('../controllers/researchMetricController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.route('/')
  .get(getMetrics);

router.route('/bulk')
  .post(authorize('admin', 'coordinator', 'hod'), bulkUpsertMetrics);

module.exports = router;
