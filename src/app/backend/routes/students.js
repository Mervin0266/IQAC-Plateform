const express = require('express');
const router = express.Router();
const {
  getStudents,
  getStudentStats,
  createStudent,
  bulkCreateStudent,
  updateStudent,
  deleteStudent,
  lookupStudentByRegNo,
  clearAllStudents
} = require('../controllers/studentController');
const { auth, authorize } = require('../middleware/auth');
const { requireModuleEnabled, validateFormSubmission } = require('../middleware/configEnforcement');

router.use(auth);

router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('student-details'), clearAllStudents);
router.get('/stats', getStudentStats);

router.route('/')
  .get(getStudents)
  .post(authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('student-details'), validateFormSubmission('student-details-form', true), createStudent);

router.route('/bulk')
  .post(authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('student-details'), bulkCreateStudent);

router.get('/lookup/:regNo', lookupStudentByRegNo);

router.route('/:id')
  .put(authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('student-details'), validateFormSubmission('student-details-form', false), updateStudent)
  .delete(authorize('admin', 'coordinator', 'hod'), requireModuleEnabled('student-details'), deleteStudent);

module.exports = router;
