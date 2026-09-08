const express = require('express');
const router = express.Router();
const {
  getPatents,
  getPatentStats,
  getPatent,
  createPatent,
  updatePatent,
  deletePatent,
  bulkUploadPatents,
  clearAllPatents
} = require('../controllers/patentController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

router.get('/stats', getPatentStats);
router.post('/bulk', authorize('admin', 'coordinator', 'hod', 'faculty'), bulkUploadPatents);
router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllPatents);

router.route('/')
  .get(getPatents)
  .post(authorize('admin', 'coordinator', 'hod', 'faculty'), createPatent);

router.route('/:id')
  .get(getPatent)
  .put(authorize('admin', 'coordinator', 'hod', 'faculty'), updatePatent)
  .delete(authorize('admin', 'coordinator', 'hod', 'faculty'), deletePatent);

module.exports = router;
