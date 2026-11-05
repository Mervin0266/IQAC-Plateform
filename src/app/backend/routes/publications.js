const express = require('express');
const router = express.Router();
const {
  getPublications,
  getPublicationStats,
  getPublicationFacultyDirectory,
  getPublication,
  createPublication,
  updatePublication,
  deletePublication,
  bulkUploadPublications,
  clearAllPublications,
  validateAndPreviewCitations,
  confirmCitationsUpdate,
  getPublicationCitations,
  previewCitationCorrection,
  applyAuditedCitationCorrection
} = require('../controllers/publicationController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

router.get('/stats', getPublicationStats);
router.get('/faculty-directory', authorize('admin', 'coordinator', 'hod', 'faculty'), getPublicationFacultyDirectory);
router.post('/bulk', authorize('admin', 'coordinator', 'hod', 'faculty'), bulkUploadPublications);
router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllPublications);

// Citation Management V7.2 Routes
router.post('/citations/validate-and-preview', authorize('admin', 'coordinator', 'hod', 'faculty'), validateAndPreviewCitations);
router.post('/citations/confirm', authorize('admin', 'coordinator', 'hod', 'faculty'), confirmCitationsUpdate);
router.get('/:id/citations', getPublicationCitations);
router.post('/:id/citations/preview-correction', authorize('admin', 'coordinator', 'hod'), previewCitationCorrection);
router.post('/:id/citations/apply-correction', authorize('admin', 'coordinator', 'hod'), applyAuditedCitationCorrection);

router.route('/')
  .get(getPublications)
  .post(authorize('admin', 'coordinator', 'hod', 'faculty'), createPublication);

router.route('/:id')
  .get(getPublication)
  .put(authorize('admin', 'coordinator', 'hod', 'faculty'), updatePublication)
  .delete(authorize('admin', 'coordinator', 'hod', 'faculty'), deletePublication);

module.exports = router;
