const express = require('express');
const router = express.Router();
const {
  getPublications,
  getPublicationStats,
  getPublication,
  createPublication,
  updatePublication,
  deletePublication,
  bulkUploadPublications,
  clearAllPublications
} = require('../controllers/publicationController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

router.get('/stats', getPublicationStats);
router.post('/bulk', authorize('admin', 'coordinator', 'hod', 'faculty'), bulkUploadPublications);
router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllPublications);

router.route('/')
  .get(getPublications)
  .post(authorize('admin', 'coordinator', 'hod', 'faculty'), createPublication);

router.route('/:id')
  .get(getPublication)
  .put(authorize('admin', 'coordinator', 'hod', 'faculty'), updatePublication)
  .delete(authorize('admin', 'coordinator', 'hod', 'faculty'), deletePublication);

module.exports = router;
