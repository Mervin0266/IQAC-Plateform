const express = require('express');
const router = express.Router();
const {
  getSchools,
  getSchool,
  getSchoolDepartments,
  createSchool,
  updateSchool,
  deleteSchool
} = require('../controllers/schoolController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.route('/')
  .get(getSchools)
  .post(authorize('admin'), createSchool);

router.route('/:id')
  .get(getSchool)
  .put(authorize('admin'), updateSchool)
  .delete(authorize('admin'), deleteSchool);

router.route('/:id/departments')
  .get(getSchoolDepartments);

module.exports = router;
