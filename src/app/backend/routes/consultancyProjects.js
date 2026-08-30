const express = require('express');
const router = express.Router();
const {
  getConsultancyProjects,
  getConsultancyProject,
  createConsultancyProject,
  updateConsultancyProject,
  deleteConsultancyProject,
  getConsultancyStats,
  bulkCreateConsultancyProjects,
  clearAllConsultancyProjects
} = require('../controllers/consultancyProjectController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

router.get('/stats', getConsultancyStats);
router.post('/bulk', authorize('admin', 'coordinator', 'hod', 'faculty'), bulkCreateConsultancyProjects);
router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllConsultancyProjects);

router.route('/')
  .get(getConsultancyProjects)
  .post(authorize('admin', 'coordinator', 'faculty'), createConsultancyProject);

router.route('/:id')
  .get(getConsultancyProject)
  .put(authorize('admin', 'coordinator', 'hod', 'faculty'), updateConsultancyProject)
  .delete(authorize('admin', 'coordinator'), deleteConsultancyProject);

module.exports = router;
