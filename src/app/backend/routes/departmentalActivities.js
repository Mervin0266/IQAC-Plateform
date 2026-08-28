const express = require('express');
const router = express.Router();
const {
  getActivities,
  getMatrixSummary,
  createActivity,
  updateActivity,
  deleteActivity,
  bulkUploadActivities,
  clearAllActivities,
} = require('../controllers/departmentalActivityController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.route('/')
  .get(getActivities)
  .post(authorize('admin', 'coordinator', 'hod'), createActivity);

router.get('/matrix', getMatrixSummary);

router.route('/bulk')
  .post(authorize('admin', 'coordinator', 'hod'), bulkUploadActivities);

router.route('/clear-all')
  .delete(authorize('admin', 'coordinator', 'hod'), clearAllActivities);

router.route('/:id')
  .put(authorize('admin', 'coordinator', 'hod'), updateActivity)
  .delete(authorize('admin', 'coordinator', 'hod'), deleteActivity);

module.exports = router;
