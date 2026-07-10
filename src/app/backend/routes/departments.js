const express = require('express');
const router = express.Router();
const {
  getDepartments,
  createDepartment,
  bulkCreateDepartment,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.route('/')
  .get(getDepartments)
  .post(authorize('admin', 'coordinator', 'hod'), createDepartment);

router.route('/bulk')
  .post(authorize('admin', 'coordinator', 'hod'), bulkCreateDepartment);

router.route('/:id')
  .put(authorize('admin', 'coordinator', 'hod'), updateDepartment)
  .delete(authorize('admin', 'coordinator', 'hod'), deleteDepartment);

module.exports = router;
