const express = require('express');
const router = express.Router();
const {
  getFaculty,
  createFaculty,
  bulkCreateFaculty,
  updateFaculty,
  deleteFaculty
} = require('../controllers/facultyController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.route('/')
  .get(getFaculty)
  .post(authorize('admin', 'coordinator', 'hod'), createFaculty);

router.route('/bulk')
  .post(authorize('admin', 'coordinator', 'hod'), bulkCreateFaculty);

router.route('/:id')
  .put(authorize('admin', 'coordinator', 'hod'), updateFaculty)
  .delete(authorize('admin', 'coordinator', 'hod'), deleteFaculty);

module.exports = router;
