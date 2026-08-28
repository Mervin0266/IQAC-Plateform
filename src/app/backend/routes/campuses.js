const express = require('express');
const router = express.Router();
const {
  getCampuses,
  getCampus,
  getCampusSchools,
  createCampus,
  updateCampus,
  deleteCampus
} = require('../controllers/campusController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.route('/')
  .get(getCampuses)
  .post(authorize('admin'), createCampus);

router.route('/:id')
  .get(getCampus)
  .put(authorize('admin'), updateCampus)
  .delete(authorize('admin'), deleteCampus);

router.route('/:id/schools')
  .get(getCampusSchools);

module.exports = router;
