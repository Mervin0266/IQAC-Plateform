const express = require('express');
const router = express.Router();
const {
  getMetrics,
  bulkUpsertMetrics,
  clearAllMetrics
} = require('../controllers/researchMetricController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllMetrics);

router.route('/')
  .get(getMetrics);

router.route('/bulk')
  .post(authorize('admin', 'coordinator', 'hod'), bulkUpsertMetrics);

module.exports = router;
