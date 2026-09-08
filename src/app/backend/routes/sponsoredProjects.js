const express = require('express');
const router = express.Router();
const {
  getSponsoredProjects,
  getSponsoredProjectStats,
  getSponsoredProject,
  createSponsoredProject,
  updateSponsoredProject,
  deleteSponsoredProject,
  bulkUploadSponsoredProjects,
  clearAllSponsoredProjects
} = require('../controllers/sponsoredProjectController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

router.get('/stats', getSponsoredProjectStats);
router.post('/bulk', authorize('admin', 'coordinator', 'hod', 'faculty'), bulkUploadSponsoredProjects);
router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllSponsoredProjects);

router.route('/')
  .get(getSponsoredProjects)
  .post(authorize('admin', 'coordinator', 'hod', 'faculty'), createSponsoredProject);

router.route('/:id')
  .get(getSponsoredProject)
  .put(authorize('admin', 'coordinator', 'hod', 'faculty'), updateSponsoredProject)
  .delete(authorize('admin', 'coordinator', 'hod', 'faculty'), deleteSponsoredProject);

module.exports = router;
