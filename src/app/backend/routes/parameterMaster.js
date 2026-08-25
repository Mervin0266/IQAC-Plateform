const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  getFrameworks,
  createFramework,
  getParameters,
  createParameter,
  submitParameterData,
  verifySubmission
} = require('../controllers/parameterMasterController');

// All parameter master routes require authentication
router.use(auth);

// Framework Master routes
router.route('/frameworks')
  .get(getFrameworks)
  .post(authorize('admin'), createFramework);

// Accreditation Parameter routes
router.route('/parameters')
  .get(getParameters)
  .post(authorize('admin', 'hod'), createParameter);

// Departmental Metric Submissions
router.route('/submissions')
  .post(authorize('admin', 'hod', 'coordinator', 'faculty'), submitParameterData);

// Verification & Approval
router.route('/submissions/:id/verify')
  .put(authorize('admin', 'authority', 'hod', 'coordinator'), verifySubmission);

module.exports = router;
