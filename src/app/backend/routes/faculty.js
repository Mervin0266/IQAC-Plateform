const express = require('express');
const router = express.Router();
const {
  getFaculty,
  getFacultyStats,
  createFaculty,
  bulkCreateFaculty,
  updateFaculty,
  deleteFaculty,
  clearAllFaculty
} = require('../controllers/facultyController');
const { auth, authorize } = require('../middleware/auth');
const { requireModuleEnabled, validateFormSubmission } = require('../middleware/configEnforcement');

router.use(auth);

router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('faculty-details'), clearAllFaculty);
router.get('/stats', getFacultyStats);

router.route('/')
  .get(getFaculty)
  .post(authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('faculty-details'), validateFormSubmission('faculty-profile-form', true), createFaculty);

router.route('/bulk')
  .post(authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('faculty-details'), bulkCreateFaculty);

router.route('/:id')
  .put(authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('faculty-details'), validateFormSubmission('faculty-profile-form', false), updateFaculty)
  .delete(authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('faculty-details'), deleteFaculty);

module.exports = router;
