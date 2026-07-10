const express = require('express');
const router = express.Router();
const {
  getPatents,
  getPatent,
  createPatent,
  updatePatent,
  deletePatent
} = require('../controllers/patentController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

router.route('/')
  .get(getPatents)
  .post(authorize('admin', 'coordinator', 'faculty'), createPatent);

router.route('/:id')
  .get(getPatent)
  .put(authorize('admin', 'coordinator', 'faculty'), updatePatent)
  .delete(authorize('admin', 'coordinator'), deletePatent);

module.exports = router;
