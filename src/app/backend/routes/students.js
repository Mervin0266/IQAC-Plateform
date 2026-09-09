const express = require('express');
const router = express.Router();
const {
  getStudents,
  createStudent,
  bulkCreateStudent,
  updateStudent,
  deleteStudent,
  lookupStudentByRegNo,
  clearAllStudents
} = require('../controllers/studentController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllStudents);

router.route('/')
  .get(getStudents)
  .post(authorize('admin', 'coordinator', 'hod'), createStudent);

router.route('/bulk')
  .post(authorize('admin', 'coordinator', 'hod'), bulkCreateStudent);

router.get('/lookup/:regNo', lookupStudentByRegNo);

router.route('/:id')
  .put(authorize('admin', 'coordinator', 'hod'), updateStudent)
  .delete(authorize('admin', 'coordinator', 'hod'), deleteStudent);

module.exports = router;
