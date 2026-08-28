const express = require('express');
const router = express.Router();
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/courseController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.route('/')
  .get(getCourses)
  .post(authorize('admin', 'coordinator', 'hod'), createCourse);

router.route('/:id')
  .get(getCourse)
  .put(authorize('admin', 'coordinator', 'hod'), updateCourse)
  .delete(authorize('admin', 'coordinator', 'hod'), deleteCourse);

module.exports = router;
